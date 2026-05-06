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

  test('localhost form', () => {
    const loc = parseLocator('localhost/my-skill')!
    expect(pool.resolveDir(loc)).toBe('/cold/localhost/my-skill')
  })
})

describe('ColdPool — fs-backed read accessors', () => {
  // Build a small fake cold pool on disk
  const root = mkdtempSync(join(tmpdir(), 'cold-pool-test-'))
  mkdirSync(join(root, 'github.com/owner/repo-a'), { recursive: true })
  mkdirSync(join(root, 'github.com/owner/repo-b'), { recursive: true })
  mkdirSync(join(root, 'localhost/skill-x'), { recursive: true })
  writeFileSync(join(root, 'localhost/skill-x/SKILL.md'), '# x')
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

  test('has() works for localhost form', () => {
    const loc = parseLocator('localhost/skill-x')!
    expect(pool.has(loc)).toBe(true)
  })

  test('list() enumerates host/owner/repo + localhost entries, skips hidden', () => {
    const entries = pool.list().sort()
    expect(entries).toEqual([
      join(root, 'github.com/owner/repo-a'),
      join(root, 'github.com/owner/repo-b'),
      join(root, 'localhost/skill-x'),
    ].sort())
  })

  test('list() returns [] when path does not exist', () => {
    const empty = new ColdPool('/no/such/path')
    expect(empty.list()).toEqual([])
  })
})
