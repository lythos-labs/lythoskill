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

// ── findSkillDir ───────────────────────────────────────────────

function makeRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), 'deck-skill-repo-'))
  return dir
}

function makeSkillDir(repo: string, skillName: string): string {
  const d = join(repo, skillName)
  mkdirSync(d, { recursive: true })
  writeFileSync(join(d, 'SKILL.md'), `---\nname: ${skillName}\ndescription: test\n---\n\n# ${skillName}\n`)
  return d
}

describe('findSkillDir', () => {
  it('finds skill at repo root when SKILL.md exists', () => {
    const repo = makeRepo()
    writeFileSync(join(repo, 'SKILL.md'), '---\nname: test\n---\n')
    expect(findSkillDir(repo, null)).toBe(repo)
    rmSync(repo, { recursive: true, force: true })
  })

  it('finds skill at skills/<name> when name provided', () => {
    const repo = makeRepo()
    makeSkillDir(repo, 'skills/my-skill')
    const found = findSkillDir(repo, 'skills/my-skill')
    expect(found).toBe(join(repo, 'skills/my-skill'))
    rmSync(repo, { recursive: true, force: true })
  })

  it('returns null when no SKILL.md exists anywhere in repo', () => {
    const repo = makeRepo()
    expect(findSkillDir(repo, null)).toBeNull()
    rmSync(repo, { recursive: true, force: true })
  })
})

// ── normalizeSkillsSh — skills.sh syntax sugar ─────────────────

describe('normalizeSkillsSh', () => {
  // FQ locators pass through
  it('passes FQ github.com locators through', () => {
    expect(normalizeSkillsSh('github.com/anthropics/skills/skills/frontend-design').fq)
      .toBe('github.com/anthropics/skills/skills/frontend-design')
    expect(normalizeSkillsSh('github.com/vercel-labs/agent-skills').fq)
      .toBe('github.com/vercel-labs/agent-skills')
  })

  it('passes localhost locators through', () => {
    expect(normalizeSkillsSh('localhost/me/skill-a').fq).toBe('localhost/me/skill-a')
  })

  // skills.sh top skill owner/repo formats
  const topSkills: Array<[string, string]> = [
    ['vercel-labs/skills', 'github.com/vercel-labs/skills'],
    ['vercel-labs/agent-skills', 'github.com/vercel-labs/agent-skills'],
    ['anthropics/skills', 'github.com/anthropics/skills'],
    ['obra/superpowers', 'github.com/obra/superpowers'],
    ['browser-use/browser-use', 'github.com/browser-use/browser-use'],
    ['firecrawl/cli', 'github.com/firecrawl/cli'],
    ['apify/agent-skills', 'github.com/apify/agent-skills'],
    ['squirrelscan/skills', 'github.com/squirrelscan/skills'],
    ['getsentry/sentry-for-ai', 'github.com/getsentry/sentry-for-ai'],
    ['coderabbitai/skills', 'github.com/coderabbitai/skills'],
    ['openai/skills', 'github.com/openai/skills'],
    ['google-gemini/gemini-cli', 'github.com/google-gemini/gemini-cli'],
    ['coreyhaines31/marketingskills', 'github.com/coreyhaines31/marketingskills'],
    ['jimliu/baoyu-skills', 'github.com/jimliu/baoyu-skills'],
    ['astronomer/agents', 'github.com/astronomer/agents'],
  ]

  for (const [input, expected] of topSkills) {
    it(`normalizes ${input}`, () => {
      expect(normalizeSkillsSh(input).fq).toBe(expected)
    })
  }

  // @skill syntax
  it('preserves skillFilter from @skill syntax', () => {
    const r = normalizeSkillsSh('vercel-labs/skills@find-skills')
    expect(r.fq).toBe('github.com/vercel-labs/skills')
    expect(r.skillFilter).toBe('find-skills')
  })

  it('normalizes @skill with repo-level fq', () => {
    expect(normalizeSkillsSh('mattpocock/skills@tdd').fq)
      .toBe('github.com/mattpocock/skills')
  })

  // baoyu-skills @skill syntax (largest personal skill pack, 17,900+ stars)
  it('normalizes JimLiu/baoyu-skills@baoyu-image-cards', () => {
    const r = normalizeSkillsSh('JimLiu/baoyu-skills@baoyu-image-cards')
    expect(r.fq).toBe('github.com/JimLiu/baoyu-skills')
    expect(r.skillFilter).toBe('baoyu-image-cards')
  })

  it('normalizes jimliu/baoyu-skills@baoyu-infographic (case insensitive)', () => {
    const r = normalizeSkillsSh('jimliu/baoyu-skills@baoyu-infographic')
    expect(r.fq).toBe('github.com/jimliu/baoyu-skills')
    expect(r.skillFilter).toBe('baoyu-infographic')
  })

  it('normalizes baoyu-skills subpath form', () => {
    expect(normalizeSkillsSh('JimLiu/baoyu-skills/skills/baoyu-diagram').fq)
      .toBe('github.com/JimLiu/baoyu-skills/skills/baoyu-diagram')
  })

  // subpath
  it('normalizes owner/repo/subpath', () => {
    expect(normalizeSkillsSh('anthropics/skills/skills/frontend-design').fq)
      .toBe('github.com/anthropics/skills/skills/frontend-design')
  })

  // github: prefix
  it('normalizes github:owner/repo', () => {
    expect(normalizeSkillsSh('github:vercel-labs/agent-skills').fq)
      .toBe('github.com/vercel-labs/agent-skills')
  })

  // #ref suffix
  it('preserves #ref with FQ locator', () => {
    expect(normalizeSkillsSh('github.com/vercel-labs/skills#main').fq)
      .toBe('github.com/vercel-labs/skills#main')
  })

  it('preserves #ref with owner/repo shorthand', () => {
    expect(normalizeSkillsSh('vercel-labs/skills#v2.0').fq)
      .toBe('github.com/vercel-labs/skills#v2.0')
  })

  it('preserves #ref with @skill syntax', () => {
    const r = normalizeSkillsSh('vercel-labs/skills#main@find-skills')
    expect(r.fq).toBe('github.com/vercel-labs/skills#main')
    expect(r.skillFilter).toBe('find-skills')
  })

  it('preserves #ref with subpath', () => {
    expect(normalizeSkillsSh('anthropics/skills/skills/frontend-design#abc1234').fq)
      .toBe('github.com/anthropics/skills/skills/frontend-design#abc1234')
  })
})
