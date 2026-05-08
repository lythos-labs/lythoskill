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
import { ColdPool, buildReconcilePlan, type ReconcileDesiredState } from '@lythos/cold-pool'
import { SkillDeckLockSchema } from './schema.js'

export function reconcileDeck(cliDeckPath?: string, cliWorkdir?: string, apply?: boolean): void {
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

  // Build desired state from lock
  const desired: ReconcileDesiredState = {
    deckPath: DECK_PATH,
    skills: lockData.skills.map(s => ({
      locator: s.source, // source is relative to cold pool, in FQ format
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

  if (apply) {
    console.log(`\n🏗️  --apply: convergence not yet implemented.`)
    console.log(`   For missing: use 'deck add <locator>'`)
    console.log(`   For behind: use 'deck refresh'`)
    console.log(`   For extra: use 'cold-pool prune'`)
  } else {
    console.log(`\n💡 Plan-first. Use --apply to converge, or handle individually:`)
    console.log(`   deck add <locator>   → restore missing`)
    console.log(`   deck refresh         → update behind`)
    console.log(`   cold-pool prune      → GC extras`)
  }

  pool.metadata.close()
}
