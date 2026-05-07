/**
 * ColdPool — dedicated resource holder.
 *
 * Owns the cold-pool path, exposes read-only accessors. Operations
 * (fetch, validate, reconcile) are external functions that take a
 * ColdPool and return Plan-shaped data, per the intent/plan/execute
 * pattern.
 */
import { existsSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { Locator } from './types.js'
import { MetadataDB } from './metadata-db.js'

export const DEFAULT_COLD_POOL_PATH = process.env.LYTHOS_COLD_POOL
  ?? join(homedir(), '.agents/skill-repos')

export class ColdPool {
  readonly path: string
  readonly metadata: MetadataDB

  constructor(coldPoolPath?: string) {
    this.path = coldPoolPath ?? DEFAULT_COLD_POOL_PATH
    this.metadata = new MetadataDB(join(this.path, '.cold-pool-meta.db'))
  }

  /**
   * Compute the cold-pool directory for a locator. No fs check.
   *
   * Layout invariant: `<pool>/<host>/<owner>/<repo>` for ALL locators
   * including localhost. No special-case branching — "directory layers
   * = FQ locator segments" (per user 2026-05-07). Skill subpath
   * extends within the repo dir (resolveDir returns the repo dir).
   */
  resolveDir(locator: Locator): string {
    return join(this.path, locator.host, locator.owner, locator.repo)
  }

  /** Whether a locator's repo directory exists in the pool. */
  has(locator: Locator): boolean {
    return existsSync(this.resolveDir(locator))
  }

  /**
   * Enumerate cold-pool entries.
   *
   * Uniform layout: `<pool>/<host>/<owner>/<repo>`. localhost is just
   * another host. No localhost special-case.
   *
   * Legacy drift: `<pool>/<x>/SKILL.md` (depth 2 with SKILL.md) or
   * `<pool>/localhost/<name>/SKILL.md` (depth 3 with SKILL.md, missing
   * owner/repo) are non-canonical state from older agents that bypassed
   * FQ-only enforcement. Surface them so prune can offer cleanup.
   */
  list(): string[] {
    if (!existsSync(this.path)) return []
    const repos: string[] = []

    for (const host of readdirSync(this.path, { withFileTypes: true })) {
      if (!host.isDirectory() || host.name.startsWith('.')) continue
      const hostPath = join(this.path, host.name)

      // Legacy drift: top-level dir with SKILL.md (not canonical 3-segment)
      if (existsSync(join(hostPath, 'SKILL.md'))) {
        repos.push(hostPath)
        continue
      }

      // Canonical: <host>/<owner>/<repo>
      for (const owner of readdirSync(hostPath, { withFileTypes: true })) {
        if (!owner.isDirectory() || owner.name.startsWith('.')) continue
        const ownerPath = join(hostPath, owner.name)

        // Legacy drift: <host>/<x>/SKILL.md (depth 2 missing repo level —
        // typically `localhost/<name>/SKILL.md` from older agents)
        if (existsSync(join(ownerPath, 'SKILL.md'))) {
          repos.push(ownerPath)
          continue
        }

        for (const repo of readdirSync(ownerPath, { withFileTypes: true })) {
          if (!repo.isDirectory() || repo.name.startsWith('.')) continue
          repos.push(join(ownerPath, repo.name))
        }
      }
    }

    return repos
  }
}
