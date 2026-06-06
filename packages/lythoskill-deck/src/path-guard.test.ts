import { describe, expect, it } from 'bun:test'
import { validateAlias, validatePathSegment, isPathInsideRoot, validateWorkingSet } from './path-guard.js'

// ── validateAlias ──────────────────────────────────────────────

describe('validateAlias', () => {
  it('accepts simple alphanumeric', () => {
    expect(validateAlias('tdd')).toBe('tdd')
    expect(validateAlias('my-skill')).toBe('my-skill')
    expect(validateAlias('skill_v2')).toBe('skill_v2')
    expect(validateAlias('A-B-C')).toBe('A-B-C')
  })

  it('accepts max-length alias', () => {
    const long = 'a'.repeat(128)
    expect(validateAlias(long)).toBe(long)
  })

  it('rejects empty string', () => {
    expect(() => validateAlias('')).toThrow('must not be empty')
  })

  it('throws on null (TypeScript guard)', () => {
    // validateAlias has a falsy guard: if (!alias ...) throw
    expect(() => validateAlias(null as unknown as string)).toThrow()
  })

  it('throws on undefined (TypeScript guard)', () => {
    expect(() => validateAlias(undefined as unknown as string)).toThrow()
  })

  it('rejects too long', () => {
    const long = 'a'.repeat(129)
    expect(() => validateAlias(long)).toThrow('too long')
  })

  it('rejects dots', () => {
    expect(() => validateAlias('skill.name')).toThrow('Invalid alias')
  })

  it('rejects slashes (path traversal)', () => {
    expect(() => validateAlias('../etc')).toThrow('Invalid alias')
    expect(() => validateAlias('a/b')).toThrow('Invalid alias')
  })

  it('rejects backslashes', () => {
    expect(() => validateAlias('a\\b')).toThrow('Invalid alias')
  })

  it('rejects special characters', () => {
    expect(() => validateAlias('skill!')).toThrow('Invalid alias')
    expect(() => validateAlias('skill$')).toThrow('Invalid alias')
  })
})

// ── validatePathSegment ─────────────────────────────────────────

describe('validatePathSegment', () => {
  it('accepts normal segments', () => {
    expect(() => validatePathSegment('skill-dir')).not.toThrow()
    expect(() => validatePathSegment('foo/bar/baz')).not.toThrow()
    expect(() => validatePathSegment('.hidden-dir')).not.toThrow()
  })

  it('rejects null byte', () => {
    expect(() => validatePathSegment('foo\0bar')).toThrow('null byte')
  })

  it('rejects parent traversal', () => {
    expect(() => validatePathSegment('..')).toThrow('parent traversal')
    expect(() => validatePathSegment('../etc')).toThrow('parent traversal')
    expect(() => validatePathSegment('foo/../../bar')).toThrow('parent traversal')
  })

  it('rejects absolute path', () => {
    expect(() => validatePathSegment('/etc/passwd')).toThrow('absolute')
  })

  it('rejects Windows absolute path', () => {
    expect(() => validatePathSegment('C:\\Windows')).toThrow('absolute')
  })
})

// ── isPathInsideRoot ────────────────────────────────────────────

describe('isPathInsideRoot', () => {
  it('path under root is inside', () => {
    expect(isPathInsideRoot('/root/sub', '/root')).toBe(true)
    expect(isPathInsideRoot('/a/b/c/d', '/a')).toBe(true)
  })

  it('path equal to root is inside', () => {
    expect(isPathInsideRoot('/root', '/root')).toBe(true)
  })

  it('path outside root is blocked', () => {
    expect(isPathInsideRoot('/other', '/root')).toBe(false)
  })

  it('path that is prefix but not ancestor is blocked', () => {
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
  const cwd = process.cwd()

  // ── Positive: should accept ──

  it('accepts working set under project dir', () => {
    // When working_set is under the project (resolved against cwd),
    // and cwd === project dir, it should pass.
    expect(() => validateWorkingSet('.claude/skills', cwd)).not.toThrow()
  })

  it('accepts working set as subdirectory of project', () => {
    // Must be a real subdirectory so resolve() produces <cwd>/subdir
    expect(() => validateWorkingSet('src', cwd)).not.toThrow()
  })

  // ── Negative: should reject ──

  it('rejects forbidden system root /', () => {
    expect(() => validateWorkingSet('/', '/home/user/project')).toThrow('forbidden system path')
  })

  it('rejects forbidden /etc', () => {
    expect(() => validateWorkingSet('/etc', '/home/user/project')).toThrow('forbidden system path')
  })

  it('rejects forbidden /usr', () => {
    expect(() => validateWorkingSet('/usr', '/home/user/project')).toThrow('forbidden system path')
  })

  it('rejects forbidden /tmp', () => {
    expect(() => validateWorkingSet('/tmp', '/home/user/project')).toThrow('forbidden system path')
  })

  it('rejects forbidden /home', () => {
    expect(() => validateWorkingSet('/home', cwd)).toThrow('forbidden system path')
  })

  it('accepts hidden directory outside project (agent convention)', () => {
    // Hidden-dir check: basename starts with '.' → allowed outside project.
    // Note: only checks the LAST segment. /tmp/.claude/skills would fail
    // (last segment = 'skills'). This is a known limitation — real-world
    // working_set values like '.claude/skills' are always inside the project
    // dir and pass via the project-dir check, not this branch.
    expect(() => validateWorkingSet('/tmp/.agents', '/home/user/project')).not.toThrow()
  })

  it('rejects non-hidden dir outside project', () => {
    expect(() => validateWorkingSet('/tmp/my-skills', '/home/user/project')).toThrow('not a hidden directory')
  })
})
