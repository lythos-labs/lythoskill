#!/usr/bin/env bun
/**
 * add.test.ts — unit tests for add.ts
 *
 * Run: bun test packages/lythoskill-deck/src/add.test.ts
 */

import { describe, it, expect, afterEach, spyOn, mock } from 'bun:test'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync, cpSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import * as childProcess from 'node:child_process'

// Control homedir() return value for tests that need default cold_pool under tmpdir
let mockHomeDir = '/tmp'
mock.module('node:os', () => ({
  homedir: () => mockHomeDir,
}))

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
  const dir = mkdtempSync(join(tmpdir(), 'deck-add-'))
  cleanup.push(dir)
  return dir
}

function mockGitClone(fixturePath: string) {
  const originalExec = childProcess.execFileSync
  execSpy = spyOn(childProcess, 'execFileSync').mockImplementation(((cmd: string, args: string[], options?: any) => {
    if (cmd === 'git' && args[0] === 'clone') {
      const dest = args[args.length - 1]
      cpSync(fixturePath, dest, { recursive: true })
      return Buffer.from('')
    }
    return originalExec(cmd, args, options)
  }) as any)
}

describe('addSkill', () => {
  it('C6: add to empty project creates deck.toml and cold pool', async () => {
    const projectDir = makeTmp()
    mockHomeDir = projectDir

    const fixtureDir = makeTmp()
    writeFileSync(join(fixtureDir, 'SKILL.md'), '---\nname: test-skill\n---\n')

    mockGitClone(fixtureDir)

    // Dynamic import so add.ts picks up the mocked homedir()
    const { addSkill } = await import('./add.ts')

    await addSkill('github.com/owner/repo', { workdir: projectDir })

    const deckPath = join(projectDir, 'skill-deck.toml')
    expect(existsSync(deckPath)).toBe(true)

    const deckContent = readFileSync(deckPath, 'utf-8')
    expect(deckContent).toContain('[tool.skills.repo]')
    expect(deckContent).toContain('path = "github.com/owner/repo"')

    const coldPoolDir = join(projectDir, '.agents', 'skill-repos', 'github.com', 'owner', 'repo')
    expect(existsSync(coldPoolDir)).toBe(true)
    expect(existsSync(join(coldPoolDir, 'SKILL.md'))).toBe(true)
  })

  it('C7: add to existing deck appends entry', async () => {
    const projectDir = makeTmp()
    const coldPoolRel = 'cold-pool'
    const coldPool = join(projectDir, coldPoolRel)
    mkdirSync(coldPool, { recursive: true })

    // Pre-place skill-a in cold pool
    const skillADir = join(coldPool, 'github.com', 'owner', 'repo-a')
    mkdirSync(skillADir, { recursive: true })
    writeFileSync(join(skillADir, 'SKILL.md'), '---\nname: skill-a\n---\n')

    // Create deck.toml with skill-a
    const deckContent = `[deck]\nmax_cards = 10\ncold_pool = "${coldPoolRel}"\n\n[tool.skills.skill-a]\npath = "github.com/owner/repo-a"\n`
    const deckPath = join(projectDir, 'skill-deck.toml')
    writeFileSync(deckPath, deckContent)

    // Fixture for skill-b
    const fixtureDir = makeTmp()
    writeFileSync(join(fixtureDir, 'SKILL.md'), '---\nname: skill-b\n---\n')

    mockGitClone(fixtureDir)

    const { addSkill } = await import('./add.ts')
    await addSkill('github.com/owner/repo-b', { workdir: projectDir, deck: deckPath })

    const newContent = readFileSync(deckPath, 'utf-8')
    expect(newContent).toContain('[tool.skills.skill-a]')
    expect(newContent).toContain('path = "github.com/owner/repo-a"')
    expect(newContent).toContain('[tool.skills.repo-b]')
    expect(newContent).toContain('path = "github.com/owner/repo-b"')
  })

  it('C8: alias collision rejects', async () => {
    const projectDir = makeTmp()
    const coldPoolRel = 'cold-pool'
    const coldPool = join(projectDir, coldPoolRel)
    mkdirSync(coldPool, { recursive: true })

    const deckContent = `[deck]\nmax_cards = 10\ncold_pool = "${coldPoolRel}"\n\n[tool.skills.foo]\npath = "github.com/owner/repo-a"\n`
    const deckPath = join(projectDir, 'skill-deck.toml')
    writeFileSync(deckPath, deckContent)

    const fixtureDir = makeTmp()
    writeFileSync(join(fixtureDir, 'SKILL.md'), '---\nname: skill-b\n---\n')

    mockGitClone(fixtureDir)

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
      const { addSkill } = await import('./add.ts')
      await addSkill('github.com/owner/repo-b', { workdir: projectDir, deck: deckPath, as: 'foo' })
      expect(false).toBe(true) // should not reach here
    } catch (err: any) {
      expect(exitCode).toBe(1)
      expect(errors.some(e => e.includes('Alias "foo" already exists'))).toBe(true)
    } finally {
      process.exit = originalExit
      errorSpy.mockRestore()
    }
  })
})
