/**
 * cold-pool-health.ts — best-effort drift detection for cold-pool git repos.
 *
 * Boot runs `deck link` every session but nothing used to report that the
 * cold pool had fallen behind origin (2026-07-17 incident: one month of
 * silent drift). This module checks each unique git root for:
 *   - behind-origin commits (after a best-effort shallow fetch)
 *   - dirty working tree (hand-edited cache blocks `git pull --rebase`)
 *   - unexpected branch (clone left on a feature branch)
 *
 * Everything is best-effort and side-effect-light: probes return `undefined`
 * on failure (offline, no upstream) and callers must not fail when this
 * module throws. IO is injectable for tests (Intent/Plan/Execute pattern).
 */

import { execSync } from 'node:child_process'

export interface RepoHealth {
  gitRoot: string
  behind?: number        // undefined = probe failed (offline, no upstream) — never warn
  dirtyCount: number
  branch?: string
  defaultBranch?: string
}

export interface HealthIO {
  fetch?: (gitRoot: string) => void
  behindCount?: (gitRoot: string) => number | undefined
  dirtyCount?: (gitRoot: string) => number
  currentBranch?: (gitRoot: string) => string | undefined
  defaultBranch?: (gitRoot: string) => string | undefined
}

function git(gitRoot: string, args: string[], timeoutMs: number): string | undefined {
  try {
    return execSync(`git ${args.join(' ')}`, {
      cwd: gitRoot,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: timeoutMs,
    }).trim()
  } catch {
    return undefined
  }
}

export function productionHealthIO(): Required<HealthIO> {
  return {
    // Shallow fetch matches probeBehindCount precedent in refresh.ts.
    // Short timeout: link runs at every boot — offline must not stall it.
    fetch: (root) => { git(root, ['fetch', '--depth=1', 'origin'], 4000) },
    behindCount: (root) => {
      // Two-dot HEAD..@{upstream}: only commits reachable from upstream but
      // not HEAD — exactly "behind". Fails (undefined) when the branch has
      // no upstream — in which case we don't warn.
      const out = git(root, ['rev-list', '--count', 'HEAD..@{upstream}'], 3000)
      const n = out === undefined ? NaN : parseInt(out, 10)
      return Number.isNaN(n) ? undefined : n
    },
    dirtyCount: (root) => {
      const out = git(root, ['status', '--porcelain'], 5000)
      return out ? out.split('\n').filter(Boolean).length : 0
    },
    currentBranch: (root) => git(root, ['rev-parse', '--abbrev-ref', 'HEAD'], 3000),
    defaultBranch: (root) => {
      const ref = git(root, ['symbolic-ref', '--short', 'refs/remotes/origin/HEAD'], 3000)
      return ref?.startsWith('origin/') ? ref.slice('origin/'.length) : undefined
    },
  }
}

export function checkColdPoolHealth(gitRoots: string[], io?: HealthIO): RepoHealth[] {
  const prod = productionHealthIO()
  const fetch = io?.fetch ?? prod.fetch
  const behindCount = io?.behindCount ?? prod.behindCount
  const dirtyCount = io?.dirtyCount ?? prod.dirtyCount
  const currentBranch = io?.currentBranch ?? prod.currentBranch
  const defaultBranch = io?.defaultBranch ?? prod.defaultBranch

  return gitRoots.map((gitRoot) => {
    fetch(gitRoot) // best-effort; behind-count falls back to last-known upstream
    return {
      gitRoot,
      behind: behindCount(gitRoot),
      dirtyCount: dirtyCount(gitRoot),
      branch: currentBranch(gitRoot),
      defaultBranch: defaultBranch(gitRoot),
    }
  })
}

function repoName(gitRoot: string): string {
  return gitRoot.split('/').slice(-2).join('/')
}

export function formatHealthWarnings(health: RepoHealth[]): string[] {
  const warnings: string[] = []
  for (const h of health) {
    const repo = repoName(h.gitRoot)
    if (h.behind !== undefined && h.behind > 0) {
      warnings.push(`⚠️  cold pool drift: ${repo} is ${h.behind} commit(s) behind origin — run: deck refresh --exec && deck link`)
    }
    if (h.dirtyCount > 0) {
      warnings.push(`⚠️  cold pool dirty: ${repo} has ${h.dirtyCount} uncommitted change(s) — a hand-edited cache blocks pulls. Fix: git -C "${h.gitRoot}" checkout -- . && git clean -fd, then deck refresh --exec`)
    }
    if (h.branch && h.defaultBranch && h.branch !== h.defaultBranch) {
      warnings.push(`⚠️  cold pool branch: ${repo} is on '${h.branch}' (expected '${h.defaultBranch}')`)
    }
  }
  return warnings
}
