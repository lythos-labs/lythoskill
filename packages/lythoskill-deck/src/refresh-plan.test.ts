import { describe, test, expect } from 'bun:test'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { resolveRefreshConfig, detectGitRoot, buildRefreshPlan } from './refresh-plan'

const deckAliasDict = `[deck]
max_cards = 10
cold_pool = "./cold-pool"

[tool.skills.skill-a]
path = "github.com/foo/bar/skill-a"

[tool.skills.skill-b]
path = "localhost/skill-b"
`

describe('resolveRefreshConfig', () => {
  test('returns strings without throwing when no opts', () => {
    const cfg = resolveRefreshConfig()
    expect(typeof cfg.deckPath).toBe('string')
    expect(typeof cfg.workdir).toBe('string')
    expect(typeof cfg.coldPool).toBe('string')
  })

  test('resolves explicit deckPath', () => {
    const cfg = resolveRefreshConfig({ deckPath: '/tmp/test-deck.toml' })
    expect(cfg.deckPath).toBe('/tmp/test-deck.toml')
  })

  test('workdir falls back to deckPath dirname', () => {
    const cfg = resolveRefreshConfig({ deckPath: '/tmp/my-deck.toml' })
    expect(cfg.workdir).toBe('/tmp')
  })

  test('explicit workdir overrides fallback', () => {
    const cfg = resolveRefreshConfig({ deckPath: '/tmp/my-deck.toml', workdir: '/custom/workdir' })
    expect(cfg.workdir).toBe('/custom/workdir')
  })

  test('explicit coldPool resolved', () => {
    const cfg = resolveRefreshConfig({ coldPool: '/custom/cold-pool' })
    expect(cfg.coldPool).toBe('/custom/cold-pool')
  })
})

describe('detectGitRoot', () => {
  test('localhost skill → localhost type', () => {
    const result = detectGitRoot('/pool/localhost/skill-a', '/pool')
    expect(result.type).toBe('localhost')
  })

  test('localhost as root → localhost type', () => {
    const result = detectGitRoot('/pool/localhost', '/pool')
    expect(result.type).toBe('localhost')
  })

  test('not-git: directory without .git', () => {
    const dir = join('/tmp', 'refresh-test-no-git-' + Date.now())
    mkdirSync(dir, { recursive: true })
    const result = detectGitRoot(dir, '/tmp')
    expect(result.type).toBe('not-git')
    rmSync(dir, { recursive: true, force: true })
  })
})

describe('buildRefreshPlan', () => {
  test('builds plan from alias-dict deck', () => {
    const plan = buildRefreshPlan(deckAliasDict, { coldPool: '/tmp/test-cold-pool' })
    expect(plan.targets).toHaveLength(2)
    expect(plan.allDeclared).toHaveLength(2)
  })

  test('filters by alias when target specified', () => {
    const plan = buildRefreshPlan(deckAliasDict, {
      coldPool: '/tmp/test-cold-pool',
      target: 'skill-a',
    })
    expect(plan.targets).toHaveLength(1)
    expect(plan.targets[0].alias).toBe('skill-a')
  })

  test('filters by path when target specified', () => {
    const plan = buildRefreshPlan(deckAliasDict, {
      coldPool: '/tmp/test-cold-pool',
      target: 'github.com/foo/bar/skill-a',
    })
    expect(plan.targets).toHaveLength(1)
    expect(plan.targets[0].path).toBe('github.com/foo/bar/skill-a')
  })

  test('unknown target → empty plan', () => {
    const plan = buildRefreshPlan(deckAliasDict, {
      coldPool: '/tmp/test-cold-pool',
      target: 'nonexistent',
    })
    expect(plan.targets).toHaveLength(0)
  })

  test('localhost skill is in plan as declared', () => {
    const plan = buildRefreshPlan(deckAliasDict, { coldPool: '/tmp/test-cold-pool' })
    const localhost = plan.targets.find(t => t.alias === 'skill-b')
    // Without a real cold pool, source resolution may fail → 'missing'
    // Plan structure is what matters; type depends on actual filesystem
    expect(localhost).toBeDefined()
    expect(localhost!.path).toBe('localhost/skill-b')
  })

  test('paths are resolved through config', () => {
    const plan = buildRefreshPlan(deckAliasDict, {
      deckPath: '/custom/deck.toml',
      workdir: '/custom/work',
      coldPool: '/custom/pool',
    })
    expect(plan.deckPath).toBe('/custom/deck.toml')
    expect(plan.workdir).toBe('/custom/work')
    expect(plan.coldPool).toBe('/custom/pool')
  })
})
