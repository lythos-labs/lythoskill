import { existsSync } from 'node:fs'
import { resolve, dirname, relative } from 'node:path'
import { realpathSync } from 'node:fs'
import { execSync } from 'node:child_process'
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
