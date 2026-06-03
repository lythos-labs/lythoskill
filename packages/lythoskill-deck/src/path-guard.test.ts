import { describe, expect, test } from 'bun:test'
import { validateAlias, validatePathSegment, isPathInsideRoot, validateWorkingSet } from './path-guard.js'

// ── validateAlias ──────────────────────────────────────────────

describe('validateAlias', () => {
  test('accepts simple alphanumeric', () => {
    expect(validateAlias('tdd')).toBe('tdd')
    expect(validateAlias('my-skill')).toBe('my-skill')
    expect(validateAlias('skill_v2')).toBe('skill_v2')
    expect(validateAlias('A-B-C')).toBe('A-B-C')
  })

  test('accepts max-length alias', () => {
    const long = 'a'.repeat(128)
    expect(validateAlias(long)).toBe(long)
  })

  test('rejects empty', () => {
    expect(() => validateAlias('')).toThrow('must not be empty')
  })

  test('rejects too long', () => {
    const long = 'a'.repeat(129)
    expect(() => validateAlias(long)).toThrow('too long')
  })

  test('rejects dots', () => {
    expect(() => validateAlias('skill.name')).toThrow('Invalid alias')
  })

  test('rejects slashes (path traversal)', () => {
    expect(() => validateAlias('../etc')).toThrow('Invalid alias')
    expect(() => validateAlias('a/b')).toThrow('Invalid alias')
  })

  test('rejects backslashes', () => {
    expect(() => validateAlias('a\\b')).toThrow('Invalid alias')
  })

  test('rejects special characters', () => {
    expect(() => validateAlias('skill!')).toThrow('Invalid alias')
    expect(() => validateAlias('skill$')).toThrow('Invalid alias')
  })
})

// ── validatePathSegment ─────────────────────────────────────────

describe('validatePathSegment', () => {
  test('accepts normal segments', () => {
    expect(() => validatePathSegment('skill-dir')).not.toThrow()
    expect(() => validatePathSegment('foo/bar/baz')).not.toThrow()
    expect(() => validatePathSegment('.hidden-dir')).not.toThrow()
  })

  test('rejects null byte', () => {
    expect(() => validatePathSegment('foo\0bar')).toThrow('null byte')
  })

  test('rejects parent traversal', () => {
    expect(() => validatePathSegment('..')).toThrow('parent traversal')
    expect(() => validatePathSegment('../etc')).toThrow('parent traversal')
    expect(() => validatePathSegment('foo/../../bar')).toThrow('parent traversal')
  })

  test('rejects absolute path', () => {
    expect(() => validatePathSegment('/etc/passwd')).toThrow('absolute')
  })

  test('rejects Windows absolute path', () => {
    expect(() => validatePathSegment('C:\\Windows')).toThrow('absolute')
  })
})

// ── isPathInsideRoot ────────────────────────────────────────────

describe('isPathInsideRoot', () => {
  test('path under root is inside', () => {
    expect(isPathInsideRoot('/root/sub', '/root')).toBe(true)
    expect(isPathInsideRoot('/a/b/c/d', '/a')).toBe(true)
  })

  test('path equal to root is inside', () => {
    expect(isPathInsideRoot('/root', '/root')).toBe(true)
  })

  test('path outside root is blocked', () => {
    expect(isPathInsideRoot('/other', '/root')).toBe(false)
  })

  test('path that is prefix but not ancestor is blocked', () => {
    expect(isPathInsideRoot('/root-other/sub', '/root')).toBe(false)
    expect(isPathInsideRoot('/ro', '/root')).toBe(false)
  })
})

// ── validateWorkingSet ──────────────────────────────────────────
// Uses absolute paths because validateWorkingSet resolves against cwd.
// Key rules:
//   1. Inside project dir → accepted
//   2. Outside project but basename starts with '.' → accepted (agent convention)
//   3. Outside project and basename doesn't start with '.' → rejected
//   4. Forbidden system paths → always rejected

describe('validateWorkingSet', () => {
  test('rejects forbidden system root /', () => {
    expect(() => validateWorkingSet('/', '/home/user/project')).toThrow('forbidden system path')
  })

  test('rejects forbidden /etc', () => {
    expect(() => validateWorkingSet('/etc', '/home/user/project')).toThrow('forbidden system path')
  })

  test('rejects forbidden /usr', () => {
    expect(() => validateWorkingSet('/usr', '/home/user/project')).toThrow('forbidden system path')
  })

  test('rejects forbidden /tmp', () => {
    expect(() => validateWorkingSet('/tmp', '/home/user/project')).toThrow('forbidden system path')
  })

  test('rejects non-hidden dir outside project', () => {
    // validateWorkingSet resolves against cwd, so use an absolute path
    // where the last segment doesn't start with '.' and is outside any project
    expect(() => validateWorkingSet('/tmp/my-skills', '/home/user/project')).toThrow('not a hidden directory')
  })
})
