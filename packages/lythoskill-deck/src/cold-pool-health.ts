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
 * Design decisions (TASK-20260719015727610):
 *  - The probe fetch is `git fetch --depth=1 origin` — same as gitClone's
 *    default (git-io.ts clones with `--depth 1`) and probeBehindCount in
 *    refresh.ts. Consequence: counts are a LOWER BOUND ("≥N" — on shallow
 *    clones history is truncated), and a full clone gains `.git/shallow`.
 *    Accepted: cold-pool repos are created shallow by default, so the side
 *    effect only touches rare full clones, and the probe's job is a drift
 *    SIGNAL (nonzero = run `refresh --exec` for the truth), not an audit.
 *  - Probes run in PARALLEL across roots (async) — link runs at every boot;
 *    offline worst case is one fetch timeout, not N sequential timeouts.
 *  - `skipFetch` exists for the nested `refresh --exec → linkDeck` path:
 *    the pull just fetched, so re-fetching is pure cost.
 *  - Everything is best-effort: probes return `undefined` on failure
 *    (offline, no upstream) and callers must not fail when this throws.
 *  - IO is injectable for tests (Intent/Plan/Execute pattern).
 */

import { execFile, type ExecFileOptions } from 'node:child_process'
import { promisify } from 'node:util'

const execFileP = promisify(execFile)

export interface RepoHealth {
  gitRoot: string
  behind?: number        // undefined = probe failed (offline, no upstream) — never warn
  dirtyCount: number
  branch?: string
  defaultBranch?: string
}

export interface HealthIO {
  fetch?: (gitRoot: string) => Promise<void>
  behindCount?: (gitRoot: string) => Promise<number | undefined>
  dirtyCount?: (gitRoot: string) => Promise<number>
  currentBranch?: (gitRoot: string) => Promise<string | undefined>
  defaultBranch?: (gitRoot: string) => Promise<string | undefined>
}

async function git(gitRoot: string, args: string[], timeoutMs: number): Promise<string | undefined> {
  try {
    // promisify(execFile)'s overloads don't expose `timeout` in the options
    // type under bun-types — the option itself is real and honored.
    const opts: ExecFileOptions = { cwd: gitRoot, encoding: 'utf-8', timeout: timeoutMs }
    const { stdout } = await execFileP('git', args, opts)
    return (stdout as unknown as string).trim()
  } catch {
    return undefined
  }
}

export function productionHealthIO(): Required<HealthIO> {
  return {
    // Shallow fetch — see design note at top. Short timeout: link runs at
    // every boot; offline must not stall it beyond one timeout per batch.
    fetch: async (root) => { await git(root, ['fetch', '--depth=1', 'origin'], 4000) },
    behindCount: async (root) => {
      // Two-dot HEAD..@{upstream}: only commits reachable from upstream but
      // not HEAD — exactly "behind". Fails (undefined) when the branch has
      // no upstream — in which case we don't warn.
      const out = await git(root, ['rev-list', '--count', 'HEAD..@{upstream}'], 3000)
      const n = out === undefined ? NaN : parseInt(out, 10)
      return Number.isNaN(n) ? undefined : n
    },
    dirtyCount: async (root) => {
      const out = await git(root, ['status', '--porcelain'], 5000)
      return out ? out.split('\n').filter(Boolean).length : 0
    },
    currentBranch: async (root) => git(root, ['rev-parse', '--abbrev-ref', 'HEAD'], 3000),
    defaultBranch: async (root) => {
      const ref = await git(root, ['symbolic-ref', '--short', 'refs/remotes/origin/HEAD'], 3000)
      return ref?.startsWith('origin/') ? ref.slice('origin/'.length) : undefined
    },
  }
}

export async function checkColdPoolHealth(
  gitRoots: string[],
  opts?: { io?: HealthIO; skipFetch?: boolean },
): Promise<RepoHealth[]> {
  const prod = productionHealthIO()
  const io = {
    fetch: opts?.io?.fetch ?? prod.fetch,
    behindCount: opts?.io?.behindCount ?? prod.behindCount,
    dirtyCount: opts?.io?.dirtyCount ?? prod.dirtyCount,
    currentBranch: opts?.io?.currentBranch ?? prod.currentBranch,
    defaultBranch: opts?.io?.defaultBranch ?? prod.defaultBranch,
  }

  return Promise.all(gitRoots.map(async (gitRoot) => {
    if (!opts?.skipFetch) await io.fetch(gitRoot) // best-effort; behind falls back to last-known upstream
    const [behind, dirtyCount, branch, defaultBranch] = await Promise.all([
      io.behindCount(gitRoot),
      io.dirtyCount(gitRoot),
      io.currentBranch(gitRoot),
      io.defaultBranch(gitRoot),
    ])
    return { gitRoot, behind, dirtyCount, branch, defaultBranch }
  }))
}

function repoName(gitRoot: string): string {
  return gitRoot.split('/').slice(-2).join('/')
}

export function formatHealthWarnings(health: RepoHealth[]): string[] {
  const warnings: string[] = []
  for (const h of health) {
    const repo = repoName(h.gitRoot)
    if (h.behind !== undefined && h.behind > 0) {
      // "≥N": shallow clones truncate history, so the count is a lower bound
      warnings.push(`⚠️  cold pool drift: ${repo} is ≥${h.behind} commit(s) behind origin — run: deck refresh --exec && deck link`)
    }
    if (h.dirtyCount > 0) {
      warnings.push(`⚠️  cold pool dirty: ${repo} has ${h.dirtyCount} uncommitted change(s) — a hand-edited cache blocks pulls. Fix: git -C "${h.gitRoot}" reset --hard HEAD && git -C "${h.gitRoot}" clean -fd, then deck refresh --exec`)
    }
    if (h.branch && h.defaultBranch && h.branch !== h.defaultBranch) {
      warnings.push(`⚠️  cold pool branch: ${repo} is on '${h.branch}' (expected '${h.defaultBranch}')`)
    }
  }
  return warnings
}
