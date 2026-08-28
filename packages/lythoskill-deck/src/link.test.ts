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

  it('resolves localhost/<owner>/<repo> via uniform <host>/<owner>/<repo> layout', () => {
    const coldPool = makeTmp()
    const projectDir = makeTmp()
    const expected = placeSkill(coldPool, 'localhost/me/my-local-skill')
    const result = findSource('localhost/me/my-local-skill', coldPool, projectDir)
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
  it('B1.tracer: empty deck creates working set, lock, and state with zero skills', () => {
    const projectDir = makeTmp()
    const coldPoolRel = 'cold-pool'
    const coldPool = join(projectDir, coldPoolRel)
    mkdirSync(coldPool, { recursive: true })

    const deckContent = `[deck]\nmax_cards = 10\nworking_set = ".claude/skills"\ncold_pool = "${coldPoolRel}"\n`
    const deckPath = join(projectDir, 'skill-deck.toml')
    writeFileSync(deckPath, deckContent)

    linkDeck(deckPath, projectDir, { noBackup: true })

    const workingSet = join(projectDir, '.claude', 'skills')
    expect(existsSync(workingSet)).toBe(true)
    expect(lstatSync(workingSet).isDirectory()).toBe(true)

    // Lock file (declarative, git-tracked)
    const lockPath = join(projectDir, 'skill-deck.lock')
    expect(existsSync(lockPath)).toBe(true)

    const lock = JSON.parse(readFileSync(lockPath, 'utf-8'))
    expect(lock.version).toBe('1.0.0')
    expect(lock.skills).toEqual([])
    expect(lock.deck_config.max_cards).toBe(10)
    expect(lock.deck_config.working_set).toBe('.claude/skills')
    expect(lock.deck_config.cold_pool).toBe(coldPoolRel)

    const expectedHash = createHash('sha256').update(deckContent).digest('hex')
    expect(lock.deck_source.content_hash).toBe(expectedHash)
    expect(lock.deck_source.path).toBe('skill-deck.toml')

    // State file (operational, git-ignored)
    const statePath = join(projectDir, 'skill-deck.state')
    expect(existsSync(statePath)).toBe(true)

    const state = JSON.parse(readFileSync(statePath, 'utf-8'))
    expect(state.version).toBe('1.0.0')
    expect(state.skills).toEqual([])
    expect(state.constraints.total_cards).toBe(0)
    expect(state.constraints.max_cards).toBe(10)
    expect(state.constraints.within_budget).toBe(true)
    expect(state.resolved_paths.working_set).toBe(resolve(workingSet))
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

    linkDeck(deckPath, projectDir, { noBackup: true })

    const workingSet = join(projectDir, '.claude', 'skills')
    const symlinkPath = join(workingSet, 'my-alias')

    expect(existsSync(symlinkPath)).toBe(true)
    expect(lstatSync(symlinkPath).isSymbolicLink()).toBe(true)

    const target = readlinkSync(symlinkPath)
    expect(target).toBe(skillDir)

    // Lock: declarative fields only
    const lock = JSON.parse(readFileSync(join(projectDir, 'skill-deck.lock'), 'utf-8'))
    expect(lock.skills).toHaveLength(1)

    const lockSkill = lock.skills[0]
    expect(lockSkill.name).toBe('github.com/owner/repo/skill')
    expect(lockSkill.alias).toBe('my-alias')
    expect(lockSkill.type).toBe('tool')
    expect(lockSkill.source).toBe(join('github.com', 'owner', 'repo', 'skill'))
    expect(lockSkill.content_hash).toMatch(/^[a-f0-9]{64}$/)
    expect(lockSkill.deck_niche).toBe('testing')
    // Lock should NOT have operational fields
    expect(lockSkill.linked_at).toBeUndefined()
    expect(lockSkill.dest).toBeUndefined()
    expect(lockSkill.mode).toBeUndefined()
    expect(lockSkill.deck_managed_dirs).toBeUndefined()

    // State: operational fields
    const state = JSON.parse(readFileSync(join(projectDir, 'skill-deck.state'), 'utf-8'))
    expect(state.skills).toHaveLength(1)

    const stateSkill = state.skills[0]
    expect(stateSkill.alias).toBe('my-alias')
    expect(stateSkill.linked_at).toBeDefined()
    expect(stateSkill.dest).toBe(resolve(workingSet, 'my-alias'))
    expect(stateSkill.mode).toBe('symlink')
    expect(stateSkill.deck_managed_dirs).toEqual(['docs/'])
    // State should NOT have declarative fields
    expect(stateSkill.name).toBeUndefined()
    expect(stateSkill.type).toBeUndefined()
    expect(stateSkill.source).toBeUndefined()
    expect(stateSkill.content_hash).toBeUndefined()
  })

  it('B2.b: idempotent re-run preserves symlink state and lock is unchanged', async () => {
    const projectDir = makeTmp()
    const coldPoolRel = 'cold-pool'
    const coldPool = join(projectDir, coldPoolRel)

    const skillDir = placeSkill(coldPool, 'github.com/owner/repo/skill')

    const deckContent = `[deck]\nmax_cards = 10\nworking_set = ".claude/skills"\ncold_pool = "${coldPoolRel}"\n\n[tool.skills.my-alias]\npath = "github.com/owner/repo/skill"\n`
    const deckPath = join(projectDir, 'skill-deck.toml')
    writeFileSync(deckPath, deckContent)

    linkDeck(deckPath, projectDir, { noBackup: true })

    const lock1 = JSON.parse(readFileSync(join(projectDir, 'skill-deck.lock'), 'utf-8'))
    const state1 = JSON.parse(readFileSync(join(projectDir, 'skill-deck.state'), 'utf-8'))
    const symlinkPath = join(projectDir, '.claude', 'skills', 'my-alias')
    const target1 = readlinkSync(symlinkPath)

    await new Promise(r => setTimeout(r, 50))

    linkDeck(deckPath, projectDir, { noBackup: true })

    const lock2 = JSON.parse(readFileSync(join(projectDir, 'skill-deck.lock'), 'utf-8'))
    const state2 = JSON.parse(readFileSync(join(projectDir, 'skill-deck.state'), 'utf-8'))
    const target2 = readlinkSync(symlinkPath)

    const entries = readdirSync(join(projectDir, '.claude', 'skills'))
      .filter(e => !e.startsWith('.') && !e.startsWith('_'))
    expect(entries).toHaveLength(1)
    expect(target2).toBe(target1)
    expect(target2).toBe(skillDir)

    // Lock should be UNCHANGED (idempotent) since no content changed
    expect(lock2).toEqual(lock1)

    // State should be UPDATED (always written)
    expect(state2.generated_at).not.toBe(state1.generated_at)
    expect(state2.skills[0].linked_at).not.toBe(state1.skills[0].linked_at)

    expect(state2.skills).toHaveLength(1)
    expect(state2.skills[0].alias).toBe(state1.skills[0].alias)
    expect(state2.skills[0].dest).toBe(state1.skills[0].dest)
    expect(state2.skills[0].mode).toBe(state1.skills[0].mode)
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

    linkDeck(deckPath, projectDir, { noBackup: true })

    // skill-a should remain
    expect(existsSync(join(workingSet, 'skill-a'))).toBe(true)
    expect(lstatSync(join(workingSet, 'skill-a')).isSymbolicLink()).toBe(true)

    // skill-b should be removed
    expect(existsSync(join(workingSet, 'skill-b'))).toBe(false)

    const lock = JSON.parse(readFileSync(join(projectDir, 'skill-deck.lock'), 'utf-8'))
    expect(lock.skills).toHaveLength(1)
    expect(lock.skills[0].alias).toBe('skill-a')

    const state = JSON.parse(readFileSync(join(projectDir, 'skill-deck.state'), 'utf-8'))
    expect(state.skills).toHaveLength(1)
    expect(state.skills[0].alias).toBe('skill-a')
  })

  it('snapshot mode: cp instead of symlink', () => {
    const projectDir = makeTmp()
    const coldPoolRel = 'cold-pool'
    const coldPool = join(projectDir, coldPoolRel)

    placeSkill(coldPool, 'github.com/owner/repo-a')

    const deckContent = `[deck]\nmax_cards = 10\nworking_set = ".claude/skills"\ncold_pool = "${coldPoolRel}"\n\n[tool.skills.my-alias]\npath = "github.com/owner/repo-a"\n`
    const deckPath = join(projectDir, 'skill-deck.toml')
    writeFileSync(deckPath, deckContent)

    linkDeck(deckPath, projectDir, { noBackup: true, mode: 'snapshot' })

    const dest = join(projectDir, '.claude', 'skills', 'my-alias')
    expect(existsSync(dest)).toBe(true)
    // Snapshot: real directory, not a symlink
    expect(lstatSync(dest).isDirectory()).toBe(true)
    expect(lstatSync(dest).isSymbolicLink()).toBe(false)
    // Verify content was copied
    expect(existsSync(join(dest, 'SKILL.md'))).toBe(true)

    // State should reflect snapshot mode
    const state = JSON.parse(readFileSync(join(projectDir, 'skill-deck.state'), 'utf-8'))
    expect(state.skills[0].mode).toBe('snapshot')
  })

  it('B4: also_link_to fan-out creates symlinks in additional targets', () => {
    const projectDir = makeTmp()
    const coldPoolRel = 'cold-pool'
    const coldPool = join(projectDir, coldPoolRel)
    mkdirSync(join(projectDir, '.claude'), { recursive: true })

    const skillDir = placeSkill(coldPool, 'github.com/owner/repo/skill')
    const deckPath = join(projectDir, 'skill-deck.toml')
    const deckContent = `[deck]
working_set = ".claude/skills"
cold_pool = "${coldPoolRel}"
also_link_to = [".agents/skills", ".kimi/skills"]

[tool.skills.my-alias]
path = "github.com/owner/repo/skill"
`
    writeFileSync(deckPath, deckContent)
    linkDeck(deckPath, projectDir, { noBackup: true })

    const primary = join(projectDir, '.claude', 'skills', 'my-alias')
    const agents = join(projectDir, '.agents', 'skills', 'my-alias')
    const kimi = join(projectDir, '.kimi', 'skills', 'my-alias')

    expect(existsSync(primary)).toBe(true)
    expect(lstatSync(primary).isSymbolicLink()).toBe(true)
    expect(existsSync(agents)).toBe(true)
    expect(lstatSync(agents).isSymbolicLink()).toBe(true)
    expect(existsSync(kimi)).toBe(true)
    expect(lstatSync(kimi).isSymbolicLink()).toBe(true)

    // All point to the same source
    expect(readlinkSync(primary)).toBe(skillDir)
    expect(readlinkSync(agents)).toBe(skillDir)
    expect(readlinkSync(kimi)).toBe(skillDir)

    // State should include also_link_to in resolved_paths
    const state = JSON.parse(readFileSync(join(projectDir, 'skill-deck.state'), 'utf-8'))
    expect(state.resolved_paths.also_link_to).toHaveLength(2)
    expect(state.resolved_paths.also_link_to[0]).toBe(resolve(projectDir, '.agents', 'skills'))
    expect(state.resolved_paths.also_link_to[1]).toBe(resolve(projectDir, '.kimi', 'skills'))
  })

  it('B5: also_link_to respects deny-by-default in each target', () => {
    const projectDir = makeTmp()
    const coldPoolRel = 'cold-pool'
    const coldPool = join(projectDir, coldPoolRel)

    const skillA = placeSkill(coldPool, 'github.com/owner/skill-a')
    const skillB = placeSkill(coldPool, 'github.com/owner/skill-b')

    // First link with both skills
    const deckPath = join(projectDir, 'skill-deck.toml')
    const deckV1 = `[deck]
working_set = ".claude/skills"
cold_pool = "${coldPoolRel}"
also_link_to = [".agents/skills"]

[tool.skills.skill-a]
path = "github.com/owner/skill-a"

[tool.skills.skill-b]
path = "github.com/owner/skill-b"
`
    writeFileSync(deckPath, deckV1)
    linkDeck(deckPath, projectDir, { noBackup: true })

    expect(existsSync(join(projectDir, '.agents', 'skills', 'skill-b'))).toBe(true)

    // Second link: remove skill-b
    const deckV2 = `[deck]
working_set = ".claude/skills"
cold_pool = "${coldPoolRel}"
also_link_to = [".agents/skills"]

[tool.skills.skill-a]
path = "github.com/owner/skill-a"
`
    writeFileSync(deckPath, deckV2)
    linkDeck(deckPath, projectDir, { noBackup: true })

    // skill-b should be removed from BOTH working_set and also_link_to
    expect(existsSync(join(projectDir, '.claude', 'skills', 'skill-a'))).toBe(true)
    expect(existsSync(join(projectDir, '.claude', 'skills', 'skill-b'))).toBe(false)
    expect(existsSync(join(projectDir, '.agents', 'skills', 'skill-a'))).toBe(true)
    expect(existsSync(join(projectDir, '.agents', 'skills', 'skill-b'))).toBe(false)

    // Lock should only have skill-a
    const lock = JSON.parse(readFileSync(join(projectDir, 'skill-deck.lock'), 'utf-8'))
    expect(lock.skills).toHaveLength(1)
    expect(lock.skills[0].alias).toBe('skill-a')
  })

  it('lock is idempotent: changing only deck content updates lock', () => {
    const projectDir = makeTmp()
    const coldPoolRel = 'cold-pool'
    const coldPool = join(projectDir, coldPoolRel)

    placeSkill(coldPool, 'github.com/owner/repo/skill')

    const deckV1 = `[deck]\nmax_cards = 10\nworking_set = ".claude/skills"\ncold_pool = "${coldPoolRel}"\n\n[tool.skills.my-alias]\npath = "github.com/owner/repo/skill"\n`
    const deckPath = join(projectDir, 'skill-deck.toml')
    writeFileSync(deckPath, deckV1)

    linkDeck(deckPath, projectDir, { noBackup: true })
    const lock1 = JSON.parse(readFileSync(join(projectDir, 'skill-deck.lock'), 'utf-8'))

    // Re-run with same deck: lock should be unchanged
    linkDeck(deckPath, projectDir, { noBackup: true })
    const lock2 = JSON.parse(readFileSync(join(projectDir, 'skill-deck.lock'), 'utf-8'))
    expect(lock2).toEqual(lock1)

    // Change deck content (e.g., max_cards)
    const deckV2 = `[deck]\nmax_cards = 15\nworking_set = ".claude/skills"\ncold_pool = "${coldPoolRel}"\n\n[tool.skills.my-alias]\npath = "github.com/owner/repo/skill"\n`
    writeFileSync(deckPath, deckV2)

    linkDeck(deckPath, projectDir, { noBackup: true })
    const lock3 = JSON.parse(readFileSync(join(projectDir, 'skill-deck.lock'), 'utf-8'))
    expect(lock3).not.toEqual(lock1)
    expect(lock3.deck_config.max_cards).toBe(15)
  })

})

// Capture console.log/warn/error lines emitted during fn's synchronous run.
// linkDeck is async, but all link output happens before its first await.
function captureConsole(fn: () => unknown): string[] {
  const lines: string[] = []
  const origLog = console.log
  const origWarn = console.warn
  const origError = console.error
  console.log = (...a: any[]) => { lines.push(a.join(' ')) }
  console.warn = (...a: any[]) => { lines.push(a.join(' ')) }
  console.error = (...a: any[]) => { lines.push(a.join(' ')) }
  try { fn() } finally {
    console.log = origLog
    console.warn = origWarn
    console.error = origError
  }
  return lines
}

describe('link output — each skill prints once per destination (TASK-20260827131734254)', () => {
  it('single destination: each skill prints exactly once', () => {
    const projectDir = makeTmp()
    const coldPoolRel = 'cold-pool'
    const coldPool = join(projectDir, coldPoolRel)

    placeSkill(coldPool, 'github.com/owner/repo/skill-a')
    placeSkill(coldPool, 'github.com/owner/repo/skill-b')

    const deckContent = `[deck]
working_set = ".claude/skills"
cold_pool = "${coldPoolRel}"

[tool.skills.skill-a]
path = "github.com/owner/repo/skill-a"

[tool.skills.skill-b]
path = "github.com/owner/repo/skill-b"
`
    const deckPath = join(projectDir, 'skill-deck.toml')
    writeFileSync(deckPath, deckContent)

    const lines = captureConsole(() => linkDeck(deckPath, projectDir, { noBackup: true }))
    const linkLines = lines.filter(l => l.includes('🔗'))
    expect(linkLines.filter(l => l.includes('skill-a'))).toHaveLength(1)
    expect(linkLines.filter(l => l.includes('skill-b'))).toHaveLength(1)
  })

  it('also_link_to fan-out: once per destination, each destination labeled', () => {
    const projectDir = makeTmp()
    const coldPoolRel = 'cold-pool'
    const coldPool = join(projectDir, coldPoolRel)

    placeSkill(coldPool, 'github.com/owner/repo/skill-a')

    const deckContent = `[deck]
working_set = ".claude/skills"
cold_pool = "${coldPoolRel}"
also_link_to = [".agents/skills"]

[tool.skills.skill-a]
path = "github.com/owner/repo/skill-a"
`
    const deckPath = join(projectDir, 'skill-deck.toml')
    writeFileSync(deckPath, deckContent)

    const lines = captureConsole(() => linkDeck(deckPath, projectDir, { noBackup: true }))
    const out = lines.join('\n')

    // skill-a appears exactly twice: once per actual destination
    const linkLines = lines.filter(l => l.includes('🔗'))
    expect(linkLines.filter(l => l.includes('skill-a'))).toHaveLength(2)

    // both destinations labeled before their link lines
    expect(out).toContain('working_set: .claude/skills')
    expect(out).toContain('also_link_to: .agents/skills')
  })
})

describe('working_set switch warning (TASK-20260827131734189)', () => {
  const deckFor = (workingSet: string) => `[deck]
working_set = "${workingSet}"
cold_pool = "cold-pool"

[tool.skills.skill-a]
path = "github.com/owner/repo/skill-a"
`

  function setupProject(): { projectDir: string; deckPath: string } {
    const projectDir = makeTmp()
    placeSkill(join(projectDir, 'cold-pool'), 'github.com/owner/repo/skill-a')
    const deckPath = join(projectDir, 'skill-deck.toml')
    return { projectDir, deckPath }
  }

  it('switch with old set present: warns (HATEOAS) and never auto-deletes', () => {
    const { projectDir, deckPath } = setupProject()

    writeFileSync(deckPath, deckFor('.claude/skills'))
    linkDeck(deckPath, projectDir, { noBackup: true })

    writeFileSync(deckPath, deckFor('.agents/skills'))
    const lines = captureConsole(() => linkDeck(deckPath, projectDir, { noBackup: true }))
    const out = lines.join('\n')

    // HATEOAS: what / why / how-to-fix
    expect(out).toContain('Previous working set still has 1 link-created symlink(s)')
    expect(out).toContain('.claude/skills → .agents/skills')
    expect(out).toContain('another agent may still use that directory')
    expect(out).toContain(`rm ${join(projectDir, '.claude', 'skills', 'skill-a')}`)

    // never auto-delete: old symlink still present, new set populated
    expect(lstatSync(join(projectDir, '.claude', 'skills', 'skill-a')).isSymbolicLink()).toBe(true)
    expect(lstatSync(join(projectDir, '.agents', 'skills', 'skill-a')).isSymbolicLink()).toBe(true)
  })

  it('switch with old set already gone: no warning', () => {
    const { projectDir, deckPath } = setupProject()

    writeFileSync(deckPath, deckFor('.claude/skills'))
    linkDeck(deckPath, projectDir, { noBackup: true })

    rmSync(join(projectDir, '.claude', 'skills'), { recursive: true, force: true })

    writeFileSync(deckPath, deckFor('.agents/skills'))
    const lines = captureConsole(() => linkDeck(deckPath, projectDir, { noBackup: true }))
    expect(lines.join('\n')).not.toContain('Previous working set')
  })

  it('first link ever (no previous state): no warning', () => {
    const { projectDir, deckPath } = setupProject()

    writeFileSync(deckPath, deckFor('.claude/skills'))
    const lines = captureConsole(() => linkDeck(deckPath, projectDir, { noBackup: true }))
    expect(lines.join('\n')).not.toContain('Previous working set')
  })
})
