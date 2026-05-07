#!/usr/bin/env bun
/**
 * validate.test.ts — unit tests for validate.ts
 *
 * Run: bun test packages/lythoskill-deck/src/validate.test.ts
 */

import { describe, it, expect, afterEach } from 'bun:test'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { buildDeckValidation } from './validate.ts'

let cleanup: string[] = []

afterEach(() => {
  for (const dir of cleanup) {
    rmSync(dir, { recursive: true, force: true })
  }
  cleanup = []
})

function makeTmp(): string {
  const dir = mkdtempSync(join(tmpdir(), 'deck-validate-'))
  cleanup.push(dir)
  return dir
}

function placeSkill(coldPool: string, relPath: string): string {
  const skillDir = join(coldPool, relPath)
  mkdirSync(skillDir, { recursive: true })
  writeFileSync(join(skillDir, 'SKILL.md'), '---\nname: fixture\n---\n')
  return skillDir
}

describe('validateDeck', () => {
  it('C2: missing [deck] section errors', async () => {
    const projectDir = makeTmp()
    const deckContent = `[tool.skills.foo]\npath = "github.com/owner/repo/skill"\n`
    const deckPath = join(projectDir, 'skill-deck.toml')
    writeFileSync(deckPath, deckContent)

    const report = await buildDeckValidation(deckPath, projectDir)

    expect(report.status).toBe('invalid')
    expect(report.errors.some(e => e.includes('[deck] section is required'))).toBe(true)
  })

  it('C3: invalid max_cards errors', async () => {
    const projectDir = makeTmp()
    const coldPoolRel = 'cold-pool'
    const coldPool = join(projectDir, coldPoolRel)
    placeSkill(coldPool, 'github.com/owner/repo/skill')

    const deckContent = `[deck]\nmax_cards = -1\nworking_set = ".claude/skills"\ncold_pool = "${coldPoolRel}"\n\n[tool.skills.foo]\npath = "github.com/owner/repo/skill"\n`
    const deckPath = join(projectDir, 'skill-deck.toml')
    writeFileSync(deckPath, deckContent)

    const report = await buildDeckValidation(deckPath, projectDir)

    expect(report.status).toBe('invalid')
    expect(report.errors.some(e => e.includes('deck.max_cards must be a positive integer'))).toBe(true)
  })

  it('C4: skill not found in cold pool errors', async () => {
    const projectDir = makeTmp()
    const coldPoolRel = 'cold-pool'
    const coldPool = join(projectDir, coldPoolRel)
    mkdirSync(coldPool, { recursive: true })
    // do NOT place the skill

    const deckContent = `[deck]\nmax_cards = 10\nworking_set = ".claude/skills"\ncold_pool = "${coldPoolRel}"\n\n[tool.skills.foo]\npath = "github.com/owner/repo/nonexistent"\n`
    const deckPath = join(projectDir, 'skill-deck.toml')
    writeFileSync(deckPath, deckContent)

    const report = await buildDeckValidation(deckPath, projectDir)

    expect(report.status).toBe('invalid')
    expect(report.errors.some(e => e.includes('Skill not found'))).toBe(true)
  })

  it('C5: budget exceeded errors', async () => {
    const projectDir = makeTmp()
    const coldPoolRel = 'cold-pool'
    const coldPool = join(projectDir, coldPoolRel)
    placeSkill(coldPool, 'github.com/owner/repo/skill-a')
    placeSkill(coldPool, 'github.com/owner/repo/skill-b')

    const deckContent = `[deck]\nmax_cards = 1\nworking_set = ".claude/skills"\ncold_pool = "${coldPoolRel}"\n\n[tool.skills.skill-a]\npath = "github.com/owner/repo/skill-a"\n\n[tool.skills.skill-b]\npath = "github.com/owner/repo/skill-b"\n`
    const deckPath = join(projectDir, 'skill-deck.toml')
    writeFileSync(deckPath, deckContent)

    const report = await buildDeckValidation(deckPath, projectDir)

    expect(report.status).toBe('invalid')
    expect(report.errors.some(e => e.includes('Budget exceeded'))).toBe(true)
  })

  it('C6: toml parse error exits', async () => {
    const projectDir = makeTmp()
    const deckPath = join(projectDir, 'skill-deck.toml')
    writeFileSync(deckPath, '[invalid toml\n')

    const report = await buildDeckValidation(deckPath, projectDir)

    expect(report.status).toBe('invalid')
    expect(report.errors.some(e => e.includes('TOML parse error'))).toBe(true)
  })

  it('C8: invalid transient expires errors', async () => {
    const projectDir = makeTmp()
    const deckPath = join(projectDir, 'skill-deck.toml')
    writeFileSync(deckPath, `[deck]\nmax_cards = 10\n\n[transient.foo]\npath = "./nonexistent"\nexpires = "not-a-date"\n`)

    const report = await buildDeckValidation(deckPath, projectDir)

    expect(report.status).toBe('invalid')
    expect(report.errors.some(e => e.includes('invalid expires'))).toBe(true)
  })
})
