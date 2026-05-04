import { describe, test, expect } from 'bun:test'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { resolvePruneConfig, scanColdPool, calculateDirSize, buildPrunePlan } from './prune-plan'

const deckToml = `[deck]
cold_pool = "./cold-pool"

[tool.skills.skill-a]
path = "github.com/foo/bar/skill-a"

[tool.skills.skill-b]
path = "localhost/skill-b"
`

describe('resolvePruneConfig', () => {
  test('explicit paths override defaults', () => {
    const cfg = resolvePruneConfig({
      deckPath: '/tmp/deck.toml',
      workdir: '/custom/work',
      coldPool: '/custom/pool',
    })
    expect(cfg.deckPath).toBe('/tmp/deck.toml')
    expect(cfg.workdir).toBe('/custom/work')
    expect(cfg.coldPool).toBe('/custom/pool')
  })
})

describe('scanColdPool', () => {
  test('empty for nonexistent directory', () => {
    expect(scanColdPool('/tmp/nonexistent-' + Date.now())).toEqual([])
  })

  test('finds flat localhost skills in cold pool', () => {
    const pool = join('/tmp', 'prune-test-pool-' + Date.now())
    mkdirSync(join(pool, 'skill-b'), { recursive: true })
    writeFileSync(join(pool, 'skill-b', 'SKILL.md'), '# test')

    const repos = scanColdPool(pool)
    expect(repos.some(r => r.endsWith('skill-b'))).toBe(true)

    rmSync(pool, { recursive: true, force: true })
  })
})

describe('calculateDirSize', () => {
  test('calculates total size', () => {
    const dir = join('/tmp', 'size-test-' + Date.now())
    mkdirSync(join(dir, 'sub'), { recursive: true })
    writeFileSync(join(dir, 'a.txt'), 'hello')
    writeFileSync(join(dir, 'sub', 'b.txt'), 'world')

    const size = calculateDirSize(dir)
    expect(size).toBeGreaterThanOrEqual(10) // 'hello' + 'world' = 10 bytes
    rmSync(dir, { recursive: true, force: true })
  })
})

describe('buildPrunePlan', () => {
  test('builds plan from deck config', () => {
    const plan = buildPrunePlan(deckToml, { coldPool: '/tmp/test-pool' })
    expect(plan.declared).toHaveLength(2)
    expect(plan.declared).toContain('github.com/foo/bar/skill-a')
  })

  test('identifies unreferenced repos as candidates', () => {
    const pool = join('/tmp', 'prune-plan-test-' + Date.now())
    // Create a declared repo
    mkdirSync(join(pool, 'github.com', 'foo', 'bar', 'skill-a'), { recursive: true })
    // Create an UNREFERENCED repo (not in deck)
    mkdirSync(join(pool, 'github.com', 'baz', 'qux'), { recursive: true })

    const plan = buildPrunePlan(deckToml, { coldPool: pool })
    const unreferenced = plan.candidates.map(c => c.repoRel)
    expect(unreferenced).toContain('github.com/baz/qux')
    // skill-a is declared, should NOT be a candidate
    expect(unreferenced).not.toContain('github.com/foo/bar/skill-a')

    rmSync(pool, { recursive: true, force: true })
  })

  test('empty candidates when all repos declared', () => {
    const pool = join('/tmp', 'prune-all-declared-' + Date.now())
    mkdirSync(join(pool, 'github.com', 'foo', 'bar', 'skill-a'), { recursive: true })
    mkdirSync(join(pool, 'localhost', 'skill-b'), { recursive: true })

    const plan = buildPrunePlan(deckToml, { coldPool: pool })
    expect(plan.candidates).toHaveLength(0)

    rmSync(pool, { recursive: true, force: true })
  })

  test('totalSize is sum of candidate sizes', () => {
    const pool = join('/tmp', 'prune-size-test-' + Date.now())
    mkdirSync(join(pool, 'github.com', 'unref', 'repo'), { recursive: true })
    writeFileSync(join(pool, 'github.com', 'unref', 'repo', 'data.txt'), 'hello world')

    const plan = buildPrunePlan(deckToml, { coldPool: pool })
    expect(plan.totalSize).toBeGreaterThanOrEqual(11)

    rmSync(pool, { recursive: true, force: true })
  })
})
