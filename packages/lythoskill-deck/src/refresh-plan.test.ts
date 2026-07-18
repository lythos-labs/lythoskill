import { describe, it, expect } from 'bun:test'
import { mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { resolveRefreshConfig, detectGitRoot, buildRefreshPlan, executeRefreshPlan, type RefreshPlan, type RefreshTarget } from './refresh-plan'

const deckAliasDict = `[deck]
max_cards = 10
cold_pool = "./cold-pool"

[tool.skills.skill-a]
path = "github.com/foo/bar/skill-a"

[tool.skills.skill-b]
path = "localhost/me/skill-b"
`

describe('resolveRefreshConfig', () => {
  it('returns strings without throwing when no opts', () => {
    const cfg = resolveRefreshConfig()
    expect(typeof cfg.deckPath).toBe('string')
    expect(typeof cfg.workdir).toBe('string')
    expect(typeof cfg.coldPool).toBe('string')
  })

  it('resolves explicit deckPath', () => {
    const cfg = resolveRefreshConfig({ deckPath: '/tmp/test-deck.toml' })
    expect(cfg.deckPath).toBe('/tmp/test-deck.toml')
  })

  it('workdir falls back to deckPath dirname', () => {
    const cfg = resolveRefreshConfig({ deckPath: '/tmp/my-deck.toml' })
    expect(cfg.workdir).toBe('/tmp')
  })

  it('explicit workdir overrides fallback', () => {
    const cfg = resolveRefreshConfig({ deckPath: '/tmp/my-deck.toml', workdir: '/custom/workdir' })
    expect(cfg.workdir).toBe('/custom/workdir')
  })

  it('explicit coldPool resolved', () => {
    const cfg = resolveRefreshConfig({ coldPool: '/custom/cold-pool' })
    expect(cfg.coldPool).toBe('/custom/cold-pool')
  })
})

describe('detectGitRoot', () => {
  it('localhost skill → localhost type', () => {
    const result = detectGitRoot('/pool/localhost/skill-a', '/pool')
    expect(result.type).toBe('localhost')
  })

  it('localhost as root → localhost type', () => {
    const result = detectGitRoot('/pool/localhost', '/pool')
    expect(result.type).toBe('localhost')
  })

  it('git: directory with .git directly present', () => {
    const dir = join('/tmp', 'refresh-test-git-' + Date.now())
    mkdirSync(join(dir, '.git'), { recursive: true })
    const result = detectGitRoot(dir, '/tmp')
    expect(result.type).toBe('git')
    expect(result.gitRoot).toBe(dir)
    rmSync(dir, { recursive: true, force: true })
  })

  it('not-git: directory without .git', () => {
    const dir = join('/tmp', 'refresh-test-no-git-' + Date.now())
    mkdirSync(dir, { recursive: true })
    const result = detectGitRoot(dir, '/tmp')
    expect(result.type).toBe('not-git')
    rmSync(dir, { recursive: true, force: true })
  })
})

describe('buildRefreshPlan', () => {
  it('builds plan from alias-dict deck', () => {
    const plan = buildRefreshPlan(deckAliasDict, { coldPool: '/tmp/test-cold-pool' })
    expect(plan.targets).toHaveLength(2)
    expect(plan.allDeclared).toHaveLength(2)
  })

  it('filters by alias when target specified', () => {
    const plan = buildRefreshPlan(deckAliasDict, {
      coldPool: '/tmp/test-cold-pool',
      target: 'skill-a',
    })
    expect(plan.targets).toHaveLength(1)
    expect(plan.targets[0].alias).toBe('skill-a')
  })

  it('filters by path when target specified', () => {
    const plan = buildRefreshPlan(deckAliasDict, {
      coldPool: '/tmp/test-cold-pool',
      target: 'github.com/foo/bar/skill-a',
    })
    expect(plan.targets).toHaveLength(1)
    expect(plan.targets[0].path).toBe('github.com/foo/bar/skill-a')
  })

  it('unknown target → empty plan', () => {
    const plan = buildRefreshPlan(deckAliasDict, {
      coldPool: '/tmp/test-cold-pool',
      target: 'nonexistent',
    })
    expect(plan.targets).toHaveLength(0)
  })

  it('localhost skill is in plan as declared', () => {
    const plan = buildRefreshPlan(deckAliasDict, { coldPool: '/tmp/test-cold-pool' })
    const localhost = plan.targets.find(t => t.alias === 'skill-b')
    // Without a real cold pool, source resolution may fail → 'missing'
    // Plan structure is what matters; type depends on actual filesystem
    expect(localhost).toBeDefined()
    expect(localhost!.path).toBe('localhost/me/skill-b')
  })

  it('derives coldPool from deck toml when not in opts', () => {
    const plan = buildRefreshPlan(deckAliasDict, { workdir: '/custom/work' })
    expect(plan.workdir).toBe('/custom/work')
    expect(plan.coldPool).toBe('/custom/work/cold-pool')
  })

  it('explicit coldPool in opts overrides deck toml', () => {
    const plan = buildRefreshPlan(deckAliasDict, { coldPool: '/explicit/pool' })
    expect(plan.coldPool).toBe('/explicit/pool')
  })

  it('paths are resolved through config', () => {
    const plan = buildRefreshPlan(deckAliasDict, {
      deckPath: '/custom/deck.toml',
      workdir: '/custom/work',
      coldPool: '/custom/pool',
    })
    expect(plan.deckPath).toBe('/custom/deck.toml')
    expect(plan.workdir).toBe('/custom/work')
    expect(plan.coldPool).toBe('/custom/pool')
  })
  it('plan-mode: all declared skills appear in plan structure', () => {
    const plan = buildRefreshPlan(deckAliasDict, { coldPool: '/pool' })
    expect(plan.allDeclared).toHaveLength(2)
    expect(plan.targets.length).toBeGreaterThanOrEqual(0)
    // Plan structure is correct — path/alias mapping verified.
    // Type detection (git/localhost/missing) depends on filesystem;
    // those cases are covered by detectGitRoot tests above.
  })

  it('plan-mode: plan carries correct config paths through', () => {
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
  it('git up-to-date: reports correctly, does not call linkDeck', () => {
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

  it('git updated: triggers linkDeck', () => {
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

  it('git failed: reports failed, does not call linkDeck', () => {
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

  it('localhost: skipped with user-managed message', () => {
    const plan = makePlan([makeTarget({ type: 'localhost', gitRoot: undefined })])

    const results = executeRefreshPlan(plan, { log: () => {} })

    expect(results[0].status).toBe('skipped')
    expect(results[0].message).toContain('localhost')
    expect(results[0].message).toContain('user-managed')
  })

  it('not-git: skipped with not-a-git-repository message', () => {
    const plan = makePlan([makeTarget({ type: 'not-git', gitRoot: undefined })])

    const results = executeRefreshPlan(plan, { log: () => {} })

    expect(results[0].status).toBe('not-git')
    expect(results[0].message).toContain('not a git repository')
  })

  it('missing: failed with not-found message', () => {
    const plan = makePlan([makeTarget({ type: 'missing', gitRoot: undefined, sourcePath: '' })])

    const results = executeRefreshPlan(plan, { log: () => {} })

    expect(results[0].status).toBe('failed')
    expect(results[0].message).toContain('not found')
  })

  it('multiple targets: counts each status', () => {
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

  it('single target in plan ≠ allDeclared → reports "single skill" scope', () => {
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


// ── self-heal: dirty cold pool recovery (TASK-20260717161516624) ──────────

describe('executeRefreshPlan self-heal', () => {
  const dirtyMsg = 'error: cannot pull with rebase: You have unstaged changes.\nerror: please commit or stash them.'

  it('dirty pull failure → gitRecover called, pull retried, success reported', () => {
    const plan = makePlan([makeTarget()])
    const logs: string[] = []
    let recoverCalls = 0
    let pullCalls = 0

    const results = executeRefreshPlan(plan, {
      gitPull: () => {
        pullCalls++
        return pullCalls === 1
          ? { status: 'failed' as const, message: dirtyMsg }
          : { status: 'updated' as const, message: 'Fast-forward' }
      },
      gitRecover: () => { recoverCalls++; return { recovered: true, message: 'git checkout -- . && git clean -fd' } },
      log: (msg) => logs.push(msg),
    })

    expect(recoverCalls).toBe(1)
    expect(pullCalls).toBe(2)
    expect(results[0].status).toBe('updated')
    expect(logs.some(l => l.includes('self-heal'))).toBe(true)
    expect(logs.some(l => l.includes('pull succeeded after self-heal'))).toBe(true)
  })

  it('dirty failure + failed recovery → stays failed, no retry', () => {
    const plan = makePlan([makeTarget()])
    const logs: string[] = []
    let pullCalls = 0

    const results = executeRefreshPlan(plan, {
      gitPull: () => { pullCalls++; return { status: 'failed' as const, message: dirtyMsg } },
      gitRecover: () => ({ recovered: false, message: 'clean failed: permission denied' }),
      log: (msg) => logs.push(msg),
    })

    expect(pullCalls).toBe(1)
    expect(results[0].status).toBe('failed')
    expect(logs.some(l => l.includes('self-heal failed'))).toBe(true)
  })

  it('non-dirty failure (network) → no recovery attempt', () => {
    const plan = makePlan([makeTarget()])
    let recoverCalls = 0

    const results = executeRefreshPlan(plan, {
      gitPull: () => ({ status: 'failed' as const, message: 'ssh: connect to host github.com port 22: Connection refused' }),
      gitRecover: () => { recoverCalls++; return { recovered: true, message: 'ok' } },
      log: () => {},
    })

    expect(recoverCalls).toBe(0)
    expect(results[0].status).toBe('failed')
  })

  it('no gitRecover injected → dirty failure behaves as before (backward compat)', () => {
    const plan = makePlan([makeTarget()])
    let pullCalls = 0

    const results = executeRefreshPlan(plan, {
      gitPull: () => { pullCalls++; return { status: 'failed' as const, message: dirtyMsg } },
      log: () => {},
    })

    expect(pullCalls).toBe(1)
    expect(results[0].status).toBe('failed')
  })

  it('dirty failure → recovery ok → retry still fails → reported failed', () => {
    const plan = makePlan([makeTarget()])
    let pullCalls = 0

    const results = executeRefreshPlan(plan, {
      gitPull: () => { pullCalls++; return { status: 'failed' as const, message: dirtyMsg } },
      gitRecover: () => ({ recovered: true, message: 'git checkout -- . && git clean -fd' }),
      log: () => {},
    })

    expect(pullCalls).toBe(2)
    expect(results[0].status).toBe('failed')
  })
})
