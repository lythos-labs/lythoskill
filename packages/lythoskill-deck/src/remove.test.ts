#!/usr/bin/env bun
/**
 * remove.test.ts — unit tests for remove.ts
 *
 * Run: bun test packages/lythoskill-deck/src/remove.test.ts
 */

import { describe, it, expect, afterEach } from 'bun:test'
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
    let exitCode: number | undefined

    const io = {
      error: (msg: string) => errors.push(String(msg)),
      exit: (code?: number) => { exitCode = code ?? 0; throw new Error(`EXIT:${code}`) },
      warn: (_msg: string) => {},
      log: (_msg: string) => {},
    }

    try {
      const { removeSkill } = await import('./remove.ts')
      removeSkill('not-in-deck', deckPath, projectDir, io)
      expect(false).toBe(true)
    } catch (err: any) {
      expect(exitCode).toBe(1)
      expect(errors.some(e => e.includes('Skill not found in deck'))).toBe(true)
    }
  })

  it('C11.b: remove legacy string-array entry by alias', async () => {
    const projectDir = makeTmp()
    const coldPoolRel = 'cold-pool'
    const coldPool = join(projectDir, coldPoolRel)
    const skillDir = placeSkill(coldPool, 'github.com/owner/repo/skill-a')

    const deckContent = `[deck]\nmax_cards = 10\nworking_set = ".claude/skills"\ncold_pool = "${coldPoolRel}"\n\n[tool]\nskills = ["github.com/owner/repo/skill-a"]\n`
    const deckPath = join(projectDir, 'skill-deck.toml')
    writeFileSync(deckPath, deckContent)

    const workingSet = join(projectDir, '.claude', 'skills')
    mkdirSync(workingSet, { recursive: true })
    symlinkSync(skillDir, join(workingSet, 'skill-a'))

    const { removeSkill } = await import('./remove.ts')
    removeSkill('skill-a', deckPath, projectDir)

    const deckContentAfter = readFileSync(deckPath, 'utf-8')
    expect(deckContentAfter).not.toContain('skills = [')
    expect(existsSync(join(workingSet, 'skill-a'))).toBe(false)
    expect(existsSync(skillDir)).toBe(true)
  })

  it('C12: remove cleans also_link_to targets', async () => {
    const projectDir = makeTmp()
    const coldPoolRel = 'cold-pool'
    const coldPool = join(projectDir, coldPoolRel)
    const skillDir = placeSkill(coldPool, 'github.com/owner/repo/skill-a')

    const deckContent = `[deck]
max_cards = 10
working_set = ".claude/skills"
cold_pool = "${coldPoolRel}"
also_link_to = [".agents/skills", ".kimi/skills"]

[tool.skills.skill-a]
path = "github.com/owner/repo/skill-a"
`
    const deckPath = join(projectDir, 'skill-deck.toml')
    writeFileSync(deckPath, deckContent)

    // Create symlinks in all 3 targets to simulate post-link state
    const targets = [
      join(projectDir, '.claude', 'skills'),
      join(projectDir, '.agents', 'skills'),
      join(projectDir, '.kimi', 'skills'),
    ]
    for (const t of targets) {
      mkdirSync(t, { recursive: true })
      symlinkSync(skillDir, join(t, 'skill-a'))
    }

    const { removeSkill } = await import('./remove.ts')
    removeSkill('skill-a', deckPath, projectDir)

    const deckContentAfter = readFileSync(deckPath, 'utf-8')
    expect(deckContentAfter).not.toContain('[tool.skills.skill-a]')

    for (const t of targets) {
      expect(existsSync(join(t, 'skill-a'))).toBe(false)
    }
    expect(existsSync(skillDir)).toBe(true)
  })

  it('C13: remove with empty also_link_to preserves backward compat', async () => {
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

    expect(existsSync(join(workingSet, 'skill-a'))).toBe(false)
    expect(existsSync(skillDir)).toBe(true)
  })
})
