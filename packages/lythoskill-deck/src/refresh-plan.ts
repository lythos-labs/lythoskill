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
  } catch (e: any) {
    // git rev-parse fails for non-git dirs (expected) — log unexpected failures
    const msg = e.message ?? ''
    if (!msg.includes('not a git repository') && !msg.includes('ENOENT')) {
      console.warn(`detectGitRoot: git rev-parse failed for ${skillDir}: ${msg}`)
    }
  }

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
  gitRecover?: (dir: string) => { recovered: boolean; message: string }
  log?: (msg: string) => void
  linkDeck?: (deckPath?: string, workdir?: string) => void
}

/**
 * Dirty-tree pull failures block `git pull --rebase`. The documented recovery
 * (AGENTS.md § Session Close) is `git checkout -- . && git clean -fd` — the
 * cold pool is a cache, so discarding local modifications is safe. Only this
 * failure class triggers self-heal; network/auth errors must surface as-is.
 */
export function isDirtyPullFailure(message?: string): boolean {
  return !!message && /cannot pull with rebase|unstaged changes|Please commit your changes or stash/i.test(message)
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
        let pullResult = gitPull(t.gitRoot!)
        if (pullResult.status === 'failed' && io?.gitRecover && isDirtyPullFailure(pullResult.message)) {
          const rec = io.gitRecover(t.gitRoot!)
          log(`   🩹 ${t.alias}: cold pool dirty — self-heal (${rec.message})`)
          if (rec.recovered) {
            pullResult = gitPull(t.gitRoot!)
            if (pullResult.status !== 'failed') log(`   ✅ ${t.alias}: pull succeeded after self-heal`)
          } else {
            log(`   ⚠️  ${t.alias}: self-heal failed — ${rec.message}`)
          }
        }
        results.push({ alias: t.alias, path: t.sourceRel, status: pullResult.status, message: pullResult.message })
        if (pullResult.status === 'updated') updated++
        else if (pullResult.status === 'up-to-date') upToDate++
        else failed++
        break
      }
    }
  }

  // Report phase — group by git root for monorepo clarity
  const scope = plan.targets.length === plan.allDeclared.length
    ? `${plan.allDeclared.length} skill(s)`
    : 'single skill'
  log(`\n📦 Skill Refresh Report — ${scope} checked`)
  log(`   Updated: ${updated} | Up-to-date: ${upToDate} | Skipped: ${skipped} | Failed: ${failed}`)

  // Group git results by repo root to show monorepo relationships
  const gitResults = results.filter(r => {
    const target = plan.targets.find(t => t.alias === r.alias)
    return target?.type === 'git'
  })
  const nonGitResults = results.filter(r => {
    const target = plan.targets.find(t => t.alias === r.alias)
    return target?.type !== 'git'
  })

  // Group git results by gitRoot
  const byRepo = new Map<string, typeof gitResults>()
  for (const r of gitResults) {
    const target = plan.targets.find(t => t.alias === r.alias)
    const root = target?.gitRoot ?? 'unknown'
    if (!byRepo.has(root)) byRepo.set(root, [])
    byRepo.get(root)!.push(r)
  }

  // Print grouped repo output
  for (const [root, repoResults] of byRepo) {
    const repoName = root.split('/').slice(-2).join('/') // last two segments
    const repoUpdated = repoResults.some(r => r.status === 'updated')
    const repoIcon = repoUpdated ? '🔄' : '✅'
    const skillNames = repoResults.map(r => r.alias).join(', ')
    log(`${repoIcon} ${repoName} (${repoResults.length} skill${repoResults.length > 1 ? 's' : ''})`)
    log(`   └─ ${skillNames}`)
    for (const r of repoResults) {
      if (r.message) log(`      ${r.alias}: ${r.message}`)
    }
  }

  // Print non-git results individually
  for (const r of nonGitResults) {
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
