import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { mkdirSync, writeFileSync, rmSync, mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { buildPrunePlan, executePrunePlan } from './prune-plan'
import { ColdPool } from './cold-pool'

function seedPool(): { root: string; pool: ColdPool } {
  const root = mkdtempSync(join(tmpdir(), 'prune-test-'))
  const pool = new ColdPool(root)

  // Repo A: referenced → should NOT be pruned
  const repoA = join(root, 'github.com', 'org', 'repo-a')
  mkdirSync(repoA, { recursive: true })
  writeFileSync(join(repoA, 'SKILL.md'), '# Skill A')

  // Repo B: NOT referenced → SHOULD be pruned
  const repoB = join(root, 'github.com', 'org', 'repo-b')
  mkdirSync(repoB, { recursive: true })
  writeFileSync(join(repoB, 'SKILL.md'), '# Skill B')

  // Repo C: referenced → should NOT be pruned
  const repoC = join(root, 'github.com', 'org', 'repo-c')
  mkdirSync(repoC, { recursive: true })
  writeFileSync(join(repoC, 'SKILL.md'), '# Skill C')

  // Seed metadata: A and C are active, B is not
  pool.metadata.reconcileDeckReferences('/tmp/test-deck', [
    { locator: 'github.com/org/repo-a', alias: 'a' },
    { locator: 'github.com/org/repo-c', alias: 'c' },
  ])

  return { root, pool }
}

describe('buildPrunePlan — plan-mode (IO via ColdPool + test filesystem)', () => {
  let root: string
  let pool: ColdPool

  beforeEach(() => {
    const p = seedPool()
    root = p.root
    pool = p.pool
  })

  afterEach(() => {
    try { pool.metadata.close() } catch {}
    rmSync(root, { recursive: true, force: true })
  })

  it('identifies unreferenced repos as prune candidates', () => {
    const plan = buildPrunePlan(root)
    expect(plan.candidates.length).toBe(1)
    expect(plan.candidates[0].repoRel).toBe('github.com/org/repo-b')
  })

  it('does NOT flag actively referenced repos', () => {
    const plan = buildPrunePlan(root)
    const rels = plan.candidates.map(c => c.repoRel)
    expect(rels).not.toContain('github.com/org/repo-a')
    expect(rels).not.toContain('github.com/org/repo-c')
  })

  it('empty cold pool → empty plan', () => {
    const emptyDir = mkdtempSync(join(tmpdir(), 'prune-empty-'))
    const plan = buildPrunePlan(emptyDir)
    expect(plan.candidates).toEqual([])
    expect(plan.totalSize).toBe(0)
    rmSync(emptyDir, { recursive: true, force: true })
  })

  it('plan includes coldPoolPath and totalSize', () => {
    const plan = buildPrunePlan(root)
    expect(plan.coldPoolPath).toBe(root)
    expect(plan.totalSize).toBeGreaterThan(0)
  })
})

describe('executePrunePlan — plan-mode (IO injected)', () => {
  it('calls delete for each candidate', () => {
    const deleted: string[] = []
    const plan = {
      coldPoolPath: '/pool',
      candidates: [
        { repoPath: '/pool/gh/org/a', repoRel: 'gh/org/a', size: 1024 },
        { repoPath: '/pool/gh/org/b', repoRel: 'gh/org/b', size: 2048 },
      ],
      totalSize: 3072,
    }
    const results = executePrunePlan(plan, {
      delete: (path) => { deleted.push(path) },
      log: () => {},
    })
    expect(deleted).toEqual(['/pool/gh/org/a', '/pool/gh/org/b'])
    expect(results).toHaveLength(2)
    expect(results[0].deleted).toBe(true)
    expect(results[1].deleted).toBe(true)
  })

  it('logs count and total size', () => {
    const logs: string[] = []
    executePrunePlan({
      coldPoolPath: '/pool',
      candidates: [{ repoPath: '/pool/x', repoRel: 'x', size: 500 }],
      totalSize: 500,
    }, {
      delete: () => {},
      log: (msg) => logs.push(msg),
    })
    const joined = logs.join(' ')
    expect(joined).toContain('1 repo')
    expect(joined).toContain('500')
  })

  it('skips delete when candidates array empty', () => {
    let called = false
    const results = executePrunePlan(
      { coldPoolPath: '/pool', candidates: [], totalSize: 0 },
      { delete: () => { called = true }, log: () => {} },
    )
    expect(called).toBe(false)
    expect(results).toEqual([])
  })
})
