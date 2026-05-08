#!/usr/bin/env bun
/**
 * deck reconcile — k8s-style desired vs actual convergence.
 *
 * Per ADR-20260507021957847: reads skill-deck.lock (desired state),
 * compares against cold pool filesystem (actual state), reports diff.
 * By default plan-first (report only); --apply executes convergence.
 */

import { existsSync, readFileSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { findDeckToml, expandHome } from './link.js'
import { parse as parseToml } from '@iarna/toml'
import { ColdPool, buildReconcilePlan, type ReconcileDesiredState, getRepoHeadRef } from '@lythos/cold-pool'
import { SkillDeckLockSchema } from './schema.js'
import { addSkill } from './add.js'
import { refreshDeck } from './refresh.js'
import { pruneDeck } from './prune.js'

function isTTY(): boolean {
  return process.stdin.isTTY && process.stdout.isTTY
}

async function promptYesNo(question: string): Promise<boolean> {
  if (!isTTY()) return false
  const { createInterface } = await import('node:readline')
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(`${question} [y/N] `, (answer) => {
      rl.close()
      resolve(answer.trim().toLowerCase() === 'y')
    })
  })
}

export async function reconcileDeck(
  cliDeckPath?: string,
  cliWorkdir?: string,
  apply?: boolean,
  yes?: boolean,
): Promise<void> {
  const cliDeck = cliDeckPath || process.argv.find((_, i, a) => a[i - 1] === '--deck')
  const DECK_PATH = cliDeck
    ? resolve(cliDeck)
    : findDeckToml(process.cwd()) || resolve('skill-deck.toml')

  if (!existsSync(DECK_PATH)) {
    console.error(`❌ skill-deck.toml not found`)
    process.exit(1)
  }

  const PROJECT_DIR = cliWorkdir ? resolve(cliWorkdir) : process.cwd()
  const LOCK_PATH = resolve(PROJECT_DIR, 'skill-deck.lock')

  if (!existsSync(LOCK_PATH)) {
    console.error(`❌ No lock file found. Run 'deck link' first.`)
    process.exit(1)
  }

  // Read lock
  let lock: any
  try {
    lock = JSON.parse(readFileSync(LOCK_PATH, 'utf-8'))
  } catch {
    console.error(`❌ Failed to parse lock file: ${LOCK_PATH}`)
    process.exit(1)
  }

  const parsed = SkillDeckLockSchema.safeParse(lock)
  if (!parsed.success) {
    console.error(`❌ Lock file schema mismatch. Run 'deck link' to regenerate.`)
    process.exit(1)
  }

  const lockData = parsed.data
  const coldPoolRaw = lockData.cold_pool || '~/.agents/skill-repos'
  const COLD_POOL = expandHome(coldPoolRaw, PROJECT_DIR)

  // Build alias → skill info map for locating missing skills
  const skillByAlias = new Map<string, { source: string; type: string; mode: string }>()
  for (const s of lockData.skills) {
    skillByAlias.set(s.alias, { source: s.source, type: s.type, mode: s.mode })
  }

  // Build desired state from lock
  const desired: ReconcileDesiredState = {
    deckPath: DECK_PATH,
    skills: lockData.skills.map((s) => ({
      locator: s.source,
      alias: s.alias,
    })),
  }

  // Run reconcile plan
  const pool = new ColdPool(COLD_POOL)
  const plan = buildReconcilePlan(pool, desired)

  // Report
  console.log(`\n📊 Reconcile Report`)
  console.log(`   Deck: ${lockData.deck_source.path}`)
  console.log(`   Skills declared: ${lockData.skills.length}`)
  console.log(`   Cold pool: ${COLD_POOL}`)

  if (plan.missing.length === 0 && plan.behind.length === 0 && plan.extra.length === 0) {
    console.log(`\n✅ No drift detected — cold pool matches desired state.`)
    pool.metadata.close()
    return
  }

  console.log(`\n🔍 Drift detected:`)
  console.log(`   ❌ Missing: ${plan.missing.length}`)
  console.log(`   ⚠️  Behind:  ${plan.behind.length}`)
  console.log(`   📦 Extra:   ${plan.extra.length}`)

  for (const entry of plan.missing) {
    console.log(`\n   ❌ Missing: ${entry.host}/${entry.owner}/${entry.repo}`)
    console.log(`      Reason: ${entry.reason}`)
    console.log(`      Skills: ${entry.aliases.join(', ')}`)
  }

  for (const entry of plan.behind) {
    console.log(`\n   ⚠️  Behind: ${entry.host}/${entry.owner}/${entry.repo}`)
    console.log(`      ${entry.reason}`)
    console.log(`      Skills: ${entry.aliases.join(', ')}`)
  }

  for (const entry of plan.extra) {
    console.log(`\n   📦 Extra: ${entry.host}/${entry.owner}/${entry.repo}`)
    console.log(`      Reason: ${entry.reason}`)
  }

  if (!apply) {
    console.log(`\n💡 Plan-first. Use --apply to converge, or handle individually:`)
    console.log(`   deck add <locator>   → restore missing`)
    console.log(`   deck refresh         → update behind`)
    console.log(`   cold-pool prune      → GC extras`)
    pool.metadata.close()
    return
  }

  // ── Apply convergence ────────────────────────────────────────────────

  // Confirmation
  if (!yes) {
    const confirmed = await promptYesNo('\nApply these changes?')
    if (!confirmed) {
      console.log('❌ Aborted. No changes made.')
      pool.metadata.close()
      return
    }
  }

  console.log(`\n🏗️  Applying convergence...`)

  const failures: string[] = []

  // 1. Missing → deck add
  for (const entry of plan.missing) {
    for (const alias of entry.aliases) {
      const info = skillByAlias.get(alias)
      if (!info) {
        failures.push(`Missing skill info for alias: ${alias}`)
        continue
      }
      try {
        console.log(`   ➕ Adding ${alias}...`)
        await addSkill(info.source, {
          deck: DECK_PATH,
          workdir: PROJECT_DIR,
          alias,
          type: info.type,
          mode: info.mode as 'symlink' | 'snapshot',
        })
        console.log(`   ✅ Added ${alias}`)
      } catch (e: any) {
        failures.push(`Add ${alias}: ${e.message}`)
        console.error(`   ❌ Failed to add ${alias}: ${e.message}`)
      }
    }
  }

  // 2. Behind → check actual HEAD vs recorded, then refresh if different
  for (const entry of plan.behind) {
    try {
      const recordedRef = pool.metadata.getRepoRef(entry.host, entry.owner, entry.repo)
      if (!recordedRef) {
        console.log(`   ⏭️  Skipping ${entry.host}/${entry.owner}/${entry.repo} — no recorded HEAD`)
        continue
      }
      const currentRef = await getRepoHeadRef(entry.repoPath)
      if (currentRef === recordedRef) {
        console.log(`   ✅ ${entry.host}/${entry.owner}/${entry.repo} is up to date (${currentRef.slice(0, 8)})`)
        continue
      }
      console.log(`   🔄 Refreshing ${entry.host}/${entry.owner}/${entry.repo} (${recordedRef.slice(0, 8)} → ${currentRef.slice(0, 8)})...`)
      // Refresh all aliases for this repo
      for (const alias of entry.aliases) {
        try {
          refreshDeck(DECK_PATH, PROJECT_DIR, alias)
          console.log(`   ✅ Refreshed ${alias}`)
        } catch (e: any) {
          failures.push(`Refresh ${alias}: ${e.message}`)
          console.error(`   ❌ Failed to refresh ${alias}: ${e.message}`)
        }
      }
    } catch (e: any) {
      failures.push(`Behind ${entry.host}/${entry.owner}/${entry.repo}: ${e.message}`)
      console.error(`   ❌ Failed to check/refresh ${entry.host}/${entry.owner}/${entry.repo}: ${e.message}`)
    }
  }

  // 3. Extra → prune (global, only once)
  if (plan.extra.length > 0) {
    try {
      console.log(`   🗑️  Pruning extras...`)
      await pruneDeck(DECK_PATH, PROJECT_DIR, true)
      console.log(`   ✅ Prune complete`)
    } catch (e: any) {
      failures.push(`Prune: ${e.message}`)
      console.error(`   ❌ Prune failed: ${e.message}`)
    }
  }

  // Summary
  console.log(`\n📋 Convergence summary:`)
  console.log(`   Missing resolved: ${plan.missing.length}`)
  console.log(`   Behind resolved:  ${plan.behind.length}`)
  console.log(`   Extra resolved:   ${plan.extra.length}`)
  if (failures.length > 0) {
    console.log(`   ❌ Failures: ${failures.length}`)
    for (const f of failures) {
      console.log(`      - ${f}`)
    }
  } else {
    console.log(`   ✅ All operations successful`)
  }

  pool.metadata.close()
}
