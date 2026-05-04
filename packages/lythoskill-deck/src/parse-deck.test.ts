#!/usr/bin/env bun
/**
 * parse-deck.test.ts — unit tests for parse-deck.ts
 *
 * Run: bun test packages/lythoskill-deck/src/parse-deck.test.ts
 */

import { describe, it, expect } from 'bun:test'
import { parseDeck } from './parse-deck.ts'

describe('parseDeck', () => {
  it('parses dict format entries', () => {
    const raw = `[tool.skills.foo]\npath = "github.com/owner/repo"\n`
    const result = parseDeck(raw)
    expect(result.entries).toHaveLength(1)
    expect(result.entries[0].alias).toBe('foo')
    expect(result.entries[0].path).toBe('github.com/owner/repo')
    expect(result.entries[0].type).toBe('tool')
    expect(result.deprecated).toBe(false)
    expect(result.errors).toHaveLength(0)
  })

  it('errors when dict entry lacks path', () => {
    const raw = `[tool.skills.foo]\nname = "foo"\n`
    const result = parseDeck(raw)
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors[0]).toContain('Missing path')
  })

  it('errors when dict entry has invalid schema', () => {
    const raw = `[tool.skills.foo]\npath = ""\n`
    const result = parseDeck(raw)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('parses legacy string-array format and marks deprecated', () => {
    const raw = `[tool]\nskills = ["github.com/owner/repo"]\n`
    const result = parseDeck(raw)
    expect(result.deprecated).toBe(true)
    expect(result.entries).toHaveLength(1)
    expect(result.entries[0].alias).toBe('repo')
    expect(result.entries[0].path).toBe('github.com/owner/repo')
    expect(result.entries[0].type).toBe('tool')
  })

  it('returns empty for deck with no skill sections', () => {
    const raw = `[deck]\nmax_cards = 10\n`
    const result = parseDeck(raw)
    expect(result.entries).toHaveLength(0)
    expect(result.deprecated).toBe(false)
    expect(result.errors).toHaveLength(0)
  })
})
