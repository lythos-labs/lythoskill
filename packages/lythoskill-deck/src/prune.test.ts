#!/usr/bin/env bun
/**
 * prune.test.ts — unit tests for prune.ts
 *
 * Run: bun test packages/lythoskill-deck/src/prune.test.ts
 */

import { describe, it, expect, afterEach, spyOn } from 'bun:test'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { formatSize } from './prune.ts'

let cleanup: string[] = []

afterEach(() => {
  for (const dir of cleanup) {
    rmSync(dir, { recursive: true, force: true })
  }
  cleanup = []
})

function makeTmp(): string {
  const dir = mkdtempSync(join(tmpdir(), 'deck-prune-'))
  cleanup.push(dir)
  return dir
}

function placeRepo(coldPool: string, host: string, owner: string, repo: string): string {
  const repoDir = join(coldPool, host, owner, repo)
  mkdirSync(repoDir, { recursive: true })
  return repoDir
}

function placeSkillInRepo(repoDir: string, skillName: string): string {
  const skillDir = join(repoDir, 'skills', skillName)
  mkdirSync(skillDir, { recursive: true })
  writeFileSync(join(skillDir, 'SKILL.md'), '---\nname: fixture\n---\n')
  return skillDir
}

describe('formatSize', () => {
  it('formats bytes correctly at each boundary', () => {
    expect(formatSize(0)).toBe('0B')
    expect(formatSize(512)).toBe('512B')
    expect(formatSize(1023)).toBe('1023B')
    expect(formatSize(1024)).toBe('1.0KB')
    expect(formatSize(1536)).toBe('1.5KB')
    expect(formatSize(1048576)).toBe('1.0MB')
    expect(formatSize(1073741824)).toBe('1.0GB')
  })
})

describe('pruneDeck', () => {
  it('C15: prune with unreferenced repos deletes them when --yes is set', async () => {
    const projectDir = makeTmp()
    const coldPoolRel = 'cold-pool'
    const coldPool = join(projectDir, coldPoolRel)

    const repoA = placeRepo(coldPool, 'github.com', 'owner', 'repo-a')
    placeSkillInRepo(repoA, 'skill-a')

    const repoB = placeRepo(coldPool, 'github.com', 'owner', 'repo-b')
    placeSkillInRepo(repoB, 'skill-b')

    const deckContent = `[deck]\nmax_cards = 10\nworking_set = ".claude/skills"\ncold_pool = "${coldPoolRel}"\n\n[tool.skills.skill-a]\npath = "github.com/owner/repo-a/skills/skill-a"\n`
    const deckPath = join(projectDir, 'skill-deck.toml')
    writeFileSync(deckPath, deckContent)

    const { pruneDeck } = await import('./prune.ts')
    await pruneDeck(deckPath, projectDir, true)

    expect(existsSync(repoA)).toBe(true)
    expect(existsSync(join(repoA, 'skills', 'skill-a', 'SKILL.md'))).toBe(true)

    expect(existsSync(repoB)).toBe(false)
  })

  it('C16: prune with all referenced repos is a no-op', async () => {
    const projectDir = makeTmp()
    const coldPoolRel = 'cold-pool'
    const coldPool = join(projectDir, coldPoolRel)

    const repoA = placeRepo(coldPool, 'github.com', 'owner', 'repo-a')
    placeSkillInRepo(repoA, 'skill-a')

    const deckContent = `[deck]\nmax_cards = 10\nworking_set = ".claude/skills"\ncold_pool = "${coldPoolRel}"\n\n[tool.skills.skill-a]\npath = "github.com/owner/repo-a/skills/skill-a"\n`
    const deckPath = join(projectDir, 'skill-deck.toml')
    writeFileSync(deckPath, deckContent)

    const logs: string[] = []
    const logSpy = spyOn(console, 'log').mockImplementation((msg: string) => {
      logs.push(String(msg))
    })

    const originalExit = process.exit
    let exitCode: number | undefined
    process.exit = ((code?: number) => {
      exitCode = code ?? 0
      throw new Error(`EXIT:${code}`)
    }) as typeof process.exit

    try {
      const { pruneDeck } = await import('./prune.ts')
      await pruneDeck(deckPath, projectDir, true)
      expect(false).toBe(true)
    } catch (err: any) {
      expect(exitCode).toBe(0)
      expect(logs.some(l => l.includes('Nothing to prune'))).toBe(true)
    } finally {
      process.exit = originalExit
      logSpy.mockRestore()
    }
  })

  it('C17: prune with empty cold pool reports nothing to prune', async () => {
    const projectDir = makeTmp()
    const coldPoolRel = 'cold-pool'
    const coldPool = join(projectDir, coldPoolRel)
    mkdirSync(coldPool, { recursive: true })

    const deckContent = `[deck]\nmax_cards = 10\nworking_set = ".claude/skills"\ncold_pool = "${coldPoolRel}"\n`
    const deckPath = join(projectDir, 'skill-deck.toml')
    writeFileSync(deckPath, deckContent)

    const logs: string[] = []
    const logSpy = spyOn(console, 'log').mockImplementation((msg: string) => {
      logs.push(String(msg))
    })

    const originalExit = process.exit
    let exitCode: number | undefined
    process.exit = ((code?: number) => {
      exitCode = code ?? 0
      throw new Error(`EXIT:${code}`)
    }) as typeof process.exit

    try {
      const { pruneDeck } = await import('./prune.ts')
      await pruneDeck(deckPath, projectDir, true)
      expect(false).toBe(true)
    } catch (err: any) {
      expect(exitCode).toBe(0)
      expect(logs.some(l => l.includes('empty'))).toBe(true)
    } finally {
      process.exit = originalExit
      logSpy.mockRestore()
    }
  })
})
