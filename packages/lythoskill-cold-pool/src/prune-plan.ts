/**
 * Prune plan — scan cold pool for repos with no active deck references.
 *
 * Uses the metadata DB's deck_refs FSM to determine whether a repo is
 * actively referenced by any deck. A repo is prunable only if ALL its
 * refs across ALL decks have state='removed' (or it has no refs at all).
 *
 * Unlike the previous deck-level prune implementation (which only checked
 * ONE deck.toml), this version queries the cross-deck reference index,
 * preventing accidental deletion of repos still needed by other decks.
 *
 * Scanning approach: instead of ColdPool.list() (which uses buildListPlan
 * with strict canonical depth classification), this scans the cold pool
 * filesystem directly at host/owner/repo depth, matching how deck add
 * resolves locators. This correctly handles repos with arbitrary internal
 * structure (subdirs, non-terminal repos, etc.).
 */

import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { ColdPool, DEFAULT_COLD_POOL_PATH } from './cold-pool.js'

// ── Types ──────────────────────────────────────────────────────────────────

export interface PruneCandidate {
  repoPath: string
  /** Path relative to cold pool root, e.g. "github.com/owner/repo" */
  repoRel: string
  size: number
}

export interface PrunePlan {
  coldPoolPath: string
  candidates: PruneCandidate[]
  totalSize: number
}

export interface PruneResult {
  repoRel: string
  deleted: boolean
  error?: string
}

export interface PruneIO {
  delete?: (path: string) => void
  log?: (msg: string) => void
  formatSize?: (bytes: number) => string
}

// ── Helpers ────────────────────────────────────────────────────────────────

function calculateDirSize(dir: string): number {
  let total = 0
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name)
      if (entry.isSymbolicLink()) continue
      if (entry.isDirectory()) {
        total += calculateDirSize(p)
      } else if (entry.isFile()) {
        total += statSync(p).size
      }
    }
  } catch (e: any) {
    if (e.code !== 'ENOENT') console.warn(`calculateDirSize: failed for ${dir}: ${e.message}`)
  }
  return total
}

function defaultFormatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

// ── Plan Builder ──────────────────────────────────────────────────────────

/**
 * Build a prune plan by comparing cold pool contents against the metadata DB.
 *
 * 1. Scans cold pool for all repo directories (SKILL.md-driven, like add/link).
 * 2. Queries metadata DB for all active locators (state = added/linked/NULL).
 * 3. A repo is prunable if no active locator references it.
 */
/** Plan builder — IO via ColdPool (findSkillDirectories, metadata queries). Execute: executePrunePlan(plan, io?) in same file. Mock ColdPool for plan-mode tests. */
export function buildPrunePlan(coldPoolPath: string): PrunePlan {
  const pool = new ColdPool(coldPoolPath)
  const allRepos = pool.findSkillDirectories()
  const activeLocators = pool.metadata.getAllActiveLocators()
  pool.metadata.close()

  const candidates: PruneCandidate[] = []
  for (const repoPath of allRepos) {
    const repoRel = repoPath.slice(coldPoolPath.length + 1)
    // A repo matches if any active locator starts with its relative path
    // (accounting for sub-skill locators like "host/owner/repo/subskill")
    const isReferenced = activeLocators.some(
      (loc) => loc === repoRel || loc.startsWith(repoRel + '/'),
    )
    if (!isReferenced) {
      candidates.push({ repoPath, repoRel, size: calculateDirSize(repoPath) })
    }
  }

  return {
    coldPoolPath,
    candidates,
    totalSize: candidates.reduce((sum, c) => sum + c.size, 0),
  }
}

// ── Execution (IO-injected) ───────────────────────────────────────────────

/**
 * Execute a prune plan. IO is injected for testability.
 */
export function executePrunePlan(plan: PrunePlan, io?: PruneIO): PruneResult[] {
  const del = io?.delete ?? ((_p: string) => { throw new Error('delete not injected') })
  const log = io?.log ?? (() => {})
  const fmt = io?.formatSize ?? defaultFormatSize

  log(`\n🧹 Prune candidates — ${plan.candidates.length} repo(s), ${fmt(plan.totalSize)} total:\n`)
  for (const c of plan.candidates) {
    log(`   ${c.repoRel} (${fmt(c.size)})`)
  }

  const results: PruneResult[] = []
  let deleted = 0
  let failed = 0

  for (const c of plan.candidates) {
    try {
      del(c.repoPath)
      log(`  🗑️  Deleted: ${c.repoRel}`)
      results.push({ repoRel: c.repoRel, deleted: true })
      deleted++
    } catch (err: any) {
      log(`  ❌ Failed to delete ${c.repoRel}: ${err.message}`)
      results.push({ repoRel: c.repoRel, deleted: false, error: err.message })
      failed++
    }
  }

  log(`\n📦 Prune complete: ${deleted} deleted, ${failed} failed`)
  return results
}
