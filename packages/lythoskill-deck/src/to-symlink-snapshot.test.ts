import { describe, expect, test, beforeEach, afterEach } from 'bun:test'
import { mkdirSync, mkdtempSync, writeFileSync, rmSync, symlinkSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { toSymlinkSkill, toSnapshotSkill } from './to-symlink-snapshot'
import { cpSync, lstatSync } from 'node:fs'

// Build a minimal project with a cold pool, deck.toml, working set, and lock
function setupProject(opts: { mode: 'snapshot' | 'symlink' }) {
  const project = mkdtempSync(join(tmpdir(), 'to-symlink-snapshot-test-'))
  const coldPool = join(project, 'cold-pool')
  const workingSet = join(project, '.claude', 'skills')

  // Cold pool: create a fake skill repo
  const skillDir = join(coldPool, 'github.com', 'test-org', 'test-skill')
  mkdirSync(skillDir, { recursive: true })
  writeFileSync(join(skillDir, 'SKILL.md'), '---\nname: test-skill\ndescription: test\n---\n\n# Test Skill')

  // Working set
  mkdirSync(workingSet, { recursive: true })

  // Create the target in working set per mode
  const dest = join(workingSet, 'test-skill')
  if (opts.mode === 'snapshot') {
    // cp from cold pool
    cpSync(skillDir, dest, { recursive: true })
  } else {
    symlinkSync(skillDir, dest)
  }

  // deck.toml
  const deckToml = `
[deck]
max_cards = 10
cold_pool = "cold-pool"
working_set = ".claude/skills"

[tool.skills.test-skill]
path = "github.com/test-org/test-skill"
`
  writeFileSync(join(project, 'skill-deck.toml'), deckToml)

  // lock file
  const lock = {
    version: '1.0.0' as const,
    generated_at: new Date().toISOString(),
    deck_source: { path: 'skill-deck.toml', content_hash: 'abc' },
    working_set: '.claude/skills',
    cold_pool: 'cold-pool',
    skills: [
      {
        name: 'github.com/test-org/test-skill',
        alias: 'test-skill',
        deck_niche: '',
        type: 'tool' as const,
        source: 'github.com/test-org/test-skill',
        dest: '.claude/skills/test-skill',
        linked_at: new Date().toISOString(),
        deck_managed_dirs: [],
      },
    ],
    constraints: { total_cards: 1, max_cards: 10, within_budget: true, transient_warnings: [], dir_overlaps: [] },
  }
  writeFileSync(join(project, 'skill-deck.lock'), JSON.stringify(lock, null, 2))

  const deckPath = join(project, 'skill-deck.toml')
  return { project, coldPool, workingSet, skillDir, deckPath, dest }
}

describe('toSymlinkSkill — snapshot → symlink', () => {
  test('switches real dir to symlink', () => {
    const { deckPath, dest, project } = setupProject({ mode: 'snapshot' })
    const originalCwd = process.cwd
    const exit = process.exit

    try {
      process.cwd = () => project
      process.exit = (() => { throw new Error('exit') }) as any
      toSymlinkSkill('test-skill', deckPath, project)
    } catch (e: any) {
      if (e.message !== 'exit') throw e
    } finally {
      process.cwd = originalCwd
      process.exit = exit
    }

    const st = lstatSync(dest)
    expect(st.isSymbolicLink()).toBe(true)
    rmSync(project, { recursive: true, force: true })
  })

  test('no-op when already symlink', () => {
    const { deckPath, dest, project } = setupProject({ mode: 'symlink' })
    const originalCwd = process.cwd
    const exit = process.exit

    try {
      process.cwd = () => project
      process.exit = (() => { throw new Error('exit') }) as any
      toSymlinkSkill('test-skill', deckPath, project)
    } catch (e: any) {
      if (e.message !== 'exit') throw e
    } finally {
      process.cwd = originalCwd
      process.exit = exit
    }

    const st = lstatSync(dest)
    expect(st.isSymbolicLink()).toBe(true)
    rmSync(project, { recursive: true, force: true })
  })
})

describe('toSnapshotSkill — symlink → snapshot', () => {
  test('switches symlink to real dir', () => {
    const { deckPath, dest, project } = setupProject({ mode: 'symlink' })
    const originalCwd = process.cwd
    const exit = process.exit

    try {
      process.cwd = () => project
      process.exit = (() => { throw new Error('exit') }) as any
      toSnapshotSkill('test-skill', deckPath, project)
    } catch (e: any) {
      if (e.message !== 'exit') throw e
    } finally {
      process.cwd = originalCwd
      process.exit = exit
    }

    const st = lstatSync(dest)
    expect(st.isSymbolicLink()).toBe(false)
    expect(st.isDirectory()).toBe(true)
    // Should have SKILL.md
    expect(readFileSync(join(dest, 'SKILL.md'), 'utf-8')).toContain('Test Skill')
    rmSync(project, { recursive: true, force: true })
  })

  test('no-op when already snapshot', () => {
    const { deckPath, dest, project } = setupProject({ mode: 'snapshot' })
    const originalCwd = process.cwd
    const exit = process.exit

    try {
      process.cwd = () => project
      process.exit = (() => { throw new Error('exit') }) as any
      toSnapshotSkill('test-skill', deckPath, project)
    } catch (e: any) {
      if (e.message !== 'exit') throw e
    } finally {
      process.cwd = originalCwd
      process.exit = exit
    }

    const st = lstatSync(dest)
    expect(st.isDirectory()).toBe(true)
    expect(st.isSymbolicLink()).toBe(false)
    rmSync(project, { recursive: true, force: true })
  })
})
