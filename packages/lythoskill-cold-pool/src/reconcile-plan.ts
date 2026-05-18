/**
 * Reconcile plan: k8s-style desired vs actual convergence.
 *
 * Per ADR-20260507021957847 and EPIC-20260507191713917.
 * Plan builders are pure (read-only, no mutation). Executors inject IO.
 */

import { existsSync } from 'node:fs'
import { basename, join, relative } from 'node:path'
import type { ColdPool } from './cold-pool.js'
import { parseLocator } from './parse-locator.js'

// ── Types ──────────────────────────────────────────────────────────────────

export interface DesiredSkill {
  locator: string
  alias: string
}

export interface ReconcileDesiredState {
  deckPath: string
  skills: DesiredSkill[]
}

export interface ReconcileEntry {
  host: string
  owner: string
  repo: string
  repoPath: string
  reason: string
  /** The affected skill aliases, if any. */
  aliases: string[]
}

export interface ReconcilePlan {
  /** Skills whose repo dir doesn't exist in the cold pool. */
  missing: ReconcileEntry[]
  /** Skills whose repo was previously fetched (metadata record exists) but HEAD hasn't been verified against upstream. The async executor must git-fetch to determine if they're actually behind. */
  behind: ReconcileEntry[]
  /** Repos in the cold pool not referenced by any skill in the desired state. */
  extra: ReconcileEntry[]
}

// ── Helpers ────────────────────────────────────────────────────────────────

interface RepoKey {
  host: string
  owner: string
  repo: string
}

function repoKey(host: string, owner: string, repo: string): string {
  return `${host}/${owner}/${repo}`
}

/**
 * Extract (host, owner, repo) from a source path relative to cold-pool root.
 * Uses parseLocator — the source path is an FQ locator whose first 3 segments
 * give the canonical repo directory.
 */
function extractRepo(source: string): RepoKey | null {
  const loc = parseLocator(source)
  if (!loc) return null
  return { host: loc.host, owner: loc.owner, repo: loc.repo }
}

// ── Plan builder ───────────────────────────────────────────────────────────

/** Plan builder — IO via ColdPool parameter (list, has, metadata). Execute: executeReconcilePlan(plan, io?) in same file. Mock ColdPool for plan-mode tests. */
export function buildReconcilePlan(
  coldPool: ColdPool,
  desired: ReconcileDesiredState,
): ReconcilePlan {
  // 1. Index desired skills by repo
  const desiredRepos = new Map<string, { key: RepoKey; aliases: string[] }>()
  const unrecognized: ReconcileEntry[] = []

  for (const skill of desired.skills) {
    const repo = extractRepo(skill.locator)
    if (!repo) {
      unrecognized.push({
        host: '', owner: '', repo: skill.locator, repoPath: '',
        reason: `Unrecognized locator format: "${skill.locator}"`,
        aliases: [skill.alias],
      })
      continue
    }
    const k = repoKey(repo.host, repo.owner, repo.repo)
    const existing = desiredRepos.get(k)
    if (existing) {
      existing.aliases.push(skill.alias)
    } else {
      desiredRepos.set(k, { key: repo, aliases: [skill.alias] })
    }
  }

  // 2. Enumerate cold pool actual state
  const coldPoolDirs = coldPool.list() // absolute paths
  const coldPoolRepos = new Map<string, string>() // repoKey → absolute path
  for (const dir of coldPoolDirs) {
    const rel = relative(coldPool.path, dir)
    const parts = rel.split('/')
    if (parts.length >= 3) {
      const k = repoKey(parts[0], parts[1], parts[2])
      coldPoolRepos.set(k, dir)
    }
  }

  // 3. Compare: missing + behind
  const missing: ReconcileEntry[] = [...unrecognized]
  const behind: ReconcileEntry[] = []

  for (const [k, { key, aliases }] of desiredRepos) {
    const dir = coldPoolRepos.get(k)
    if (!dir || !existsSync(dir)) {
      missing.push({
        host: key.host, owner: key.owner, repo: key.repo,
        repoPath: coldPool.resolveDir({ raw: '', host: key.host, owner: key.owner, repo: key.repo, skill: null, isLocalhost: key.host === 'localhost' }),
        reason: 'Repo directory not found in cold pool',
        aliases,
      })
      continue
    }

    // Check metadata DB for recorded HEAD ref
    const recordedRef = coldPool.metadata.getRepoRef(key.host, key.owner, key.repo)
    if (recordedRef) {
      // Metadata has a record — repo was previously fetched via deck add.
      // We can't check current HEAD here because that requires async git ops.
      // Mark as "needs verification" — the async executor will check.
      behind.push({
        host: key.host, owner: key.owner, repo: key.repo,
        repoPath: dir,
        reason: `Recorded HEAD: ${recordedRef.slice(0, 8)} — verify against current`,
        aliases,
      })
    }
    // If no metadata record, the repo exists but wasn't recorded via deck add.
    // This is fine (e.g. manually cloned). Don't flag.
  }

  // 4. Compare: extra (in cold pool but not referenced by desired state)
  const extra: ReconcileEntry[] = []
  for (const [k, dir] of coldPoolRepos) {
    if (!desiredRepos.has(k)) {
      const parts = k.split('/')
      extra.push({
        host: parts[0], owner: parts[1], repo: parts[2],
        repoPath: dir,
        reason: 'Not referenced by any skill in the desired state',
        aliases: [],
      })
    }
  }

  return { missing, behind, extra }
}

// ── Execution (IO layer, injectable for testing) ───────────────────────────

export interface ReconcileResult {
  host: string
  owner: string
  repo: string
  status: 'restored' | 'updated' | 'skipped' | 'failed' | 'extra-reported'
  message: string
}

export interface ReconcileIO {
  gitClone?: (url: string, dir: string, opts?: { depth?: number }) => void
  log?: (msg: string) => void
}

export function executeReconcilePlan(
  plan: ReconcilePlan,
  _io?: ReconcileIO,
): ReconcileResult[] {
  const log = _io?.log ?? (() => {})
  const results: ReconcileResult[] = []

  // Report phase — plan-first: show what would happen
  log('\n🔍 Reconcile Plan')
  log(`   Missing: ${plan.missing.length} | Behind: ${plan.behind.length} | Extra: ${plan.extra.length}`)

  for (const entry of plan.missing) {
    const repo = `${entry.host}/${entry.owner}/${entry.repo}`
    log(`   ❌ Missing: ${repo} — ${entry.reason}`)
    log(`      Affected: ${entry.aliases.join(', ')}`)
    results.push({
      host: entry.host, owner: entry.owner, repo: entry.repo,
      status: 'failed',
      message: `Missing: ${entry.reason}`,
    })
  }

  for (const entry of plan.behind) {
    const repo = `${entry.host}/${entry.owner}/${entry.repo}`
    log(`   ⚠️  Behind: ${repo}`)
    log(`      ${entry.reason}`)
    results.push({
      host: entry.host, owner: entry.owner, repo: entry.repo,
      status: 'skipped',
      message: entry.reason,
    })
  }

  for (const entry of plan.extra) {
    const repo = `${entry.host}/${entry.owner}/${entry.repo}`
    log(`   📦 Extra: ${repo} — ${entry.reason}`)
    results.push({
      host: entry.host, owner: entry.owner, repo: entry.repo,
      status: 'extra-reported',
      message: entry.reason,
    })
  }

  return results
}
