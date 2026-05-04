#!/usr/bin/env bun
/**
 * remove.test.ts — unit tests for remove.ts
 *
 * Run: bun test packages/lythoskill-deck/src/remove.test.ts
 */

import { describe, it, expect, afterEach, spyOn } from 'bun:test'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync, symlinkSync, lstatSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

let cleanup: string[] = []

afterEach(() => {
  for (const dir of cleanup) {
    rmSync(dir, { recursive: true, force: true })
  }
  cleanup = []
})

function makeTmp(): string {
  const dir = mkdtempSync(join(tmpdir(), 'deck-remove-'))
  cleanup.push(dir)
  return dir
}

function placeSkill(coldPool: string, relPath: string): string {
  const skillDir = join(coldPool, relPath)
  mkdirSync(skillDir, { recursive: true })
  writeFileSync(join(skillDir, 'SKILL.md'), '---\nname: fixture\n---\n')
  return skillDir
}

function buildDeck(projectDir: string, coldPoolRel: string, alias: string, path: string): string {
  const deckContent = `[deck]\nmax_cards = 10\nworking_set = ".claude/skills"\ncold_pool = "${coldPoolRel}"\n\n[tool.skills.${alias}]\npath = "${path}"\n`
  const deckPath = join(projectDir, 'skill-deck.toml')
  writeFileSync(deckPath, deckContent)
  return deckPath
}

describe('removeSkill', () => {
  it('C9: remove by alias cleans deck.toml + symlink, preserves cold pool', async () => {
    const projectDir = makeTmp()
    const coldPoolRel = 'cold-pool'
    const coldPool = join(projectDir, coldPoolRel)
    const skillDir = placeSkill(coldPool, 'github.com/owner/repo/skill-a')

    const deckPath = buildDeck(projectDir, coldPoolRel, 'skill-a', 'github.com/owner/repo/skill-a')

    const workingSet = join(projectDir, '.claude', 'skills')
    mkdirSync(workingSet, { recursive: true })
    symlinkSync(skillDir, join(workingSet, 'skill-a'))

    const { removeSkill } = await import('./remove.ts')
    removeSkill('skill-a', deckPath, projectDir)

    const deckContent = readFileSync(deckPath, 'utf-8')
    expect(deckContent).not.toContain('[tool.skills.skill-a]')
    expect(deckContent).not.toContain('path = "github.com/owner/repo/skill-a"')

    expect(existsSync(join(workingSet, 'skill-a'))).toBe(false)
    expect(existsSync(skillDir)).toBe(true)
    expect(existsSync(join(skillDir, 'SKILL.md'))).toBe(true)
  })

  it('C10: remove by FQ path cleans deck.toml + symlink, preserves cold pool', async () => {
    const projectDir = makeTmp()
    const coldPoolRel = 'cold-pool'
    const coldPool = join(projectDir, coldPoolRel)
    const skillDir = placeSkill(coldPool, 'github.com/owner/repo/skill-a')

    const deckPath = buildDeck(projectDir, coldPoolRel, 'skill-a', 'github.com/owner/repo/skill-a')

    const workingSet = join(projectDir, '.claude', 'skills')
    mkdirSync(workingSet, { recursive: true })
    symlinkSync(skillDir, join(workingSet, 'skill-a'))

    const { removeSkill } = await import('./remove.ts')
    removeSkill('github.com/owner/repo/skill-a', deckPath, projectDir)

    const deckContent = readFileSync(deckPath, 'utf-8')
    expect(deckContent).not.toContain('[tool.skills.skill-a]')
    expect(existsSync(join(workingSet, 'skill-a'))).toBe(false)
    expect(existsSync(skillDir)).toBe(true)
  })

  it('C11: remove non-existent target exits with error', async () => {
    const projectDir = makeTmp()
    const coldPoolRel = 'cold-pool'
    const coldPool = join(projectDir, coldPoolRel)
    mkdirSync(coldPool, { recursive: true })

    const deckContent = `[deck]\nmax_cards = 10\nworking_set = ".claude/skills"\ncold_pool = "${coldPoolRel}"\n`
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
      const { removeSkill } = await import('./remove.ts')
      removeSkill('not-in-deck', deckPath, projectDir)
      expect(false).toBe(true)
    } catch (err: any) {
      expect(exitCode).toBe(1)
      expect(errors.some(e => e.includes('Skill not found in deck'))).toBe(true)
    } finally {
      process.exit = originalExit
      errorSpy.mockRestore()
    }
  })
})
