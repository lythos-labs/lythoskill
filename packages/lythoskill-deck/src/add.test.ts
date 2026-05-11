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
import { findSkillDir, normalizeSkillsSh } from './add.ts'

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
      await addSkill('github.com/owner/repo-b', { workdir: projectDir, deck: deckPath, alias: 'foo' })
      expect(false).toBe(true) // should not reach here
    } catch (err: any) {
      expect(exitCode).toBe(1)
      expect(errors.some(e => e.includes('Alias "foo" already exists'))).toBe(true)
    } finally {
      process.exit = originalExit
      errorSpy.mockRestore()
    }
  })

  it('C9: invalid skill type rejects', async () => {
    const projectDir = makeTmp()
    const coldPoolRel = 'cold-pool'
    const coldPool = join(projectDir, coldPoolRel)
    mkdirSync(coldPool, { recursive: true })

    const fixtureDir = makeTmp()
    writeFileSync(join(fixtureDir, 'SKILL.md'), '---\nname: skill\n---\n')

    const originalExec = childProcess.execFileSync
    const execSpy = spyOn(childProcess, 'execFileSync').mockImplementation(((cmd: string, args: string[], options?: any) => {
      if (cmd === 'git' && args[0] === 'clone') {
        const dest = args[args.length - 1]
        cpSync(fixtureDir, dest, { recursive: true })
        return Buffer.from('')
      }
      return originalExec(cmd, args, options)
    }) as any)

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
      await addSkill('github.com/owner/repo', { deck: join(projectDir, 'skill-deck.toml'), workdir: projectDir, type: 'invalid' })
      expect(false).toBe(true)
    } catch (err: any) {
      expect(exitCode).toBe(1)
      expect(errors.some(e => e.includes('Invalid type'))).toBe(true)
    } finally {
      process.exit = originalExit
      errorSpy.mockRestore()
      execSpy.mockRestore()
    }
  })
})

describe('findSkillDir', () => {
  function makeRepo(): string {
    const dir = mkdtempSync(join(tmpdir(), 'deck-findskill-'))
    cleanup.push(dir)
    return dir
  }

  function placeSkill(repo: string, relPath: string): string {
    const skillDir = join(repo, relPath)
    mkdirSync(skillDir, { recursive: true })
    writeFileSync(join(skillDir, 'SKILL.md'), '---\nname: fixture\n---\n')
    return skillDir
  }

  it('returns repoPath for standalone skill (SKILL.md at repo root)', () => {
    const repo = makeRepo()
    writeFileSync(join(repo, 'SKILL.md'), '---\nname: standalone\n---\n')
    expect(findSkillDir(repo, null)).toBe(repo)
  })

  it('returns skills/ subdir when single skill exists there', () => {
    const repo = makeRepo()
    const expected = placeSkill(repo, 'skills/my-skill')
    expect(findSkillDir(repo, null)).toBe(expected)
  })

  it('returns flat root dir when single skill exists at repo root', () => {
    const repo = makeRepo()
    const expected = placeSkill(repo, 'my-skill')
    expect(findSkillDir(repo, null)).toBe(expected)
  })

  it('returns null when multiple flat skills exist at repo root (ambiguous)', () => {
    const repo = makeRepo()
    placeSkill(repo, 'skill-a')
    placeSkill(repo, 'skill-b')
    expect(findSkillDir(repo, null)).toBeNull()
  })

  it('finds skill in skills/ subdir when skill name is provided', () => {
    const repo = makeRepo()
    const expected = placeSkill(repo, 'skills/my-skill')
    expect(findSkillDir(repo, 'my-skill')).toBe(expected)
  })

  it('finds skill at repo root when skill name is provided (flat)', () => {
    const repo = makeRepo()
    const expected = placeSkill(repo, 'my-skill')
    expect(findSkillDir(repo, 'my-skill')).toBe(expected)
  })

  it('returns null when skill name provided but not found anywhere', () => {
    const repo = makeRepo()
    expect(findSkillDir(repo, 'nonexistent')).toBeNull()
  })

  it('returns null when no SKILL.md exists anywhere in repo', () => {
    const repo = makeRepo()
    expect(findSkillDir(repo, null)).toBeNull()
  })
})

// ── skills.sh syntax sugar — top skills parse validation ────────

describe('normalizeSkillsSh', () => {
  // FQ locators — must pass through unchanged
  it('passes FQ github.com locators through', () => {
    expect(normalizeSkillsSh('github.com/anthropics/skills/skills/frontend-design'))
      .toBe('github.com/anthropics/skills/skills/frontend-design')
    expect(normalizeSkillsSh('github.com/vercel-labs/agent-skills'))
      .toBe('github.com/vercel-labs/agent-skills')
  })

  it('passes localhost locators through', () => {
    expect(normalizeSkillsSh('localhost/me/skill-a')).toBe('localhost/me/skill-a')
  })

  // skills.sh top skill owner/repo formats
  it('normalizes vercel-labs/skills', () => {
    expect(normalizeSkillsSh('vercel-labs/skills')).toBe('github.com/vercel-labs/skills')
  })

  it('normalizes vercel-labs/agent-skills', () => {
    expect(normalizeSkillsSh('vercel-labs/agent-skills')).toBe('github.com/vercel-labs/agent-skills')
  })

  it('normalizes anthropics/skills', () => {
    expect(normalizeSkillsSh('anthropics/skills')).toBe('github.com/anthropics/skills')
  })

  it('normalizes obra/superpowers', () => {
    expect(normalizeSkillsSh('obra/superpowers')).toBe('github.com/obra/superpowers')
  })

  it('normalizes browser-use/browser-use', () => {
    expect(normalizeSkillsSh('browser-use/browser-use')).toBe('github.com/browser-use/browser-use')
  })

  it('normalizes firecrawl/cli', () => {
    expect(normalizeSkillsSh('firecrawl/cli')).toBe('github.com/firecrawl/cli')
  })

  it('normalizes apify/agent-skills', () => {
    expect(normalizeSkillsSh('apify/agent-skills')).toBe('github.com/apify/agent-skills')
  })

  it('normalizes squirrelscan/skills', () => {
    expect(normalizeSkillsSh('squirrelscan/skills')).toBe('github.com/squirrelscan/skills')
  })

  it('normalizes getsentry/sentry-for-ai', () => {
    expect(normalizeSkillsSh('getsentry/sentry-for-ai')).toBe('github.com/getsentry/sentry-for-ai')
  })

  it('normalizes coderabbitai/skills', () => {
    expect(normalizeSkillsSh('coderabbitai/skills')).toBe('github.com/coderabbitai/skills')
  })

  it('normalizes openai/skills', () => {
    expect(normalizeSkillsSh('openai/skills')).toBe('github.com/openai/skills')
  })

  it('normalizes google-gemini/gemini-cli', () => {
    expect(normalizeSkillsSh('google-gemini/gemini-cli')).toBe('github.com/google-gemini/gemini-cli')
  })

  it('normalizes coreyhaines31/marketingskills', () => {
    expect(normalizeSkillsSh('coreyhaines31/marketingskills')).toBe('github.com/coreyhaines31/marketingskills')
  })

  it('normalizes jimliu/baoyu-skills', () => {
    expect(normalizeSkillsSh('jimliu/baoyu-skills')).toBe('github.com/jimliu/baoyu-skills')
  })

  it('normalizes astronmer/agents', () => {
    expect(normalizeSkillsSh('astronomer/agents')).toBe('github.com/astronomer/agents')
  })

  // owner/repo@skill syntax — normalizes to repo level, discovery at runtime
  it('normalizes owner/repo@skill to repo-level locator', () => {
    expect(normalizeSkillsSh('vercel-labs/skills@find-skills'))
      .toBe('github.com/vercel-labs/skills')
    expect(normalizeSkillsSh('mattpocock/skills@tdd'))
      .toBe('github.com/mattpocock/skills')
    expect(normalizeSkillsSh('google-gemini/gemini-cli@code-reviewer'))
      .toBe('github.com/google-gemini/gemini-cli')
  })

  // owner/repo/subpath syntax
  it('normalizes owner/repo/subpath', () => {
    expect(normalizeSkillsSh('anthropics/skills/skills/frontend-design'))
      .toBe('github.com/anthropics/skills/skills/frontend-design')
  })

  // github: prefix
  it('normalizes github:owner/repo', () => {
    expect(normalizeSkillsSh('github:vercel-labs/agent-skills'))
      .toBe('github.com/vercel-labs/agent-skills')
  })

  // #ref suffix (branch/tag/commit) — compatible with skills.sh parseFragmentRef
  it('preserves #ref with FQ locator', () => {
    expect(normalizeSkillsSh('github.com/vercel-labs/skills#main'))
      .toBe('github.com/vercel-labs/skills#main')
  })

  it('preserves #ref with owner/repo shorthand', () => {
    expect(normalizeSkillsSh('vercel-labs/skills#v2.0'))
      .toBe('github.com/vercel-labs/skills#v2.0')
  })

  it('preserves #ref with @skill syntax', () => {
    expect(normalizeSkillsSh('vercel-labs/skills#main@find-skills'))
      .toBe('github.com/vercel-labs/skills#main')
  })

  it('preserves #ref with subpath', () => {
    expect(normalizeSkillsSh('anthropics/skills/skills/frontend-design#abc1234'))
      .toBe('github.com/anthropics/skills/skills/frontend-design#abc1234')
  })

  it('preserves #ref with github: prefix', () => {
    expect(normalizeSkillsSh('github:vercel-labs/agent-skills#dev'))
      .toBe('github.com/vercel-labs/agent-skills#dev')
  })
})
