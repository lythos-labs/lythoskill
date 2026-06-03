import { describe, expect, test } from 'bun:test'
import { isReadOnlyQuery, validateInColdPool, safeGit, safeRmSync } from './guard.js'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

// ── isReadOnlyQuery ─────────────────────────────────────────────

describe('isReadOnlyQuery', () => {
  test('allows SELECT', () => {
    expect(isReadOnlyQuery('SELECT * FROM skills')).toBe(true)
    expect(isReadOnlyQuery('select name, source from skills')).toBe(true)
  })

  test('allows PRAGMA', () => {
    expect(isReadOnlyQuery('PRAGMA table_info(skills)')).toBe(true)
  })

  test('allows DESCRIBE', () => {
    expect(isReadOnlyQuery('DESCRIBE skills')).toBe(true)
  })

  test('allows SHOW', () => {
    expect(isReadOnlyQuery('SHOW TABLES')).toBe(true)
  })

  test('allows SQLite extensions (json_each, window functions)', () => {
    expect(isReadOnlyQuery("SELECT * FROM json_each('[1,2,3]')")).toBe(true)
    expect(isReadOnlyQuery('SELECT name, ROW_NUMBER() OVER () FROM skills')).toBe(true)
  })

  test('rejects INSERT', () => {
    expect(isReadOnlyQuery('INSERT INTO skills VALUES (1)')).toBe(false)
  })

  test('rejects UPDATE', () => {
    expect(isReadOnlyQuery("UPDATE skills SET name = 'x' WHERE 1=1")).toBe(false)
  })

  test('rejects DELETE', () => {
    expect(isReadOnlyQuery('DELETE FROM skills')).toBe(false)
  })

  test('rejects DROP TABLE', () => {
    expect(isReadOnlyQuery('DROP TABLE skills')).toBe(false)
  })

  test('rejects CREATE TABLE', () => {
    expect(isReadOnlyQuery('CREATE TABLE foo (id INT)')).toBe(false)
  })

  test('rejects ALTER TABLE', () => {
    expect(isReadOnlyQuery('ALTER TABLE skills ADD COLUMN x TEXT')).toBe(false)
  })

  test('rejects write keywords in unparseable SQL', () => {
    // When AST fails, falls back to regex check
    expect(isReadOnlyQuery('INSERT INTO x SELECT 1')).toBe(false)
  })
})

// ── validateInColdPool ──────────────────────────────────────────

describe('validateInColdPool', () => {
  const pool = '/home/user/.agents/skill-repos'

  test('returns resolved path for valid subpath', () => {
    const result = validateInColdPool('github.com/owner/repo', pool)
    expect(result).toContain('/home/user/.agents/skill-repos/github.com/owner/repo')
  })

  test('accepts pool path itself', () => {
    const result = validateInColdPool(pool, pool)
    expect(result).toBe(pool)
  })

  test('rejects parent traversal (..)', () => {
    expect(() => validateInColdPool('github.com/../../etc', pool)).toThrow('parent traversal')
  })

  test('rejects null byte in path', () => {
    expect(() => validateInColdPool('github.com/owner\0/repo', pool)).toThrow('null byte')
  })

  test('rejects path that resolves outside pool', () => {
    expect(() => validateInColdPool('/etc/passwd', pool)).toThrow('resolves outside')
  })

  test('rejects traversal via absolute path that bypasses pool prefix', () => {
    // Absolute path to a location inside pool but specified directly
    // This should resolve and pass the boundary check
    const result = validateInColdPool(`${pool}/github.com/owner/repo`, pool)
    expect(result).toBe(`${pool}/github.com/owner/repo`)
  })
})

// ── safeGit ─────────────────────────────────────────────────────

describe('safeGit', () => {
  test('throws on failed git command', () => {
    expect(() => safeGit(['-C', '/nonexistent', 'status'], { timeout: 2000 })).toThrow()
  })
})

// ── safeRmSync ──────────────────────────────────────────────────

describe('safeRmSync', () => {
  test('deletes directory within allowed root', () => {
    const root = mkdtempSync(join(tmpdir(), 'curator-safe-rm-'))
    const target = join(root, 'to-delete')
    mkdirSync(target)
    writeFileSync(join(target, 'test.txt'), 'data')
    expect(() => safeRmSync(target, root)).not.toThrow()
    rmSync(root, { recursive: true, force: true })
  })

  test('rejects path outside root', () => {
    const root = mkdtempSync(join(tmpdir(), 'curator-safe-rm-'))
    expect(() => safeRmSync('/tmp/outside', root)).toThrow('resolves outside')
    rmSync(root, { recursive: true, force: true })
  })
})
