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
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, lstatSync, readlinkSync, readdirSync, existsSync, symlinkSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir, homedir } from 'node:os'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'

import { findDeckToml, expandHome, findSource, linkDeck } from './link.ts'

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
  it('resolves FQ host.tld/owner/repo/skill via cold-pool direct path', () => {
    const coldPool = makeTmp()
    const projectDir = makeTmp()
    const expected = placeSkill(coldPool, 'github.com/lythos-labs/lythoskill/skills/lythoskill-deck')
    const result = findSource('github.com/lythos-labs/lythoskill/skills/lythoskill-deck', coldPool, projectDir)
    expect(result.path).toBe(expected)
  })

  it('resolves FQ standalone host.tld/owner/repo (skill = null) via repo-root SKILL.md', () => {
    const coldPool = makeTmp()
    const projectDir = makeTmp()
    const expected = placeSkill(coldPool, 'github.com/owner/standalone')
    const result = findSource('github.com/owner/standalone', coldPool, projectDir)
    expect(result.path).toBe(expected)
  })

  it('resolves localhost/<name> via top-level dir convention', () => {
    const coldPool = makeTmp()
    const projectDir = makeTmp()
    const expected = placeSkill(coldPool, 'my-local-skill')
    const result = findSource('localhost/my-local-skill', coldPool, projectDir)
    expect(result.path).toBe(expected)
  })

  it('rejects bare names with FQ-only error (per ADR-20260502012643244)', () => {
    const coldPool = makeTmp()
    const projectDir = makeTmp()
    placeSkill(coldPool, 'my-skill') // even if a dir exists
    const result = findSource('my-skill', coldPool, projectDir)
    expect(result.path).toBeNull()
    expect(result.error).toBeDefined()
    expect(result.error).toContain('not FQ')
  })

  it('rejects shorthand owner/repo (no host) with FQ-only error', () => {
    const coldPool = makeTmp()
    const projectDir = makeTmp()
    const result = findSource('owner/repo', coldPool, projectDir)
    expect(result.path).toBeNull()
    expect(result.error).toBeDefined()
  })

  it('returns {path: null} when FQ locator is well-formed but path absent on disk', () => {
    const coldPool = makeTmp()
    const projectDir = makeTmp()
    const result = findSource('github.com/owner/missing-repo/skill', coldPool, projectDir)
    expect(result.path).toBeNull()
    expect(result.error).toBeUndefined()
  })
})

describe('linkDeck reconciler', () => {
  it('B1.tracer: empty deck creates working set and lock with zero skills', () => {
    const projectDir = makeTmp()
    const coldPoolRel = 'cold-pool'
    const coldPool = join(projectDir, coldPoolRel)
    mkdirSync(coldPool, { recursive: true })

    const deckContent = `[deck]\nmax_cards = 10\nworking_set = ".claude/skills"\ncold_pool = "${coldPoolRel}"\n`
    const deckPath = join(projectDir, 'skill-deck.toml')
    writeFileSync(deckPath, deckContent)

    linkDeck(deckPath, projectDir, true)

    const workingSet = join(projectDir, '.claude', 'skills')
    expect(existsSync(workingSet)).toBe(true)
    expect(lstatSync(workingSet).isDirectory()).toBe(true)

    const lockPath = join(projectDir, 'skill-deck.lock')
    expect(existsSync(lockPath)).toBe(true)

    const lock = JSON.parse(readFileSync(lockPath, 'utf-8'))
    expect(lock.version).toBe('1.0.0')
    expect(lock.skills).toEqual([])
    expect(lock.constraints.total_cards).toBe(0)
    expect(lock.constraints.max_cards).toBe(10)
    expect(lock.constraints.within_budget).toBe(true)
    expect(lock.working_set).toBe('.claude/skills')
    expect(lock.cold_pool).toBe(coldPoolRel)

    const expectedHash = createHash('sha256').update(deckContent).digest('hex')
    expect(lock.deck_source.content_hash).toBe(expectedHash)
    expect(lock.deck_source.path).toBe('skill-deck.toml')
  })

  it('B2: declared skill with existing cold pool creates correct symlink', () => {
    const projectDir = makeTmp()
    const coldPoolRel = 'cold-pool'
    const coldPool = join(projectDir, coldPoolRel)

    const skillDir = placeSkill(coldPool, 'github.com/owner/repo/skill')
    writeFileSync(
      join(skillDir, 'SKILL.md'),
      '---\nname: test-skill\ndeck_niche: testing\ndeck_managed_dirs: ["docs/"]\n---\n'
    )

    const deckContent = `[deck]\nmax_cards = 10\nworking_set = ".claude/skills"\ncold_pool = "${coldPoolRel}"\n\n[tool.skills.my-alias]\npath = "github.com/owner/repo/skill"\n`
    const deckPath = join(projectDir, 'skill-deck.toml')
    writeFileSync(deckPath, deckContent)

    linkDeck(deckPath, projectDir, true)

    const workingSet = join(projectDir, '.claude', 'skills')
    const symlinkPath = join(workingSet, 'my-alias')

    expect(existsSync(symlinkPath)).toBe(true)
    expect(lstatSync(symlinkPath).isSymbolicLink()).toBe(true)

    const target = readlinkSync(symlinkPath)
    expect(target).toBe(skillDir)

    const lock = JSON.parse(readFileSync(join(projectDir, 'skill-deck.lock'), 'utf-8'))
    expect(lock.skills).toHaveLength(1)

    const skill = lock.skills[0]
    expect(skill.name).toBe('github.com/owner/repo/skill')
    expect(skill.alias).toBe('my-alias')
    expect(skill.type).toBe('tool')
    expect(skill.source).toBe(join('github.com', 'owner', 'repo', 'skill'))
    expect(skill.dest).toBe(join('.claude', 'skills', 'my-alias'))
    expect(skill.content_hash).toMatch(/^[a-f0-9]{64}$/)
    expect(skill.deck_niche).toBe('testing')
    expect(skill.deck_managed_dirs).toEqual(['docs/'])
    expect(skill.linked_at).toBeDefined()
  })

  it('B2.b: idempotent re-run preserves symlink state', async () => {
    const projectDir = makeTmp()
    const coldPoolRel = 'cold-pool'
    const coldPool = join(projectDir, coldPoolRel)

    const skillDir = placeSkill(coldPool, 'github.com/owner/repo/skill')

    const deckContent = `[deck]\nmax_cards = 10\nworking_set = ".claude/skills"\ncold_pool = "${coldPoolRel}"\n\n[tool.skills.my-alias]\npath = "github.com/owner/repo/skill"\n`
    const deckPath = join(projectDir, 'skill-deck.toml')
    writeFileSync(deckPath, deckContent)

    linkDeck(deckPath, projectDir, true)

    const lock1 = JSON.parse(readFileSync(join(projectDir, 'skill-deck.lock'), 'utf-8'))
    const symlinkPath = join(projectDir, '.claude', 'skills', 'my-alias')
    const target1 = readlinkSync(symlinkPath)

    await new Promise(r => setTimeout(r, 50))

    linkDeck(deckPath, projectDir, true)

    const lock2 = JSON.parse(readFileSync(join(projectDir, 'skill-deck.lock'), 'utf-8'))
    const target2 = readlinkSync(symlinkPath)

    const entries = readdirSync(join(projectDir, '.claude', 'skills'))
      .filter(e => !e.startsWith('.') && !e.startsWith('_'))
    expect(entries).toHaveLength(1)
    expect(target2).toBe(target1)
    expect(target2).toBe(skillDir)

    expect(lock2.generated_at).not.toBe(lock1.generated_at)

    expect(lock2.skills).toHaveLength(1)
    expect(lock2.skills[0].alias).toBe(lock1.skills[0].alias)
    expect(lock2.skills[0].source).toBe(lock1.skills[0].source)
    expect(lock2.skills[0].dest).toBe(lock1.skills[0].dest)
  })

  it('B3: deny-by-default removes undeclared symlinks from working set', () => {
    const projectDir = makeTmp()
    const coldPoolRel = 'cold-pool'
    const coldPool = join(projectDir, coldPoolRel)

    const skillADir = placeSkill(coldPool, 'github.com/owner/repo/skill-a')
    const skillBDir = placeSkill(coldPool, 'github.com/owner/repo/skill-b')

    const deckContent = `[deck]\nmax_cards = 10\nworking_set = ".claude/skills"\ncold_pool = "${coldPoolRel}"\n\n[tool.skills.skill-a]\npath = "github.com/owner/repo/skill-a"\n`
    const deckPath = join(projectDir, 'skill-deck.toml')
    writeFileSync(deckPath, deckContent)

    // Pre-populate working set with both skill-a (declared) and skill-b (undeclared)
    const workingSet = join(projectDir, '.claude', 'skills')
    mkdirSync(workingSet, { recursive: true })
    symlinkSync(skillADir, join(workingSet, 'skill-a'))
    symlinkSync(skillBDir, join(workingSet, 'skill-b'))

    linkDeck(deckPath, projectDir, true)

    // skill-a should remain
    expect(existsSync(join(workingSet, 'skill-a'))).toBe(true)
    expect(lstatSync(join(workingSet, 'skill-a')).isSymbolicLink()).toBe(true)

    // skill-b should be removed
    expect(existsSync(join(workingSet, 'skill-b'))).toBe(false)

    const lock = JSON.parse(readFileSync(join(projectDir, 'skill-deck.lock'), 'utf-8'))
    expect(lock.skills).toHaveLength(1)
    expect(lock.skills[0].alias).toBe('skill-a')
  })

  it('B4: same-type alias collision exits with fatal error', () => {
    const projectDir = makeTmp()
    const coldPoolRel = 'cold-pool'
    const coldPool = join(projectDir, coldPoolRel)
    placeSkill(coldPool, 'github.com/owner-a/repo/foo')
    placeSkill(coldPool, 'github.com/owner-b/repo/foo')

    // Legacy string-array format: two skills with same basename
    const deckContent = `[deck]\nmax_cards = 10\nworking_set = ".claude/skills"\ncold_pool = "${coldPoolRel}"\n\n[tool]\nskills = ["github.com/owner-a/repo/foo", "github.com/owner-b/repo/foo"]\n`
    const deckPath = join(projectDir, 'skill-deck.toml')
    writeFileSync(deckPath, deckContent)

    const result = spawnSync('bun', [join(import.meta.dir, 'link.ts'), deckPath, projectDir, 'true'], {
      cwd: projectDir,
      encoding: 'utf-8',
    })

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Alias collision')
  })

  it('B4.b: cross-type alias collision exits with fatal error', () => {
    const projectDir = makeTmp()
    const coldPoolRel = 'cold-pool'
    const coldPool = join(projectDir, coldPoolRel)
    placeSkill(coldPool, 'github.com/owner-a/repo/foo')
    placeSkill(coldPool, 'github.com/owner-b/repo/foo')

    const deckContent = `[deck]\nmax_cards = 10\nworking_set = ".claude/skills"\ncold_pool = "${coldPoolRel}"\n\n[innate.skills.foo]\npath = "github.com/owner-a/repo/foo"\n\n[tool.skills.foo]\npath = "github.com/owner-b/repo/foo"\n`
    const deckPath = join(projectDir, 'skill-deck.toml')
    writeFileSync(deckPath, deckContent)

    const result = spawnSync('bun', [join(import.meta.dir, 'link.ts'), deckPath, projectDir, 'true'], {
      cwd: projectDir,
      encoding: 'utf-8',
    })

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Alias collision')
  })

  it('B5: max_cards exceeded exits before modifying working set', () => {
    const projectDir = makeTmp()
    const coldPoolRel = 'cold-pool'
    const coldPool = join(projectDir, coldPoolRel)
    placeSkill(coldPool, 'github.com/owner/repo/skill-a')
    placeSkill(coldPool, 'github.com/owner/repo/skill-b')
    placeSkill(coldPool, 'github.com/owner/repo/skill-c')

    const deckContent = `[deck]\nmax_cards = 2\nworking_set = ".claude/skills"\ncold_pool = "${coldPoolRel}"\n\n[tool.skills.skill-a]\npath = "github.com/owner/repo/skill-a"\n\n[tool.skills.skill-b]\npath = "github.com/owner/repo/skill-b"\n\n[tool.skills.skill-c]\npath = "github.com/owner/repo/skill-c"\n`
    const deckPath = join(projectDir, 'skill-deck.toml')
    writeFileSync(deckPath, deckContent)

    const result = spawnSync('bun', [join(import.meta.dir, 'link.ts'), deckPath, projectDir, 'true'], {
      cwd: projectDir,
      encoding: 'utf-8',
    })

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Budget exceeded')

    // Working set should not be created (fail-fast before mkdir)
    expect(existsSync(join(projectDir, '.claude', 'skills'))).toBe(false)
  })
})
