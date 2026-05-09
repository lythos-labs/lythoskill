#!/usr/bin/env bun
/**
 * @lythos/cold-pool CLI — cold pool management commands.
 *
 * Commands:
 *   prune       Scan cold pool for unreferenced repos (uses metadata DB FSM)
 *   validate     Compare a lock file's desired state against cold pool
 */

import { existsSync, readFileSync, rmSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { ColdPool, DEFAULT_COLD_POOL_PATH } from './cold-pool.js'
import { buildPrunePlan, executePrunePlan } from './prune-plan.js'
import { parseLocator } from './parse-locator.js'

const CMD = 'cold-pool'

function help(): void {
  console.log(`@lythos/cold-pool — Cold pool management CLI

Usage: bunx @lythos/cold-pool <command> [options]

Commands:
  prune [--yes] [--dry-run]
    Scan cold pool for repos with no active deck references and
    offer to delete them. Uses metadata DB deck_refs FSM for
    cross-deck reference counting (only prunes if ALL refs are removed).

    --yes       Skip confirmation
    --dry-run   Report only, no deletion

  validate [--lock <path>]
    Read a skill-deck.lock file and compare its desired state against
    the cold pool. Plan-only (report drift). Use individual deck
    commands to converge.

    --lock <path>  Path to skill-deck.lock (default: ./skill-deck.lock)

  help     Show this help
`)
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const command = args[0]

  if (!command || command === 'help' || command === '--help') {
    help()
    process.exit(0)
  }

  // Resolve cold pool path (env var > default)
  const coldPoolPath = process.env.LYTHOS_COLD_POOL ?? DEFAULT_COLD_POOL_PATH

  switch (command) {
    // ── prune ─────────────────────────────────────────────────
    case 'prune': {
      const yes = args.includes('--yes')
      const dryRun = args.includes('--dry-run')

      if (!existsSync(coldPoolPath)) {
        console.log('📭 Cold pool does not exist. Nothing to prune.')
        process.exit(0)
      }

      const plan = buildPrunePlan(coldPoolPath)

      if (plan.candidates.length === 0) {
        console.log('✅ All cold pool repositories are referenced. Nothing to prune.')
        process.exit(0)
      }

      if (dryRun) {
        executePrunePlan(plan, { log: console.log })
        process.exit(0)
      }

      // Interactive confirmation
      if (!yes) {
        const { createInterface } = await import('node:readline')
        const rl = createInterface({ input: process.stdin, output: process.stdout })
        const answer = await new Promise<string>((resolve) => {
          rl.question(`\nDelete ${plan.candidates.length} unreferenced repo(s)? [y/N] `, resolve)
        })
        rl.close()
        if (answer.trim().toLowerCase() !== 'y') {
          console.log('❎ Prune cancelled.')
          process.exit(0)
        }

        const results = executePrunePlan(plan, {
          delete: (p: string) => rmSync(p, { recursive: true, force: true }),
          log: console.log,
        })

        if (results.some((r) => !r.deleted)) process.exit(1)
        break
      }

      // Non-interactive (--yes)
      const results = executePrunePlan(plan, {
        delete: (p: string) => rmSync(p, { recursive: true, force: true }),
        log: console.log,
      })

      if (results.some((r) => !r.deleted)) process.exit(1)
      break
    }

    // ── validate (plan-only, no --apply) ────────────────────────
    case 'validate': {
      const lockIdx = args.indexOf('--lock')
      const lockPath = lockIdx >= 0 ? args[lockIdx + 1] : undefined

      if (!lockPath) {
        console.error('❌ Missing --lock <path>. Usage: cold-pool validate --lock ./skill-deck.lock')
        process.exit(1)
      }

      if (!existsSync(lockPath)) {
        console.error(`❌ Lock file not found: ${lockPath}`)
        process.exit(1)
      }

      let lock: any
      try {
        lock = JSON.parse(readFileSync(lockPath, 'utf-8'))
      } catch (e: any) {
        console.error(`❌ Failed to parse lock file: ${e.message}`)
        process.exit(1)
      }

      if (!lock.skills || !Array.isArray(lock.skills)) {
        console.error('❌ Lock file has no "skills" array. Run deck link first.')
        process.exit(1)
      }

      if (!existsSync(coldPoolPath)) {
        console.log('📭 Cold pool does not exist. Nothing to validate.')
        process.exit(0)
      }

      const pool = new ColdPool(coldPoolPath)
      const desired: ReconcileDesiredState = {
        deckPath: lockPath,
        skills: lock.skills.map((s: any) => ({ locator: s.source, alias: s.alias })),
      }

      const missing: string[] = []
      const behind: string[] = []
      const extra: string[] = []

      // Reconcile: check each declared skill
      for (const skill of lock.skills) {
        const parsed = parseLocator(skill.source)
        if (!parsed) continue
        if (!pool.has(parsed)) {
          missing.push(`${skill.alias} (${skill.source})`)
        }
      }

      // Scan cold pool for extras: repos not referenced by this lock
      const allRepos = pool.list()
      const declaredSources = new Set(lock.skills.map((s: any) => s.source))
      for (const repoPath of allRepos) {
        const repoRel = repoPath.slice(coldPoolPath.length + 1)
        const isReferenced = [...declaredSources].some(
          (src) => src === repoRel || src.startsWith(repoRel + '/'),
        )
        if (!isReferenced) {
          extra.push(repoRel)
        }
      }

      pool.metadata.close()

      // Report
      console.log(`\n📊 Validate Report`)
      console.log(`   Cold pool: ${coldPoolPath}`)
      console.log(`   Skills declared: ${lock.skills.length}`)

      if (missing.length === 0 && behind.length === 0 && extra.length === 0) {
        console.log(`\n✅ No drift detected — cold pool matches desired state.`)
        process.exit(0)
      }

      console.log(`\n🔍 Drift detected:`)
      console.log(`   ❌ Missing: ${missing.length}`)
      console.log(`   ⚠️  Behind:  ${behind.length}`)
      console.log(`   📦 Extra:   ${extra.length}`)

      if (missing.length > 0) {
        console.log(`\n   ❌ Missing repos (declared but not in cold pool):`)
        for (const m of missing) console.log(`      ${m}`)
      }
      if (extra.length > 0) {
        console.log(`\n   📦 Extra repos (in cold pool but not declared):`)
        for (const e of extra) console.log(`      ${e}`)
      }

      console.log(`\n💡 Use 'deck add <locator>' to restore missing, or 'cold-pool prune' to remove extras.`)
      break
    }

    default:
      console.error(`❌ Unknown command: ${command}`)
      help()
      process.exit(1)
  }
}

main().catch((e: Error) => {
  console.error(`❌ ${e.message}`)
  process.exit(1)
})
