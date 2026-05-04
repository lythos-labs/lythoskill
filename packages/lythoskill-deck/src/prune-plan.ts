import { existsSync, readdirSync, statSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { findDeckToml, expandHome } from './link'
import { parseDeck } from './parse-deck'

// ── Types ──────────────────────────────────────────────────────────────────

export interface PruneCandidate {
  repoPath: string
  repoRel: string                  // relative to cold pool
  size: number                     // bytes
}

export interface PrunePlan {
  deckPath: string
  workdir: string
  coldPool: string
  candidates: PruneCandidate[]     // unreferenced repos to delete
  declared: string[]               // declared skill names (for audit)
  totalSize: number                // total reclaimable bytes
}

// ── Config resolution ──────────────────────────────────────────────────────

export function resolvePruneConfig(opts?: {
  deckPath?: string
  workdir?: string
  coldPool?: string
}) {
  const deckPath = opts?.deckPath
    ? resolve(opts.deckPath)
    : (findDeckToml(process.cwd()) || resolve('skill-deck.toml'))

  const workdir = opts?.workdir
    ? resolve(opts.workdir)
    : join(deckPath, '..')

  const coldPool = opts?.coldPool
    ? resolve(opts.coldPool)
    : expandHome('~/.agents/skill-repos', workdir)

  return { deckPath, workdir, coldPool }
}

// ── Cold pool scanner (pure: reads, no delete) ─────────────────────────────

export function scanColdPool(coldPool: string): string[] {
  const repos: string[] = []
  if (!existsSync(coldPool)) return repos

  try {
    for (const host of readdirSync(coldPool, { withFileTypes: true })) {
      if (!host.isDirectory() || host.name.startsWith('.')) continue
      const hostPath = join(coldPool, host.name)

      // Flat skill: cold-pool/skill-name/SKILL.md (localhost style)
      if (existsSync(join(hostPath, 'SKILL.md'))) {
        repos.push(hostPath)
        continue
      }

      // Nested: cold-pool/github.com/owner/repo/
      for (const owner of readdirSync(hostPath, { withFileTypes: true })) {
        if (!owner.isDirectory() || owner.name.startsWith('.')) continue
        const ownerPath = join(hostPath, owner.name)
        for (const repo of readdirSync(ownerPath, { withFileTypes: true })) {
          if (!repo.isDirectory() || repo.name.startsWith('.')) continue
          repos.push(join(ownerPath, repo.name))
        }
      }
    }
  } catch {}

  return repos
}

// ── Size calculation (pure helper) ─────────────────────────────────────────

export function calculateDirSize(dir: string): number {
  let total = 0
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name)
      if (entry.isDirectory()) {
        total += calculateDirSize(p)
      } else if (entry.isFile()) {
        total += statSync(p).size
      }
    }
  } catch {}
  return total
}

// ── Plan builder (pure: no deletion, no mutation) ──────────────────────────

export function buildPrunePlan(
  deckRaw: string,
  opts?: { deckPath?: string; workdir?: string; coldPool?: string }
): PrunePlan {
  const { deckPath, workdir, coldPool: configuredColdPool } = resolvePruneConfig(opts)

  // Read cold_pool from deck.toml if not explicitly overridden
  let coldPool = configuredColdPool
  if (!opts?.coldPool) {
    const deckMatch = deckRaw.match(/cold_pool\s*=\s*"([^"]+)"/)
    if (deckMatch) {
      coldPool = expandHome(deckMatch[1], workdir)
    }
  }

  // Get declared skill paths from deck
  const { entries: declared } = parseDeck(deckRaw)
  const declaredPaths = new Set(declared.map(d => d.path))

  // Scan cold pool for all repos
  const allRepos = scanColdPool(coldPool)

  // Find unreferenced: repos not declared in deck
  const candidates: PruneCandidate[] = []
  for (const repoPath of allRepos) {
    // A repo is referenced if any declared skill path starts with its cold-pool-relative path
    const repoRel = repoPath.slice(coldPool.length + 1) // relative to cold pool
    const isReferenced = [...declaredPaths].some(d => d.startsWith(repoRel) || repoRel.startsWith(d))

    if (!isReferenced) {
      candidates.push({
        repoPath,
        repoRel,
        size: calculateDirSize(repoPath),
      })
    }
  }

  const totalSize = candidates.reduce((sum, c) => sum + c.size, 0)

  return {
    deckPath,
    workdir,
    coldPool,
    candidates,
    declared: declared.map(d => d.path),
    totalSize,
  }
}

// ── Execution (IO layer, injectable for testing) ───────────────────────────

export interface PruneResult {
  repoRel: string
  deleted: boolean
  error?: string
}

export interface PruneIO {
  delete?: (path: string) => void
  log?: (msg: string) => void
  formatSize?: (bytes: number) => string
}

export function executePrunePlan(plan: PrunePlan, io?: PruneIO): PruneResult[] {
  const deleteFn = io?.delete ?? ((_path: string) => { throw new Error('delete not injected') })
  const log = io?.log ?? (() => {})
  const fmtSize = io?.formatSize ?? ((b: number) => b < 1024 ? `${b}B` : b < 1024 * 1024 ? `${(b / 1024).toFixed(1)}KB` : `${(b / (1024 * 1024)).toFixed(1)}MB`)

  log(`\n🧹 Prune candidates — ${plan.candidates.length} repo(s), ${fmtSize(plan.totalSize)} total:\n`)
  for (const c of plan.candidates) {
    log(`   ${c.repoRel} (${fmtSize(c.size)})`)
  }

  const results: PruneResult[] = []
  let deleted = 0, failed = 0

  for (const c of plan.candidates) {
    try {
      deleteFn(c.repoPath)
      log(`  🗑️  Deleted: ${c.repoRel}`)
      results.push({ repoRel: c.repoRel, deleted: true })
      deleted++
    } catch (err: any) {
      log(`  ❌ Failed to delete ${c.repoRel}: ${err.message}`)
      results.push({ repoRel: c.repoRel, deleted: false, error: err.message })
      failed++
    }
  }

  log(`\n📦 Prune complete: ${deleted} deleted, ${failed} failed`)
  return results
}
