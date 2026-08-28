#!/usr/bin/env bun
/**
 * add.test.ts — unit tests for add.ts
 *
 * Run: bun test packages/lythoskill-deck/src/add.test.ts
 */

import { describe, it, expect } from 'bun:test'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { findSkillDir, buildSkillDirCandidates, normalizeSkillsSh } from './add.ts'

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

  it('finds single skill in skills/ dir when no name hint', () => {
    const repo = makeRepo()
    makeSkillDir(repo, 'skills/my-skill')
    expect(findSkillDir(repo, null)).toBe(join(repo, 'skills/my-skill'))
    rmSync(repo, { recursive: true, force: true })
  })

  it('finds skill by flat scan in repo root subdirs', () => {
    const repo = makeRepo()
    makeSkillDir(repo, 'some-skill')
    expect(findSkillDir(repo, null)).toBe(join(repo, 'some-skill'))
    rmSync(repo, { recursive: true, force: true })
  })

  it('returns null when skills/ has multiple subdirs (ambiguous)', () => {
    const repo = makeRepo()
    makeSkillDir(repo, 'skills/skill-a')
    makeSkillDir(repo, 'skills/skill-b')
    expect(findSkillDir(repo, null)).toBeNull()
    rmSync(repo, { recursive: true, force: true })
  })

  it('finds skill at direct path when name provided', () => {
    const repo = makeRepo()
    makeSkillDir(repo, 'my-skill')
    expect(findSkillDir(repo, 'my-skill')).toBe(join(repo, 'my-skill'))
    rmSync(repo, { recursive: true, force: true })
  })
})

// ── buildSkillDirCandidates (pure) ──────────────────────────────

describe('buildSkillDirCandidates', () => {
  it('with skill name: returns skills/<name> then direct', () => {
    const candidates = buildSkillDirCandidates('/repo', 'my-skill')
    expect(candidates).toEqual(['/repo/skills/my-skill', '/repo/my-skill'])
  })

  it('without skill name: returns repo root then skills/', () => {
    const candidates = buildSkillDirCandidates('/repo', null)
    expect(candidates).toEqual(['/repo', '/repo/skills'])
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

// ── addSkill advisory-probe branch (IO seam, TASK-20260828194647623) ────────
// The probe advises, the clone decides. These tests pin that a probe failure
// never hard-exits before the clone attempt, and that a clone failure surfaces
// the probe's per-URL failure detail.

import { spyOn } from 'bun:test'
import { readFileSync } from 'node:fs'
import { addSkill, type AddSkillIO } from './add.ts'
import { ColdPool, buildFetchPlan, parseLocator } from '@lythos/cold-pool'

function makeAddSandbox() {
  const workdir = mkdtempSync(join(tmpdir(), 'deck-add-io-'))
  const poolDir = join(workdir, 'pool')
  const deckPath = join(workdir, 'skill-deck.toml')
  writeFileSync(deckPath, `[deck]\ncold_pool = "${poolDir}"\nworking_set = ".claude/skills"\n`)
  const plan = buildFetchPlan(new ColdPool(poolDir), parseLocator('github.com/acme/widgets')!)
  return { workdir, deckPath, poolDir, targetDir: plan.targetDir }
}

function hardExitSentinel(exitCodes: number[]): (code: number) => never {
  return (code: number) => {
    exitCodes.push(code)
    throw new Error(`HARD_EXIT_${code}`)
  }
}

describe('addSkill advisory probe branch', () => {
  it('probe failure does NOT hard-exit — clone is still attempted, success path completes', async () => {
    const { workdir, deckPath, targetDir } = makeAddSandbox()
    mkdirSync(targetDir, { recursive: true })
    writeFileSync(join(targetDir, 'SKILL.md'), '---\nname: widgets\ndescription: test\n---\n')

    const calls: string[] = []
    const exitCodes: number[] = []
    const io: AddSkillIO = {
      probe: (async () => { calls.push('probe'); return undefined }) as any,
      fetchPlan: ((() => { calls.push('fetch'); return { status: 'already-present' } })) as any,
      exit: hardExitSentinel(exitCodes),
    }

    await addSkill('github.com/acme/widgets', { deck: deckPath, workdir }, io)

    // probe ran, clone attempted after it, and exit was never reached
    expect(calls).toEqual(['probe', 'fetch'])
    expect(exitCodes).toEqual([])
    expect(readFileSync(deckPath, 'utf-8')).toContain('github.com/acme/widgets')
    rmSync(workdir, { recursive: true, force: true })
  })

  it('probe failure + clone failure → error output includes probe failures detail, exits via seam', async () => {
    const { workdir, deckPath } = makeAddSandbox()
    const errLines: string[] = []
    const errSpy = spyOn(console, 'error').mockImplementation((...args: any[]) => { errLines.push(args.join(' ')) })
    const warnSpy = spyOn(console, 'warn').mockImplementation(() => {})
    const exitCodes: number[] = []
    const io: AddSkillIO = {
      probe: (async () => ({
        url: 'https://github.com/acme/widgets.git',
        path: 'direct',
        confidence: 'high',
        failures: [{ url: 'https://github.com/acme/widgets.git', reason: 'HTTP 403 (simulated)' }],
      })) as any,
      fetchPlan: ((() => ({ status: 'failed', message: 'git clone exploded (simulated)' }))) as any,
      exit: hardExitSentinel(exitCodes),
    }

    try {
      await expect(addSkill('github.com/acme/widgets', { deck: deckPath, workdir }, io))
        .rejects.toThrow('HARD_EXIT_1')

      expect(exitCodes).toEqual([1])
      const out = errLines.join('\n')
      expect(out).toContain('git clone exploded (simulated)')
      expect(out).toContain('Probe detail')
      expect(out).toContain('HTTP 403 (simulated)')
    } finally {
      errSpy.mockRestore()
      warnSpy.mockRestore()
      rmSync(workdir, { recursive: true, force: true })
    }
  })

  it('inconclusive probe (undefined) + clone failure → inconclusive line printed', async () => {
    const { workdir, deckPath } = makeAddSandbox()
    const errLines: string[] = []
    const errSpy = spyOn(console, 'error').mockImplementation((...args: any[]) => { errLines.push(args.join(' ')) })
    const warnSpy = spyOn(console, 'warn').mockImplementation(() => {})
    const exitCodes: number[] = []
    const io: AddSkillIO = {
      probe: (async () => undefined) as any,
      fetchPlan: ((() => ({ status: 'failed', message: 'simulated clone failure' }))) as any,
      exit: hardExitSentinel(exitCodes),
    }

    try {
      await expect(addSkill('github.com/acme/widgets', { deck: deckPath, workdir }, io))
        .rejects.toThrow('HARD_EXIT_1')

      expect(errLines.join('\n')).toContain('Network probe was inconclusive')
    } finally {
      errSpy.mockRestore()
      warnSpy.mockRestore()
      rmSync(workdir, { recursive: true, force: true })
    }
  })
})
