import { describe, expect, test } from 'bun:test'
import { formatLocator, parseLocator } from './parse-locator'

describe('parseLocator — accepted forms', () => {
  test('host.tld/owner/repo/skill (monorepo)', () => {
    const loc = parseLocator('github.com/anthropics/skills/skills/pdf')
    expect(loc).toEqual({
      raw: 'github.com/anthropics/skills/skills/pdf',
      host: 'github.com',
      owner: 'anthropics',
      repo: 'skills',
      skill: 'skills/pdf',
      isLocalhost: false,
    })
  })

  test('host.tld/owner/repo/skill (nested skill subpath)', () => {
    const loc = parseLocator('github.com/mattpocock/skills/skills/engineering/tdd')
    expect(loc?.skill).toBe('skills/engineering/tdd')
    expect(loc?.repo).toBe('skills')
  })

  test('host.tld/owner/repo/skill (flat repo, single skill segment)', () => {
    const loc = parseLocator('github.com/daymade/claude-code-skills/skill-creator')
    expect(loc?.skill).toBe('skill-creator')
    expect(loc?.repo).toBe('claude-code-skills')
  })

  test('host.tld/owner/repo (standalone — skill = null)', () => {
    const loc = parseLocator('github.com/SpillwaveSolutions/design-doc-mermaid')
    expect(loc).toEqual({
      raw: 'github.com/SpillwaveSolutions/design-doc-mermaid',
      host: 'github.com',
      owner: 'SpillwaveSolutions',
      repo: 'design-doc-mermaid',
      skill: null,
      isLocalhost: false,
    })
  })

  test('host.tld/owner/repo/skill (arbitrary subdir name)', () => {
    const loc = parseLocator('github.com/Cocoon-AI/architecture-diagram-generator/architecture-diagram')
    expect(loc?.skill).toBe('architecture-diagram')
  })

  test('localhost/<name>', () => {
    const loc = parseLocator('localhost/my-skill')
    expect(loc).toEqual({
      raw: 'localhost/my-skill',
      host: 'localhost',
      owner: null,
      repo: null,
      skill: 'my-skill',
      isLocalhost: true,
    })
  })

  test('non-github host accepted', () => {
    const loc = parseLocator('gitlab.com/owner/repo/skill-x')
    expect(loc?.host).toBe('gitlab.com')
    expect(loc?.skill).toBe('skill-x')
  })

  test('input is trimmed', () => {
    const loc = parseLocator('  github.com/owner/repo  ')
    expect(loc?.repo).toBe('repo')
  })
})

describe('parseLocator — rejected forms (per ADR-20260502012643244 FQ-only)', () => {
  test('empty string', () => {
    expect(parseLocator('')).toBeNull()
    expect(parseLocator('   ')).toBeNull()
  })

  test('single segment', () => {
    expect(parseLocator('my-skill')).toBeNull()
  })

  test('bare owner/repo (no host) is rejected — must be FQ', () => {
    expect(parseLocator('daymade/claude-code-skills')).toBeNull()
    expect(parseLocator('owner/repo/skill')).toBeNull()
  })

  test('host without dot is treated as bare', () => {
    expect(parseLocator('foo/bar/baz')).toBeNull()
  })

  test('host.tld/owner without repo segment', () => {
    expect(parseLocator('github.com/owner')).toBeNull()
  })

  test('localhost with extra path segments', () => {
    expect(parseLocator('localhost/my/skill')).toBeNull()
    expect(parseLocator('localhost')).toBeNull()
  })
})

describe('formatLocator — round-trips', () => {
  test.each([
    'github.com/anthropics/skills/skills/pdf',
    'github.com/SpillwaveSolutions/design-doc-mermaid',
    'github.com/mattpocock/skills/skills/engineering/tdd',
    'localhost/my-skill',
  ])('round-trip: %s', (raw) => {
    const parsed = parseLocator(raw)!
    expect(formatLocator(parsed)).toBe(raw)
  })
})
