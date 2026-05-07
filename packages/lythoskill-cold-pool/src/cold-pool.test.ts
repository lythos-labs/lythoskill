import { describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ColdPool, DEFAULT_COLD_POOL_PATH, buildListPlan, type DirEntry } from './cold-pool'
import { parseLocator } from './parse-locator'

function dir(relPath: string): DirEntry { return { relPath, isDirectory: true } }
function file(relPath: string): DirEntry { return { relPath, isDirectory: false } }

describe('ColdPool — constructor', () => {
  test('default path when none given', () => {
    const pool = new ColdPool()
    expect(pool.path).toBe(DEFAULT_COLD_POOL_PATH)
  })

  test('custom path is stored verbatim', () => {
    const pool = new ColdPool('/tmp/custom-pool')
    expect(pool.path).toBe('/tmp/custom-pool')
  })
})

describe('ColdPool.resolveDir — pure path computation', () => {
  const pool = new ColdPool('/cold')

  test('host/owner/repo', () => {
    const loc = parseLocator('github.com/anthropics/skills')!
    expect(pool.resolveDir(loc)).toBe('/cold/github.com/anthropics/skills')
  })

  test('host/owner/repo/skill — skill subpath does NOT extend the dir', () => {
    // resolveDir returns repo dir, not skill dir. Skill subpath is for findSkillDir later.
    const loc = parseLocator('github.com/anthropics/skills/skills/pdf')!
    expect(pool.resolveDir(loc)).toBe('/cold/github.com/anthropics/skills')
  })

  test('localhost form — uniform <pool>/<host>/<owner>/<repo>, no special-case', () => {
    const loc = parseLocator('localhost/me/my-skill')!
    expect(pool.resolveDir(loc)).toBe('/cold/localhost/me/my-skill')
  })
})

describe('ColdPool — fs-backed read accessors', () => {
  // Build a small fake cold pool on disk per the uniform layout:
  // `<pool>/<host>/<owner>/<repo>/SKILL.md` for ALL hosts including localhost.
  // "Directory layers = FQ locator segments."
  const root = mkdtempSync(join(tmpdir(), 'cold-pool-test-'))
  mkdirSync(join(root, 'github.com/owner/repo-a'), { recursive: true })
  mkdirSync(join(root, 'github.com/owner/repo-b'), { recursive: true })
  mkdirSync(join(root, 'localhost/me/skill-x'), { recursive: true })
  writeFileSync(join(root, 'localhost/me/skill-x/SKILL.md'), '# x')
  // Hidden dir should be skipped
  mkdirSync(join(root, '.git'), { recursive: true })

  const pool = new ColdPool(root)

  test('has() returns true for existing repo', () => {
    const loc = parseLocator('github.com/owner/repo-a')!
    expect(pool.has(loc)).toBe(true)
  })

  test('has() returns false for missing repo', () => {
    const loc = parseLocator('github.com/owner/missing')!
    expect(pool.has(loc)).toBe(false)
  })

  test('has() works for localhost form (uniform <host>/<owner>/<repo>)', () => {
    const loc = parseLocator('localhost/me/skill-x')!
    expect(pool.has(loc)).toBe(true)
  })

  test('list() enumerates uniform host/owner/repo across all hosts, skips hidden', () => {
    const entries = pool.list().sort()
    expect(entries).toEqual([
      join(root, 'github.com/owner/repo-a'),
      join(root, 'github.com/owner/repo-b'),
      join(root, 'localhost/me/skill-x'),
    ].sort())
  })

  test('list() includes legacy drift entries (depth-2 SKILL.md, missing repo level) for cleanup awareness', () => {
    const driftRoot = mkdtempSync(join(tmpdir(), 'cold-pool-drift-'))
    mkdirSync(join(driftRoot, 'github.com/o/r'), { recursive: true })
    mkdirSync(join(driftRoot, 'localhost/me/canonical'), { recursive: true })
    // Legacy drift A: top-level dir with SKILL.md (post-compaction agent invention,
    // bare-name "skill-a" hack)
    mkdirSync(join(driftRoot, 'legacy-toplevel'), { recursive: true })
    writeFileSync(join(driftRoot, 'legacy-toplevel/SKILL.md'), '# legacy A')
    // Legacy drift B: <localhost>/<name>/SKILL.md (depth-2 missing repo level,
    // earlier `localhost/<name>` form before owner/repo became required)
    mkdirSync(join(driftRoot, 'localhost/legacy-name'), { recursive: true })
    writeFileSync(join(driftRoot, 'localhost/legacy-name/SKILL.md'), '# legacy B')

    const driftPool = new ColdPool(driftRoot)
    const entries = driftPool.list().sort()
    expect(entries).toContain(join(driftRoot, 'legacy-toplevel'))
    expect(entries).toContain(join(driftRoot, 'localhost/legacy-name'))
  })

  test('list() returns [] when path does not exist', () => {
    const empty = new ColdPool('/no/such/path')
    expect(empty.list()).toEqual([])
  })
})

describe('buildListPlan — pure classification (no IO)', () => {
  const root = '/pool'

  test('canonical 3-segment: host/owner/repo', () => {
    const entries: DirEntry[] = [
      dir('github.com'),
      dir('github.com/owner'),
      dir('github.com/owner/repo-a'),
    ]
    const plan = buildListPlan(root, entries)
    expect(plan.entries).toEqual([
      { path: '/pool/github.com/owner/repo-a', kind: 'canonical' },
    ])
  })

  test('skips hidden dirs', () => {
    const entries: DirEntry[] = [
      dir('.git'),
      dir('github.com'),
      dir('github.com/owner'),
      dir('github.com/owner/repo-a'),
      dir('github.com/owner/.DS_Store'),
    ]
    const plan = buildListPlan(root, entries)
    expect(plan.entries).toEqual([
      { path: '/pool/github.com/owner/repo-a', kind: 'canonical' },
    ])
  })

  test('legacy depth-1: host/SKILL.md (missing owner+repo)', () => {
    const entries: DirEntry[] = [
      dir('legacy-skill'),
      file('legacy-skill/SKILL.md'),
    ]
    const plan = buildListPlan(root, entries)
    expect(plan.entries).toEqual([
      { path: '/pool/legacy-skill', kind: 'legacy-depth1' },
    ])
  })

  test('legacy depth-2: localhost/name/SKILL.md (missing repo)', () => {
    const entries: DirEntry[] = [
      dir('localhost'),
      dir('localhost/legacy-name'),
      file('localhost/legacy-name/SKILL.md'),
    ]
    const plan = buildListPlan(root, entries)
    expect(plan.entries).toEqual([
      { path: '/pool/localhost/legacy-name', kind: 'legacy-depth2' },
    ])
  })

  test('mixed canonical + legacy in same pool', () => {
    const entries: DirEntry[] = [
      dir('github.com'),
      dir('github.com/owner'),
      dir('github.com/owner/repo-a'),
      dir('localhost'),
      dir('localhost/old-skill'),
      file('localhost/old-skill/SKILL.md'),
    ]
    const plan = buildListPlan(root, entries)
    expect(plan.entries).toHaveLength(2)
    expect(plan.entries).toContainEqual({ path: '/pool/github.com/owner/repo-a', kind: 'canonical' })
    expect(plan.entries).toContainEqual({ path: '/pool/localhost/old-skill', kind: 'legacy-depth2' })
  })

  test('multiple repos under same owner', () => {
    const entries: DirEntry[] = [
      dir('github.com'),
      dir('github.com/owner'),
      dir('github.com/owner/repo-a'),
      dir('github.com/owner/repo-b'),
      dir('github.com/owner/repo-c'),
    ]
    const plan = buildListPlan(root, entries)
    expect(plan.entries).toHaveLength(3)
    expect(plan.entries.every(e => e.kind === 'canonical')).toBe(true)
  })

  test('multiple hosts', () => {
    const entries: DirEntry[] = [
      dir('github.com'),
      dir('github.com/a'),
      dir('github.com/a/r1'),
      dir('gitlab.com'),
      dir('gitlab.com/b'),
      dir('gitlab.com/b/r2'),
    ]
    const plan = buildListPlan(root, entries)
    expect(plan.entries).toHaveLength(2)
    expect(plan.entries.map(e => e.path).sort()).toEqual([
      '/pool/github.com/a/r1',
      '/pool/gitlab.com/b/r2',
    ])
  })

  test('returns empty when root has no entries', () => {
    expect(buildListPlan(root, []).entries).toEqual([])
  })

  test('returns empty for hidden-only entries', () => {
    const entries: DirEntry[] = [dir('.git'), dir('.hidden/.nested')]
    expect(buildListPlan(root, entries).entries).toEqual([])
  })
})

describe('ColdPool.metadata — MetadataDB integration', () => {
  const root = mkdtempSync(join(tmpdir(), 'cold-pool-meta-test-'))
  const pool = new ColdPool(root)

  test('metadata is auto-created on first access (lazy-open)', () => {
    expect(pool.metadata).toBeDefined()
    // Lazy-open: DB file is NOT created until first method call.
    expect(existsSync(join(root, '.cold-pool-meta.db'))).toBe(false)
    // Trigger open with a no-op read.
    pool.metadata.getRepoRef('github.com', 'nonexistent', 'repo')
    expect(existsSync(join(root, '.cold-pool-meta.db'))).toBe(true)
  })

  test('metadata records survive round-trip', () => {
    pool.metadata.recordRepoRef('github.com', 'lythos-labs', 'lythoskill', '9645fdb')
    expect(pool.metadata.getRepoRef('github.com', 'lythos-labs', 'lythoskill')).toBe('9645fdb')
  })
})
