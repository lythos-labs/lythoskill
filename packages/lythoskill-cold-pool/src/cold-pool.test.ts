import { describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ColdPool, DEFAULT_COLD_POOL_PATH } from './cold-pool'
import { parseLocator } from './parse-locator'

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
