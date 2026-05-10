import { existsSync, readdirSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, relative } from 'node:path'
import type { Locator } from './types.js'
import { MetadataDB } from './metadata-db.js'

export const DEFAULT_COLD_POOL_PATH = process.env.LYTHOS_COLD_POOL
  ?? join(homedir(), '.agents/skill-repos')

// ── DirEntry — pure, injectable fs entry ─────────────────────────────────────

export interface DirEntry {
  /** Path relative to cold-pool root (e.g. "github.com/owner/repo") */
  relPath: string
  isDirectory: boolean
}

// ── List plan: pure classification logic ────────────────────────────────────

export interface ListPlanEntry {
  path: string
  kind: 'canonical' | 'legacy-depth2' | 'legacy-depth1'
}

export interface ListPlan {
  entries: ListPlanEntry[]
}

/**
 * Pure: given a cold-pool root path and a flat list of all fs entries
 * (with relPath), classify every directory containing SKILL.md.
 *
 * Walk ordering:
 *   1. Terminal repos at depth 3+ (canonical — host/owner/repo)
 *   2. Legacy depth-2 <host>/<name>/SKILL.md (monorepo roots)
 *   3. Legacy depth-1 <host>/SKILL.md (flat repos)
 *   4. Fallback: any other directory with SKILL.md at any depth
 *
 * SKILL.md presence is the single authoritative marker for a skill
 * directory. Terminal-depth heuristics alone miss real-world layouts
 * like monorepos with subdirs, multi-skill repos, and mixed-depth clones.
 */
export function buildListPlan(rootPath: string, allEntries: DirEntry[]): ListPlan {
  const plan: ListPlanEntry[] = []
  const dirSet = new Set(allEntries.filter(e => e.isDirectory).map(e => e.relPath))
  // Pre-compute: O(1) lookup for "does this dir have a SKILL.md?"
  const skillMdPaths = new Set(
    allEntries.filter(e => !e.isDirectory && e.relPath.endsWith('/SKILL.md')).map(e => e.relPath)
  )

  function isTerminal(relPath: string): boolean {
    const prefix = relPath + '/'
    for (const d of dirSet) {
      if (d.startsWith(prefix) && d !== relPath) return false
    }
    return true
  }

  function hasSkillMd(dirRel: string): boolean {
    return skillMdPaths.has(`${dirRel}/SKILL.md`)
  }

  // Phase 1: Process terminal dirs (backward compat, but only WITH SKILL.md)
  for (const d of dirSet) {
    if (d.startsWith('.') || d.split('/').some(s => s.startsWith('.'))) continue
    if (!isTerminal(d) || !hasSkillMd(d)) continue

    const segments = d.split('/')

    if (segments.length >= 3) {
      // Canonical or deeper: host/owner/repo[ /sub...]
      plan.push({ path: join(rootPath, d), kind: 'canonical' })
    } else if (segments.length === 2) {
      plan.push({ path: join(rootPath, d), kind: 'legacy-depth2' })
    } else if (segments.length === 1) {
      plan.push({ path: join(rootPath, d), kind: 'legacy-depth1' })
    }
  }

  // Phase 2: Non-terminal dirs with SKILL.md (monorepo roots, multi-skill repos)
  // These are missed by phase 1 because they have subdirectories.
  for (const d of dirSet) {
    if (d.startsWith('.') || d.split('/').some(s => s.startsWith('.'))) continue
    if (isTerminal(d)) continue
    if (!hasSkillMd(d)) continue

    const segments = d.split('/')
    const kind = segments.length >= 3 ? 'canonical' : segments.length === 2 ? 'legacy-depth2' : 'legacy-depth1'
    // Deduplicate (phase 1 may have already added this path)
    if (!plan.some(e => e.path === join(rootPath, d))) {
      plan.push({ path: join(rootPath, d), kind })
    }
  }

  return { entries: plan }
}

// ── ColdPool ─────────────────────────────────────────────────────────────────

export class ColdPool {
  readonly path: string
  readonly metadata: MetadataDB

  constructor(coldPoolPath?: string) {
    this.path = coldPoolPath ?? DEFAULT_COLD_POOL_PATH
    this.metadata = new MetadataDB(join(this.path, '.cold-pool-meta.db'))
  }

  resolveDir(locator: Locator): string {
    return join(this.path, locator.host, locator.owner, locator.repo)
  }

  has(locator: Locator): boolean {
    return existsSync(this.resolveDir(locator))
  }

  /**
   * Find all skill directories by scanning for SKILL.md in the cold pool.
   * Returns absolute paths.
   *
   * Both `list()` (and its underlying `buildListPlan()`) and this method now
   * converge on SKILL.md presence as the authoritative marker. `list()`
   * additionally classifies entries by canonical/legacy kind.
   */
  findSkillDirectories(): string[] {
    const dirs: string[] = []
    if (!existsSync(this.path)) return dirs

    function walk(dir: string, push: (d: string) => void): void {
      let dirents: ReturnType<typeof readdirSync>
      try { dirents = readdirSync(dir, { withFileTypes: true }) } catch { return }
      for (const d of dirents) {
        if (!d.isDirectory() || d.name.startsWith('.')) continue
        const sub = join(dir, d.name)
        if (existsSync(join(sub, 'SKILL.md'))) {
          push(sub)
        } else {
          walk(sub, push)
        }
      }
    }

    walk(this.path, (d) => dirs.push(d))
    return dirs
  }

  /** Enumerate cold-pool entries. Delegates classification to pure buildListPlan. */
  list(): string[] {
    if (!existsSync(this.path)) return []

    const poolPath = this.path
    const allEntries: DirEntry[] = []
    function collectRecursive(dir: string): void {
      let dirents: ReturnType<typeof readdirSync>
      try {
        dirents = readdirSync(dir, { withFileTypes: true })
      } catch {
        return
      }
      for (const d of dirents) {
        const rel = relative(poolPath, join(dir, d.name))
        allEntries.push({ relPath: rel, isDirectory: d.isDirectory() })
        if (d.isDirectory() && !d.name.startsWith('.')) {
          collectRecursive(join(dir, d.name))
        }
      }
    }
    collectRecursive(poolPath)

    const plan = buildListPlan(poolPath, allEntries)
    return plan.entries.map(e => e.path)
  }
}
