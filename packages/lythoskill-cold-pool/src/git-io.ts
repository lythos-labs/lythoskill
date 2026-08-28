/**
 * Git IO primitives — the only place in the lythoskill ecosystem that
 * runs `git clone` / `git pull` directly. Consumers (deck/curator/arena)
 * must go through these (or through `executeFetchPlan` which uses them).
 *
 * Per ADR-20260507021957847: cold-pool is the dedicated holder of git
 * side-effects. Direct `execFileSync('git', ...)` calls in other
 * packages are an anti-pattern (controller bypassing service to DAO).
 */
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

/** Injectable exec for testing. Matches node:child_process execFileSync signature. */
export type GitExec = typeof execFileSync

/** Read LYTHOS_SOCKS_PROXY env var and return git-config args if present. */
export function socksProxyArgs(): string[] {
  const proxy = process.env.LYTHOS_SOCKS_PROXY?.trim()
  if (!proxy) return []
  const url = proxy.startsWith('socks5://') ? proxy : `socks5://${proxy}`
  return ['-c', `http.proxy=${url}`, '-c', `https.proxy=${url}`]
}

export interface GitCloneOptions {
  /** Default 1 (shallow). Set to 0 to disable depth (full history). */
  depth?: number
  /** Branch/tag/commit to checkout after clone. Implies a follow-up `git checkout` if not HEAD. */
  ref?: string
  /** stdio mode for the spawned git process. Default 'pipe' (capture). */
  stdio?: 'pipe' | 'inherit' | 'ignore'
  /** Timeout in ms for clone + checkout. Default 120000 (2 min). */
  timeout?: number
}

export function gitClone(
  url: string,
  dir: string,
  opts?: GitCloneOptions,
  exec: GitExec = execFileSync,
): void {
  const args = [...socksProxyArgs(), 'clone']
  const depth = opts?.depth ?? 1
  if (depth > 0) {
    args.push('--depth', String(depth))
  }
  args.push(url, dir)
  const timeout = opts?.timeout ?? 120_000
  exec('git', args, { stdio: opts?.stdio ?? 'pipe', timeout })

  if (opts?.ref && opts.ref !== 'HEAD') {
    exec('git', [...socksProxyArgs(), 'checkout', opts.ref], { cwd: dir, stdio: opts?.stdio ?? 'pipe', timeout })
  }
}

export interface GitPullResult {
  status: 'updated' | 'up-to-date' | 'failed'
  message: string
}

export function gitPull(
  dir: string,
  timeoutMs: number = 30000,
  exec: GitExec = execFileSync,
): GitPullResult {
  try {
    const output = exec('git', [...socksProxyArgs(), 'pull'], {
      cwd: dir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: timeoutMs,
    }).trim()

    if (output.includes('Already up to date') || output.includes('Already up-to-date')) {
      return { status: 'up-to-date', message: output }
    }
    return { status: 'updated', message: output }
  } catch (err: unknown) {
    const e = err as { stderr?: { toString: () => string }; message?: string }
    const stderr = e.stderr?.toString() || e.message || ''
    return { status: 'failed', message: stderr.trim() }
  }
}

/**
 * Walk up from `dir` looking for a directory containing `.git/`. Stops
 * walking when it crosses outside `coldPool` (if given) — keeps the
 * search scoped to the cold-pool's own git roots.
 */
export interface GitRootResult {
  gitRoot: string | null
  reason?: 'not-found' | 'outside-cold-pool'
}

export function detectGitRoot(dir: string, coldPool?: string): GitRootResult {
  const absDir = resolve(dir)
  const absColdPool = coldPool ? resolve(coldPool) : null

  let cur = absDir
  while (true) {
    if (absColdPool && !cur.startsWith(absColdPool)) {
      return { gitRoot: null, reason: 'outside-cold-pool' }
    }
    if (existsSync(`${cur}/.git`)) {
      return { gitRoot: cur }
    }
    const parent = dirname(cur)
    if (parent === cur) {
      return { gitRoot: null, reason: 'not-found' }
    }
    cur = parent
  }
}
