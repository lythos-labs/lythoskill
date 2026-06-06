import { describe, expect, it } from 'bun:test'
import { formatLocator, parseLocator } from './parse-locator'

describe('parseLocator — accepted forms', () => {
  it('host.tld/owner/repo/skill (monorepo)', () => {
    const loc = parseLocator('github.com/anthropics/skills/skills/pdf')
    expect(loc).toEqual({
      raw: 'github.com/anthropics/skills/skills/pdf',
      host: 'github.com',
      owner: 'anthropics',
      repo: 'skills',
      skill: 'skills/pdf',
      isLocalhost: false,
      ref: null,
    })
  })

  it('host.tld/owner/repo/skill (nested skill subpath)', () => {
    const loc = parseLocator('github.com/mattpocock/skills/skills/engineering/tdd')
    expect(loc?.skill).toBe('skills/engineering/tdd')
    expect(loc?.repo).toBe('skills')
  })

  it('host.tld/owner/repo/skill (flat repo, single skill segment)', () => {
    const loc = parseLocator('github.com/daymade/claude-code-skills/skill-creator')
    expect(loc?.skill).toBe('skill-creator')
    expect(loc?.repo).toBe('claude-code-skills')
  })

  it('host.tld/owner/repo (standalone — skill = null)', () => {
    const loc = parseLocator('github.com/SpillwaveSolutions/design-doc-mermaid')
    expect(loc).toEqual({
      raw: 'github.com/SpillwaveSolutions/design-doc-mermaid',
      host: 'github.com',
      owner: 'SpillwaveSolutions',
      repo: 'design-doc-mermaid',
      skill: null,
      isLocalhost: false,
      ref: null,
    })
  })

  it('host.tld/owner/repo/skill (arbitrary subdir name)', () => {
    const loc = parseLocator('github.com/Cocoon-AI/architecture-diagram-generator/architecture-diagram')
    expect(loc?.skill).toBe('architecture-diagram')
  })

  it('localhost/<owner>/<repo> (canonical local skill, same shape as remote)', () => {
    const loc = parseLocator('localhost/me/my-skill')
    expect(loc).toEqual({
      raw: 'localhost/me/my-skill',
      host: 'localhost',
      owner: 'me',
      repo: 'my-skill',
      skill: null,
      isLocalhost: true,
      ref: null,
    })
  })

  it('non-github host accepted', () => {
    const loc = parseLocator('gitlab.com/owner/repo/skill-x')
    expect(loc?.host).toBe('gitlab.com')
    expect(loc?.skill).toBe('skill-x')
  })

  it('input is trimmed', () => {
    const loc = parseLocator('  github.com/owner/repo  ')
    expect(loc?.repo).toBe('repo')
  })
})

describe('parseLocator — rejected forms (per ADR-20260502012643244 FQ-only)', () => {
  it('empty string', () => {
    expect(parseLocator('')).toBeNull()
    expect(parseLocator('   ')).toBeNull()
  })

  it('single segment', () => {
    expect(parseLocator('my-skill')).toBeNull()
  })

  it('bare owner/repo (no host) is rejected — must be FQ', () => {
    expect(parseLocator('daymade/claude-code-skills')).toBeNull()
    expect(parseLocator('owner/repo/skill')).toBeNull()
  })

  it('host without dot is treated as bare', () => {
    expect(parseLocator('foo/bar/baz')).toBeNull()
  })

  it('host.tld/owner without repo segment', () => {
    expect(parseLocator('github.com/owner')).toBeNull()
  })

  it('localhost with multi-segment path (skill subpath beyond owner/repo)', () => {
    const loc = parseLocator('localhost/me/skills/my-skill')
    expect(loc).toEqual({
      raw: 'localhost/me/skills/my-skill',
      host: 'localhost',
      owner: 'me',
      repo: 'skills',
      skill: 'my-skill',
      isLocalhost: true,
      ref: null,
    })
  })

  it('localhost alone (no owner/repo) is rejected', () => {
    expect(parseLocator('localhost')).toBeNull()
  })

  it('localhost/<name> (2 segments) is rejected — use localhost/me/<skill> for quick local form', () => {
    expect(parseLocator('localhost/my-skill')).toBeNull()
  })
})

describe('formatLocator — round-trips', () => {
  it.each([
    'github.com/anthropics/skills/skills/pdf',
    'github.com/SpillwaveSolutions/design-doc-mermaid',
    'github.com/mattpocock/skills/skills/engineering/tdd',
    'localhost/me/my-skill',
    'localhost/me/skills/inner-skill',
  ])('round-trip: %s', (raw) => {
    const parsed = parseLocator(raw)!
    expect(formatLocator(parsed)).toBe(raw)
  })
})
