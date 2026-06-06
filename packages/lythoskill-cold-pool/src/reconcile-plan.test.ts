import { describe, expect, it, beforeEach, afterEach } from 'bun:test'
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ColdPool } from './cold-pool'
import { buildReconcilePlan, executeReconcilePlan, type ReconcileDesiredState } from './reconcile-plan'

function makePool(): { root: string; pool: ColdPool } {
  const root = mkdtempSync(join(tmpdir(), 'reconcile-test-'))
  const pool = new ColdPool(root)
  return { root, pool }
}

function seedRepo(root: string, host: string, owner: string, repo: string) {
  const dir = join(root, host, owner, repo)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'SKILL.md'), '# Test Skill')
  // Seed metadata with a fake HEAD ref
  return dir
}

describe('buildReconcilePlan — pure classification', () => {
  let root: string
  let pool: ColdPool

  beforeEach(() => {
    const p = makePool()
    root = p.root
    pool = p.pool
  })

  afterEach(() => {
    pool.metadata.close()
    rmSync(root, { recursive: true, force: true })
  })

  it('empty desired + empty cold pool → all empty', () => {
    const desired: ReconcileDesiredState = { deckPath: '/project/skill-deck.toml', skills: [] }
    const plan = buildReconcilePlan(pool, desired)
    expect(plan.missing).toEqual([])
    expect(plan.behind).toEqual([])
    expect(plan.extra).toEqual([])
  })

  it('desired skill missing from cold pool → reported as missing', () => {
    const desired: ReconcileDesiredState = {
      deckPath: '/project/skill-deck.toml',
      skills: [{ locator: 'github.com/lythos-labs/tdd', alias: 'tdd' }],
    }
    const plan = buildReconcilePlan(pool, desired)
    expect(plan.missing.length).toBe(1)
    expect(plan.missing[0].host).toBe('github.com')
    expect(plan.missing[0].owner).toBe('lythos-labs')
    expect(plan.missing[0].repo).toBe('tdd')
    expect(plan.missing[0].aliases).toEqual(['tdd'])
    expect(plan.behind).toEqual([])
    expect(plan.extra).toEqual([])
  })

  it('desired skill exists in cold pool with metadata → reported as behind', () => {
    seedRepo(root, 'github.com', 'owner', 'repo-a')
    pool.metadata.recordRepoRef('github.com', 'owner', 'repo-a', 'abc123def')

    const desired: ReconcileDesiredState = {
      deckPath: '/project/skill-deck.toml',
      skills: [{ locator: 'github.com/owner/repo-a', alias: 'skill-a' }],
    }
    const plan = buildReconcilePlan(pool, desired)
    expect(plan.missing).toEqual([])
    expect(plan.behind.length).toBe(1)
    expect(plan.behind[0].repo).toBe('repo-a')
    expect(plan.behind[0].reason).toContain('abc123d')
    expect(plan.extra).toEqual([])
  })

  it('desired skill exists but no metadata → not flagged (manual clone)', () => {
    seedRepo(root, 'github.com', 'owner', 'repo-b')

    const desired: ReconcileDesiredState = {
      deckPath: '/project/skill-deck.toml',
      skills: [{ locator: 'github.com/owner/repo-b', alias: 'skill-b' }],
    }
    const plan = buildReconcilePlan(pool, desired)
    expect(plan.missing).toEqual([])
    expect(plan.behind).toEqual([])
    expect(plan.extra).toEqual([])
  })

  it('monorepo skill path → extracts correct repo root', () => {
    seedRepo(root, 'github.com', 'owner', 'monorepo')
    pool.metadata.recordRepoRef('github.com', 'owner', 'monorepo', 'def456')

    const desired: ReconcileDesiredState = {
      deckPath: '/project/skill-deck.toml',
      skills: [{ locator: 'github.com/owner/monorepo/skills/foo', alias: 'foo' }],
    }
    const plan = buildReconcilePlan(pool, desired)
    expect(plan.missing).toEqual([])
    expect(plan.behind.length).toBe(1)
    expect(plan.behind[0].repo).toBe('monorepo')
  })

  it('extra repo in cold pool not in desired → reported as extra', () => {
    seedRepo(root, 'github.com', 'someone', 'orphan-repo')

    const desired: ReconcileDesiredState = {
      deckPath: '/project/skill-deck.toml',
      skills: [{ locator: 'github.com/owner/repo-a', alias: 'a' }],
    }
    const plan = buildReconcilePlan(pool, desired)
    expect(plan.missing.length).toBe(1) // repo-a is missing
    expect(plan.extra.length).toBe(1)
    expect(plan.extra[0].repo).toBe('orphan-repo')
  })

  it('multiple skills in same repo → single repo entry', () => {
    seedRepo(root, 'github.com', 'owner', 'shared-repo')
    pool.metadata.recordRepoRef('github.com', 'owner', 'shared-repo', 'ghi789')

    const desired: ReconcileDesiredState = {
      deckPath: '/project/skill-deck.toml',
      skills: [
        { locator: 'github.com/owner/shared-repo/skills/a', alias: 'alpha' },
        { locator: 'github.com/owner/shared-repo/skills/b', alias: 'beta' },
      ],
    }
    const plan = buildReconcilePlan(pool, desired)
    expect(plan.missing).toEqual([])
    expect(plan.behind.length).toBe(1)
    expect(plan.behind[0].aliases).toEqual(['alpha', 'beta'])
  })

  it('localhost skill in desired, exists in pool', () => {
    seedRepo(root, 'localhost', 'me', 'local-skill')

    const desired: ReconcileDesiredState = {
      deckPath: '/project/skill-deck.toml',
      skills: [{ locator: 'localhost/me/local-skill', alias: 'local' }],
    }
    const plan = buildReconcilePlan(pool, desired)
    // localhost: metadata not auto-recorded (user-managed), so no behind
    expect(plan.missing).toEqual([])
    expect(plan.behind).toEqual([])
    expect(plan.extra).toEqual([])
  })

  it('unrecognized locator format → reported as missing', () => {
    const desired: ReconcileDesiredState = {
      deckPath: '/project/skill-deck.toml',
      skills: [{ locator: 'bare-name', alias: 'bare' }],
    }
    const plan = buildReconcilePlan(pool, desired)
    expect(plan.missing.length).toBe(1)
    expect(plan.missing[0].reason).toContain('Unrecognized')
  })

  it('mixed: missing + behind + extra all populated', () => {
    // Seed two repos that exist
    seedRepo(root, 'github.com', 'owner', 'exists-behind')
    pool.metadata.recordRepoRef('github.com', 'owner', 'exists-behind', 'abc')
    seedRepo(root, 'github.com', 'owner', 'exists-clean')

    // Seed an orphan
    seedRepo(root, 'github.com', 'someone', 'orphan')

    const desired: ReconcileDesiredState = {
      deckPath: '/project/skill-deck.toml',
      skills: [
        { locator: 'github.com/owner/exists-behind', alias: 'behind' },
        { locator: 'github.com/owner/exists-clean', alias: 'clean' },
        { locator: 'github.com/owner/missing-repo', alias: 'missing' },
      ],
    }
    const plan = buildReconcilePlan(pool, desired)

    expect(plan.missing.length).toBe(1)
    expect(plan.missing[0].repo).toBe('missing-repo')

    expect(plan.behind.length).toBe(1)
    expect(plan.behind[0].repo).toBe('exists-behind')

    expect(plan.extra.length).toBe(1)
    expect(plan.extra[0].repo).toBe('orphan')
  })
})

describe('executeReconcilePlan — plan-first reporting', () => {
  it('empty plan → all zero count', () => {
    const results = executeReconcilePlan({ missing: [], behind: [], extra: [] })
    expect(results).toEqual([])
  })

  it('missing entry → failed status', () => {
    const plan = {
      missing: [{ host: 'github.com', owner: 'o', repo: 'r', repoPath: '/pool/github.com/o/r', reason: 'Not found', aliases: ['r'] }],
      behind: [],
      extra: [],
    }
    const results = executeReconcilePlan(plan)
    expect(results.length).toBe(1)
    expect(results[0].status).toBe('failed')
  })

  it('behind entry → skipped status', () => {
    const plan = {
      missing: [],
      behind: [{ host: 'github.com', owner: 'o', repo: 'r', repoPath: '/pool/github.com/o/r', reason: 'HEAD mismatch', aliases: ['r'] }],
      extra: [],
    }
    const results = executeReconcilePlan(plan)
    expect(results[0].status).toBe('skipped')
  })

  it('extra entry → extra-reported status', () => {
    const plan = {
      missing: [],
      behind: [],
      extra: [{ host: 'github.com', owner: 'o', repo: 'r', repoPath: '/pool/github.com/o/r', reason: 'Orphan', aliases: [] }],
    }
    const results = executeReconcilePlan(plan)
    expect(results[0].status).toBe('extra-reported')
  })

  it('io.log captures output', () => {
    const lines: string[] = []
    const plan = {
      missing: [{ host: 'github.com', owner: 'o', repo: 'r', repoPath: '/p/github.com/o/r', reason: 'X', aliases: ['r'] }],
      behind: [],
      extra: [],
    }
    executeReconcilePlan(plan, { log: (m) => lines.push(m) })
    const report = lines.join('\n')
    expect(report).toContain('Missing: 1')
    expect(report).toContain('❌ Missing')
  })
})
