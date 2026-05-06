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

export const DEFAULT_COLD_POOL_PATH = process.env.LYTHOS_COLD_POOL
  ?? join(homedir(), '.agents/skill-repos')

export class ColdPool {
  readonly path: string

  constructor(coldPoolPath?: string) {
    this.path = coldPoolPath ?? DEFAULT_COLD_POOL_PATH
  }

  /** Compute the cold-pool directory for a locator. No fs check. */
  resolveDir(locator: Locator): string {
    if (locator.isLocalhost) {
      return join(this.path, locator.host, locator.skill ?? '')
    }
    return join(this.path, locator.host, locator.owner!, locator.repo!)
  }

  /** Whether a locator's repo directory exists in the pool. */
  has(locator: Locator): boolean {
    return existsSync(this.resolveDir(locator))
  }

  /**
   * Enumerate top-level cold-pool entries: standalone localhost-style
   * dirs (host/skill) plus host/owner/repo triples.
   */
  list(): string[] {
    if (!existsSync(this.path)) return []
    const repos: string[] = []

    for (const host of readdirSync(this.path, { withFileTypes: true })) {
      if (!host.isDirectory() || host.name.startsWith('.')) continue
      const hostPath = join(this.path, host.name)

      // host/skill (e.g. localhost/<name>): one extra level under host
      if (host.name === 'localhost') {
        for (const entry of readdirSync(hostPath, { withFileTypes: true })) {
          if (!entry.isDirectory() || entry.name.startsWith('.')) continue
          repos.push(join(hostPath, entry.name))
        }
        continue
      }

      // host/owner/repo
      for (const owner of readdirSync(hostPath, { withFileTypes: true })) {
        if (!owner.isDirectory() || owner.name.startsWith('.')) continue
        const ownerPath = join(hostPath, owner.name)
        for (const repo of readdirSync(ownerPath, { withFileTypes: true })) {
          if (!repo.isDirectory() || repo.name.startsWith('.')) continue
          repos.push(join(ownerPath, repo.name))
        }
      }
    }

    return repos
  }
}
