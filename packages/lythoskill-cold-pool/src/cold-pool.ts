import { existsSync, readdirSync } from 'node:fs'
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
 * (with relPath), classify every terminal repo directory.
 *
 * Canonical:  <pool>/<host>/<owner>/<repo>           (3 segments, no SKILL.md mid-tree)
 * Legacy:     <pool>/<host>/SKILL.md                  (depth 1 — no owner/repo)
 *             <pool>/<host>/<name>/SKILL.md            (depth 2 — no repo segment)
 */
export function buildListPlan(rootPath: string, allEntries: DirEntry[]): ListPlan {
  const plan: ListPlanEntry[] = []
  const dirSet = new Set(allEntries.filter(e => e.isDirectory).map(e => e.relPath))

  // Determine whether a dir is terminal (no child dirs)
  function isTerminal(relPath: string): boolean {
    const prefix = relPath + '/'
    for (const d of dirSet) {
      if (d.startsWith(prefix) && d !== relPath) return false
    }
    return true
  }

  // Check whether a dir directly contains SKILL.md
  function hasSkillMd(dirRel: string): boolean {
    return allEntries.some(e => e.relPath === `${dirRel}/SKILL.md` && !e.isDirectory)
  }

  // Walk only terminal dirs — they are the leaves (repo-level entries)
  for (const d of dirSet) {
    if (d.startsWith('.') || d.split('/').some(s => s.startsWith('.'))) continue
    if (!isTerminal(d)) continue

    const segments = d.split('/')

    // Legacy depth-1: <host>/SKILL.md — terminal dir with SKILL.md, depth=1
    if (segments.length === 1 && hasSkillMd(d)) {
      plan.push({ path: join(rootPath, d), kind: 'legacy-depth1' })
      continue
    }

    // Legacy depth-2: <host>/<name>/SKILL.md — terminal dir with SKILL.md, depth=2
    if (segments.length === 2 && hasSkillMd(d)) {
      plan.push({ path: join(rootPath, d), kind: 'legacy-depth2' })
      continue
    }

    // Canonical: <host>/<owner>/<repo> — terminal dir at depth 3, no SKILL.md mid-tree
    if (segments.length === 3) {
      // Verify no SKILL.md at intermediate levels (depth 1 or 2)
      const parent = segments.slice(0, 2).join('/')
      if (!hasSkillMd(segments[0]) && !hasSkillMd(parent)) {
        plan.push({ path: join(rootPath, d), kind: 'canonical' })
      }
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
