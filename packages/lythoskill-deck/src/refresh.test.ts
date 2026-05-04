#!/usr/bin/env bun
/**
 * refresh.test.ts — unit tests for refresh.ts helpers
 *
 * Run: bun test packages/lythoskill-deck/src/refresh.test.ts
 */

import { describe, it, expect, afterEach, spyOn } from 'bun:test'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, realpathSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execSync } from 'node:child_process'
import * as childProcess from 'node:child_process'

import { findGitRoot } from './refresh.ts'

let cleanup: string[] = []
let execSpy: ReturnType<typeof spyOn> | null = null

afterEach(() => {
  if (execSpy) {
    execSpy.mockRestore()
    execSpy = null
  }
  for (const dir of cleanup) {
    rmSync(dir, { recursive: true, force: true })
  }
  cleanup = []
})

function makeTmp(): string {
  const dir = mkdtempSync(join(tmpdir(), 'deck-refresh-'))
  cleanup.push(dir)
  return dir
}

describe('findGitRoot', () => {
  it('returns the directory itself when .git is directly present', () => {
    const dir = makeTmp()
    execSync('git init', { cwd: dir, stdio: 'ignore' })
    const root = findGitRoot(dir, dir)
    expect(root).not.toBeNull()
    expect(realpathSync(root!)).toBe(realpathSync(dir))
  })

  it('finds git root in parent directory for monorepo layout', () => {
    const repoDir = makeTmp()
    const skillDir = join(repoDir, 'skills', 'my-skill')
    mkdirSync(skillDir, { recursive: true })
    execSync('git init', { cwd: repoDir, stdio: 'ignore' })
    const root = findGitRoot(skillDir, repoDir)
    expect(root).not.toBeNull()
    expect(realpathSync(root!)).toBe(realpathSync(repoDir))
  })

  it('returns null for a non-git directory', () => {
    const dir = makeTmp()
    expect(findGitRoot(dir, dir)).toBeNull()
  })
})

function initGitRepo(dir: string) {
  execSync('git init', { cwd: dir, stdio: 'ignore' })
  execSync('git config user.email "test@test.com"', { cwd: dir, stdio: 'ignore' })
  execSync('git config user.name "Test"', { cwd: dir, stdio: 'ignore' })
  execSync('git commit --allow-empty -m "init"', { cwd: dir, stdio: 'ignore' })
}

function placeSkill(coldPool: string, relPath: string): string {
  const skillDir = join(coldPool, relPath)
  mkdirSync(skillDir, { recursive: true })
  writeFileSync(join(skillDir, 'SKILL.md'), '---\nname: fixture\n---\n')
  return skillDir
}

function mockGitPull(status: 'up-to-date' | 'updated') {
  const originalExecSync = childProcess.execSync
  execSpy = spyOn(childProcess, 'execSync').mockImplementation(((cmd: string, options?: any) => {
    if (cmd === 'git pull') {
      return status === 'up-to-date'
        ? 'Already up to date.\n'
        : 'Updating abc123..def456\nFast-forward\n README.md | 1 +\n'
    }
    return originalExecSync(cmd, options)
  }) as any)
}

describe('refreshDeck', () => {
  it('C12: refresh all skills reports status for each cold pool repo', async () => {
    const projectDir = makeTmp()
    const coldPoolRel = 'cold-pool'
    const coldPool = join(projectDir, coldPoolRel)

    const skillADir = placeSkill(coldPool, 'github.com/owner/repo/skill-a')
    const skillBDir = placeSkill(coldPool, 'github.com/owner/repo/skill-b')
    initGitRepo(skillADir)
    initGitRepo(skillBDir)

    const deckContent = `[deck]\nmax_cards = 10\nworking_set = ".claude/skills"\ncold_pool = "${coldPoolRel}"\n\n[tool.skills.skill-a]\npath = "github.com/owner/repo/skill-a"\n\n[tool.skills.skill-b]\npath = "github.com/owner/repo/skill-b"\n`
    const deckPath = join(projectDir, 'skill-deck.toml')
    writeFileSync(deckPath, deckContent)

    mockGitPull('up-to-date')

    const logs: string[] = []
    const logSpy = spyOn(console, 'log').mockImplementation((msg: string) => {
      logs.push(String(msg))
    })

    const { refreshDeck } = await import('./refresh.ts')
    refreshDeck(deckPath, projectDir)

    logSpy.mockRestore()

    expect(logs.some(l => l.includes('skill-a'))).toBe(true)
    expect(logs.some(l => l.includes('skill-b'))).toBe(true)
    expect(logs.some(l => l.includes('Up-to-date: 2'))).toBe(true)
  })

  it('C13: refresh single skill by alias only processes the target', async () => {
    const projectDir = makeTmp()
    const coldPoolRel = 'cold-pool'
    const coldPool = join(projectDir, coldPoolRel)

    const skillADir = placeSkill(coldPool, 'github.com/owner/repo/skill-a')
    const skillBDir = placeSkill(coldPool, 'github.com/owner/repo/skill-b')
    initGitRepo(skillADir)
    initGitRepo(skillBDir)

    const deckContent = `[deck]\nmax_cards = 10\nworking_set = ".claude/skills"\ncold_pool = "${coldPoolRel}"\n\n[tool.skills.skill-a]\npath = "github.com/owner/repo/skill-a"\n\n[tool.skills.skill-b]\npath = "github.com/owner/repo/skill-b"\n`
    const deckPath = join(projectDir, 'skill-deck.toml')
    writeFileSync(deckPath, deckContent)

    mockGitPull('up-to-date')

    const logs: string[] = []
    const logSpy = spyOn(console, 'log').mockImplementation((msg: string) => {
      logs.push(String(msg))
    })

    const { refreshDeck } = await import('./refresh.ts')
    refreshDeck(deckPath, projectDir, 'skill-a')

    logSpy.mockRestore()

    expect(logs.some(l => l.includes('skill-a'))).toBe(true)
    expect(logs.some(l => l.includes('skill-b'))).toBe(false)
    expect(logs.some(l => l.includes('single skill'))).toBe(true)
  })

  it('C14: refresh with updated skills triggers linkDeck', async () => {
    const projectDir = makeTmp()
    const coldPoolRel = 'cold-pool'
    const coldPool = join(projectDir, coldPoolRel)

    const skillADir = placeSkill(coldPool, 'github.com/owner/repo/skill-a')
    initGitRepo(skillADir)

    const deckContent = `[deck]\nmax_cards = 10\nworking_set = ".claude/skills"\ncold_pool = "${coldPoolRel}"\n\n[tool.skills.skill-a]\npath = "github.com/owner/repo/skill-a"\n`
    const deckPath = join(projectDir, 'skill-deck.toml')
    writeFileSync(deckPath, deckContent)

    mockGitPull('updated')

    const logs: string[] = []
    const logSpy = spyOn(console, 'log').mockImplementation((msg: string) => {
      logs.push(String(msg))
    })

    const { refreshDeck } = await import('./refresh.ts')
    refreshDeck(deckPath, projectDir)

    logSpy.mockRestore()

    expect(logs.some(l => l.includes('Running deck link'))).toBe(true)
    expect(logs.some(l => l.includes('Updated: 1'))).toBe(true)
  })

  it('C15: refresh skips localhost skills', async () => {
    const projectDir = makeTmp()
    const coldPoolRel = 'cold-pool'
    const coldPool = join(projectDir, coldPoolRel)

    const skillDir = placeSkill(coldPool, 'localhost/my-skill')
    initGitRepo(skillDir)

    const deckContent = `[deck]\nmax_cards = 10\nworking_set = ".claude/skills"\ncold_pool = "${coldPoolRel}"\n\n[tool.skills.local]\npath = "localhost/my-skill"\n`
    const deckPath = join(projectDir, 'skill-deck.toml')
    writeFileSync(deckPath, deckContent)

    mockGitPull('up-to-date')

    const logs: string[] = []
    const logSpy = spyOn(console, 'log').mockImplementation((msg: string) => {
      logs.push(String(msg))
    })

    const { refreshDeck } = await import('./refresh.ts')
    refreshDeck(deckPath, projectDir)

    logSpy.mockRestore()

    expect(logs.some(l => l.includes('local'))).toBe(true)
    expect(logs.some(l => l.includes('Skipped: 1'))).toBe(true)
  })

  it('C16: refresh reports not-git for non-git directories', async () => {
    const projectDir = makeTmp()
    const coldPoolRel = 'cold-pool'
    const coldPool = join(projectDir, coldPoolRel)

    placeSkill(coldPool, 'github.com/owner/repo/skill-a')
    // NO git init

    const deckContent = `[deck]\nmax_cards = 10\nworking_set = ".claude/skills"\ncold_pool = "${coldPoolRel}"\n\n[tool.skills.skill-a]\npath = "github.com/owner/repo/skill-a"\n`
    const deckPath = join(projectDir, 'skill-deck.toml')
    writeFileSync(deckPath, deckContent)

    const logs: string[] = []
    const logSpy = spyOn(console, 'log').mockImplementation((msg: string) => {
      logs.push(String(msg))
    })

    const { refreshDeck } = await import('./refresh.ts')
    refreshDeck(deckPath, projectDir)

    logSpy.mockRestore()

    expect(logs.some(l => l.includes('not a git repository'))).toBe(true)
  })

  it('C17: refresh target not found exits with error', async () => {
    const projectDir = makeTmp()
    const coldPoolRel = 'cold-pool'
    const coldPool = join(projectDir, coldPoolRel)
    mkdirSync(coldPool, { recursive: true })

    const deckContent = `[deck]\nmax_cards = 10\nworking_set = ".claude/skills"\ncold_pool = "${coldPoolRel}"\n\n[tool.skills.skill-a]\npath = "github.com/owner/repo/skill-a"\n`
    const deckPath = join(projectDir, 'skill-deck.toml')
    writeFileSync(deckPath, deckContent)

    const errors: string[] = []
    const errorSpy = spyOn(console, 'error').mockImplementation((msg: string) => {
      errors.push(String(msg))
    })

    const originalExit = process.exit
    let exitCode: number | undefined
    process.exit = ((code?: number) => {
      exitCode = code ?? 0
      throw new Error(`EXIT:${code}`)
    }) as typeof process.exit

    try {
      const { refreshDeck } = await import('./refresh.ts')
      refreshDeck(deckPath, projectDir, 'nonexistent')
      expect(false).toBe(true)
    } catch (err: any) {
      expect(exitCode).toBe(1)
      expect(errors.some(e => e.includes('not found'))).toBe(true)
    } finally {
      process.exit = originalExit
      errorSpy.mockRestore()
    }
  })
})
