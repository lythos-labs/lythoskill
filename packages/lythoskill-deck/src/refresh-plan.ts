import { existsSync } from 'node:fs'
import { resolve, dirname, relative } from 'node:path'
import { realpathSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { parseLocator } from '@lythos/cold-pool'
import { findDeckToml, expandHome, findSource } from './link'
import { parseDeck, type ParsedSkillEntry } from './parse-deck'

// ── Types ──────────────────────────────────────────────────────────────────

export interface RefreshTarget {
  alias: string
  path: string                      // FQ path
  sourcePath: string                // absolute path in cold pool
  sourceRel: string                 // relative to cold pool
  type: 'git' | 'localhost' | 'missing' | 'not-git'
  gitRoot?: string                  // populated for 'git' type
}

export interface RefreshPlan {
  deckPath: string
  workdir: string
  coldPool: string
  targets: RefreshTarget[]
  allDeclared: ParsedSkillEntry[]
}

// ── Config resolution (pure, defaults via params) ──────────────────────────

export function resolveRefreshConfig(opts?: {
  deckPath?: string
  workdir?: string
  coldPool?: string
}) {
  const deckPath = opts?.deckPath
    ? resolve(opts.deckPath)
    : (findDeckToml(process.cwd()) || resolve('skill-deck.toml'))

  const workdir = opts?.workdir
    ? resolve(opts.workdir)
    : dirname(deckPath)

  const coldPool = opts?.coldPool
    ? resolve(opts.coldPool)
    : expandHome('~/.agents/skill-repos', workdir)

  return { deckPath, workdir, coldPool }
}

// ── Git detection (pure: only checks directory structure, no mutation) ─────

export function detectGitRoot(skillDir: string, coldPool: string): { gitRoot?: string; type: RefreshTarget['type'] } {
  // localhost skills are user-managed
  const rel = relative(coldPool, skillDir)
  if (rel.startsWith('localhost') || rel === 'localhost') {
    return { type: 'localhost' }
  }

  // Standalone skill: .git directly in skill dir
  if (existsSync(resolve(skillDir, '.git'))) {
    return { gitRoot: skillDir, type: 'git' }
  }

  try {
    const out = execSync('git rev-parse --show-toplevel', {
      cwd: skillDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim()

    // Normalize paths (macOS /tmp → /private/tmp)
    const resolvedRoot = realpathSync(out)
    const resolvedDir = realpathSync(skillDir)
    const resolvedPool = realpathSync(coldPool)

    // Must be ancestor of skillDir and within coldPool
    if (resolvedDir.startsWith(resolvedRoot + '/') &&
        (resolvedRoot === resolvedPool || resolvedRoot.startsWith(resolvedPool + '/'))) {
      return { gitRoot: out, type: 'git' }
    }
  } catch {}

  return { type: 'not-git' }
}

// ── Plan builder (pure: no git pull, no mutation) ──────────────────────────

export function buildRefreshPlan(
  deckRaw: string,
  opts?: { deckPath?: string; workdir?: string; coldPool?: string; target?: string }
): RefreshPlan {
  const { deckPath, workdir, coldPool: configuredColdPool } = resolveRefreshConfig(opts)

  // Read cold_pool from deck.toml [deck] section if not explicitly overridden
  let coldPool = configuredColdPool
  if (!opts?.coldPool) {
    const deckMatch = deckRaw.match(/cold_pool\s*=\s*"([^"]+)"/)
    if (deckMatch) {
      coldPool = expandHome(deckMatch[1], workdir)
    }
  }

  const { entries: allDeclared } = parseDeck(deckRaw)

  // Filter to target (by alias or path) if specified
  let declared = allDeclared
  if (opts?.target) {
    const byAlias = allDeclared.find(d => d.alias === opts.target)
    if (byAlias) {
      declared = [byAlias]
    } else {
      const byPath = allDeclared.find(d => d.path === opts.target)
      if (byPath) {
        declared = [byPath]
      } else {
        declared = [] // target not found → empty plan
      }
    }
  }

  const targets: RefreshTarget[] = []

  for (const entry of declared) {
    // Localhost shortcut: parse the locator and short-circuit before
    // hitting fs. localhost layout per ADR-20260507021957847 is a
    // top-level dir under coldPool (no `localhost/` directory prefix),
    // so path-based detectGitRoot can't distinguish it from a regular
    // standalone skill. The locator string is the authoritative signal.
    const locator = parseLocator(entry.path)
    if (locator?.isLocalhost) {
      const source = findSource(entry.path, coldPool, workdir)
      const sourcePath = source.path ?? ''
      targets.push({
        alias: entry.alias,
        path: entry.path,
        sourcePath,
        sourceRel: sourcePath ? relative(coldPool, sourcePath) : '',
        type: sourcePath ? 'localhost' : 'missing',
      })
      continue
    }

    const source = findSource(entry.path, coldPool, workdir)

    if (source.error || !source.path) {
      targets.push({ alias: entry.alias, path: entry.path, sourcePath: '', sourceRel: '', type: 'missing' })
      continue
    }

    const { gitRoot, type } = detectGitRoot(source.path, coldPool)
    const sourceRel = relative(coldPool, source.path)

    targets.push({
      alias: entry.alias,
      path: entry.path,
      sourcePath: source.path,
      sourceRel,
      type,
      gitRoot,
    })
  }

  return { deckPath, workdir, coldPool, targets, allDeclared }
}

// ── Execution (IO layer, injectable for testing) ───────────────────────────

export interface RefreshResult {
  alias: string
  path: string
  status: 'updated' | 'up-to-date' | 'skipped' | 'failed' | 'not-git'
  message?: string
}

export interface RefreshIO {
  gitPull?: (dir: string) => { status: 'updated' | 'up-to-date' | 'failed'; message: string }
  log?: (msg: string) => void
  linkDeck?: (deckPath?: string, workdir?: string) => void
}

export function executeRefreshPlan(plan: RefreshPlan, io?: RefreshIO): RefreshResult[] {
  const gitPull = io?.gitPull ?? (() => ({ status: 'failed' as const, message: 'gitPull not injected' }))
  const log = io?.log ?? (() => {})

  const results: RefreshResult[] = []
  let updated = 0, upToDate = 0, skipped = 0, failed = 0

  for (const t of plan.targets) {
    switch (t.type) {
      case 'missing':
        results.push({ alias: t.alias, path: '', status: 'failed', message: 'Skill not found in cold pool' })
        failed++
        break
      case 'localhost':
        results.push({ alias: t.alias, path: t.sourceRel, status: 'skipped', message: 'localhost skill — user-managed' })
        skipped++
        break
      case 'not-git':
        results.push({ alias: t.alias, path: t.sourceRel, status: 'not-git', message: 'skipped: not a git repository' })
        skipped++
        break
      case 'git': {
        const pullResult = gitPull(t.gitRoot!)
        results.push({ alias: t.alias, path: t.sourceRel, status: pullResult.status, message: pullResult.message })
        if (pullResult.status === 'updated') updated++
        else if (pullResult.status === 'up-to-date') upToDate++
        else failed++
        break
      }
    }
  }

  // Report phase
  const scope = plan.targets.length === plan.allDeclared.length
    ? `${plan.allDeclared.length} skill(s)`
    : 'single skill'
  log(`\n📦 Skill Refresh Report — ${scope} checked`)
  log(`   Updated: ${updated} | Up-to-date: ${upToDate} | Skipped: ${skipped} | Failed: ${failed}`)

  for (const r of results) {
    const icon = r.status === 'updated' ? '🔄' : r.status === 'up-to-date' ? '✅' :
      r.status === 'skipped' ? '⏭️' : r.status === 'not-git' ? '📁' : '❌'
    log(`${icon} ${r.alias}`)
    if (r.message) log(`   ${r.message}`)
  }

  if (updated > 0) {
    io?.linkDeck?.()
  }

  return results
}
