#!/usr/bin/env bun
/**
 * link.test.ts — unit tests for link.ts pure functions
 *
 * Run: bun test packages/lythoskill-deck/src/link.test.ts
 *
 * Co-located with src per ADR-20260503180000000 (curator-mind framework selection)
 * and the existing precedent in packages/lythoskill-curator/src/cli.test.ts.
 *
 * Tests use real fs in mkdtempSync sandboxes — no mocks. Each it() owns its own
 * tmpdir and afterEach cleans up to avoid cross-test state leakage.
 */

import { describe, it, expect, afterEach } from 'bun:test'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir, homedir } from 'node:os'

import { findDeckToml, expandHome, findSource } from './link.ts'

let cleanup: string[] = []

afterEach(() => {
  for (const dir of cleanup) {
    rmSync(dir, { recursive: true, force: true })
  }
  cleanup = []
})

function makeTmp(): string {
  const dir = mkdtempSync(join(tmpdir(), 'deck-link-'))
  cleanup.push(dir)
  return dir
}

function placeSkill(coldPool: string, relPath: string): string {
  const skillDir = join(coldPool, relPath)
  mkdirSync(skillDir, { recursive: true })
  writeFileSync(join(skillDir, 'SKILL.md'), '---\nname: fixture\n---\n')
  return skillDir
}

describe('findDeckToml', () => {
  it('returns absolute path when skill-deck.toml is present', () => {
    const dir = makeTmp()
    const tomlPath = join(dir, 'skill-deck.toml')
    writeFileSync(tomlPath, '[[skills]]\n')
    expect(findDeckToml(dir)).toBe(tomlPath)
  })

  it('returns null when skill-deck.toml is absent', () => {
    const dir = makeTmp()
    expect(findDeckToml(dir)).toBeNull()
  })
})

describe('expandHome', () => {
  it('expands ~/<path> to homedir-anchored absolute path', () => {
    expect(expandHome('~/foo/bar', '/anywhere')).toBe(join(homedir(), 'foo/bar'))
  })

  it('resolves relative paths against base', () => {
    expect(expandHome('foo/bar', '/some/base')).toBe(resolve('/some/base', 'foo/bar'))
  })
})

describe('findSource', () => {
  it('resolves fully-qualified host.tld/owner/repo/skill via cold-pool skills/ subdir', () => {
    const coldPool = makeTmp()
    const projectDir = makeTmp()
    const expected = placeSkill(coldPool, 'github.com/lythos-labs/lythoskill/skills/lythoskill-deck')
    const result = findSource('github.com/lythos-labs/lythoskill/lythoskill-deck', coldPool, projectDir)
    expect(result.path).toBe(expected)
  })

  it('resolves a direct cold-pool hit when name matches a top-level dir with SKILL.md', () => {
    const coldPool = makeTmp()
    const projectDir = makeTmp()
    const expected = placeSkill(coldPool, 'my-skill')
    const result = findSource('my-skill', coldPool, projectDir)
    expect(result.path).toBe(expected)
  })

  it('resolves a monorepo layout (repo/skill → coldPool/repo/skills/skill)', () => {
    const coldPool = makeTmp()
    const projectDir = makeTmp()
    const expected = placeSkill(coldPool, 'mono-repo/skills/inner-skill')
    const result = findSource('mono-repo/inner-skill', coldPool, projectDir)
    expect(result.path).toBe(expected)
  })

  it('falls back to projectDir/skills/<name> for project-local skills', () => {
    const coldPool = makeTmp()
    const projectDir = makeTmp()
    const expected = placeSkill(projectDir, 'skills/local-skill')
    const result = findSource('local-skill', coldPool, projectDir)
    expect(result.path).toBe(expected)
  })

  it('returns {path: null} when no strategy resolves the name', () => {
    const coldPool = makeTmp()
    const projectDir = makeTmp()
    const result = findSource('nonexistent-skill', coldPool, projectDir)
    expect(result.path).toBeNull()
    expect(result.error).toBeUndefined()
  })
})
