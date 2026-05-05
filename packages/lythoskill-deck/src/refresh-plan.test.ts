import { describe, test, expect } from 'bun:test'
import { mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { resolveRefreshConfig, detectGitRoot, buildRefreshPlan, executeRefreshPlan, type RefreshPlan, type RefreshTarget } from './refresh-plan'

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

// ── executeRefreshPlan (IO-injected plan execution) ────────────────

function makeTarget(overrides: Partial<RefreshTarget> = {}): RefreshTarget {
  return {
    alias: 'skill-a',
    path: 'github.com/owner/repo/skill-a',
    sourcePath: '/pool/github.com/owner/repo/skill-a',
    sourceRel: 'github.com/owner/repo/skill-a',
    type: 'git',
    gitRoot: '/pool/github.com/owner/repo/skill-a',
    ...overrides,
  }
}

function makePlan(targets: RefreshTarget[]): RefreshPlan {
  return {
    deckPath: '/tmp/deck.toml',
    workdir: '/tmp',
    coldPool: '/pool',
    targets,
    allDeclared: targets.map(t => ({ alias: t.alias, path: t.path, type: 'tool' as const })),
  }
}

describe('executeRefreshPlan', () => {
  test('git up-to-date: reports correctly, does not call linkDeck', () => {
    const plan = makePlan([makeTarget()])
    const logs: string[] = []
    let linkCalled = false

    const results = executeRefreshPlan(plan, {
      gitPull: () => ({ status: 'up-to-date', message: 'Already up to date.' }),
      log: (msg) => logs.push(msg),
      linkDeck: () => { linkCalled = true },
    })

    expect(results).toHaveLength(1)
    expect(results[0].status).toBe('up-to-date')
    expect(logs.some(l => l.includes('Up-to-date: 1'))).toBe(true)
    expect(linkCalled).toBe(false)
  })

  test('git updated: triggers linkDeck', () => {
    const plan = makePlan([makeTarget()])
    let linkCalled = false

    const results = executeRefreshPlan(plan, {
      gitPull: () => ({ status: 'updated', message: 'Fast-forward' }),
      log: () => {},
      linkDeck: () => { linkCalled = true },
    })

    expect(results[0].status).toBe('updated')
    expect(linkCalled).toBe(true)
  })

  test('git failed: reports failed, does not call linkDeck', () => {
    const plan = makePlan([makeTarget()])
    let linkCalled = false

    const results = executeRefreshPlan(plan, {
      gitPull: () => ({ status: 'failed', message: 'connection refused' }),
      log: () => {},
      linkDeck: () => { linkCalled = true },
    })

    expect(results[0].status).toBe('failed')
    expect(linkCalled).toBe(false)
  })

  test('localhost: skipped with user-managed message', () => {
    const plan = makePlan([makeTarget({ type: 'localhost', gitRoot: undefined })])

    const results = executeRefreshPlan(plan, { log: () => {} })

    expect(results[0].status).toBe('skipped')
    expect(results[0].message).toContain('localhost')
    expect(results[0].message).toContain('user-managed')
  })

  test('not-git: skipped with not-a-git-repository message', () => {
    const plan = makePlan([makeTarget({ type: 'not-git', gitRoot: undefined })])

    const results = executeRefreshPlan(plan, { log: () => {} })

    expect(results[0].status).toBe('not-git')
    expect(results[0].message).toContain('not a git repository')
  })

  test('missing: failed with not-found message', () => {
    const plan = makePlan([makeTarget({ type: 'missing', gitRoot: undefined, sourcePath: '' })])

    const results = executeRefreshPlan(plan, { log: () => {} })

    expect(results[0].status).toBe('failed')
    expect(results[0].message).toContain('not found')
  })

  test('multiple targets: counts each status', () => {
    const logs: string[] = []
    const plan = makePlan([
      makeTarget({ alias: 'up', type: 'git', gitRoot: '/pool/a' }),
      makeTarget({ alias: 'updated', type: 'git', gitRoot: '/pool/b' }),
      makeTarget({ alias: 'local', type: 'localhost', gitRoot: undefined }),
      makeTarget({ alias: 'nogit', type: 'not-git', gitRoot: undefined }),
    ])

    const results = executeRefreshPlan(plan, {
      gitPull: (dir) => {
        if (dir === '/pool/b') return { status: 'updated', message: 'Fast-forward' }
        return { status: 'up-to-date', message: 'Already up to date.' }
      },
      log: (msg) => logs.push(msg),
    })

    expect(results).toHaveLength(4)
    expect(logs.some(l => l.includes('Updated: 1') && l.includes('Up-to-date: 1') && l.includes('Skipped: 2'))).toBe(true)
  })

  test('single target in plan ≠ allDeclared → reports "single skill" scope', () => {
    const plan = makePlan([makeTarget()])
    plan.allDeclared = [
      { alias: 'skill-a', path: 'github.com/owner/repo/skill-a', type: 'tool' },
      { alias: 'skill-b', path: 'github.com/owner/repo/skill-b', type: 'tool' },
    ]
    const logs: string[] = []

    executeRefreshPlan(plan, {
      gitPull: () => ({ status: 'up-to-date', message: 'ok' }),
      log: (msg) => logs.push(msg),
    })

    expect(logs.some(l => l.includes('single skill'))).toBe(true)
  })
})
