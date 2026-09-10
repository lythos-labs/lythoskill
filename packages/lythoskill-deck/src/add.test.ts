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
import { readFileSync, existsSync } from 'node:fs'
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

  // ── 归属守卫(TASK-20260910111600389,AC4 全仓复查发现的第六处)──────
  // `status:'failed'` 有两条来路,localhost 那条在 exists 检查**之前**返回 ——
  // 于是 targetDir 可能压根不是本次运行建的,却照样被 recursive 删掉。
  // 规则与前五处同一条:只清自己能证明是本次创建的东西。

  it('fetch failure does NOT delete a pre-existing targetDir (alreadyExists gate)', async () => {
    const { workdir, deckPath, targetDir } = makeAddSandbox()
    const errSpy = spyOn(console, 'error').mockImplementation(() => {})
    const warnSpy = spyOn(console, 'warn').mockImplementation(() => {})
    const exitCodes: number[] = []

    // 运行前这儿就有东西(用户自己放的 / 别的工具放的)。
    // buildFetchPlan 观测到这一点 → alreadyExists: true,闸门据此拒绝清理。
    mkdirSync(targetDir, { recursive: true })
    writeFileSync(join(targetDir, 'SKILL.md'), '---\nname: mine\n---\n# 我自己的\n')

    const io: AddSkillIO = {
      probe: (async () => undefined) as any,
      // 模拟 localhost 那条来路:它在 exists 检查**之前**就返回 failed,
      // 于是"已存在"与"failed"同时为真 —— 没有闸门时用户的目录就被吃掉了。
      fetchPlan: ((() => ({
        status: 'failed',
        targetDir,
        message: 'localhost locators have no remote; nothing to fetch',
      })) as any),
      exit: hardExitSentinel(exitCodes),
    }

    try {
      await expect(addSkill('github.com/acme/widgets', { deck: deckPath, workdir }, io))
        .rejects.toThrow('HARD_EXIT_1')
      expect(existsSync(join(targetDir, 'SKILL.md'))).toBe(true)
      expect(readFileSync(join(targetDir, 'SKILL.md'), 'utf-8')).toContain('我自己的')
    } finally {
      errSpy.mockRestore()
      warnSpy.mockRestore()
      rmSync(workdir, { recursive: true, force: true })
    }
  })

  it('fetch failure DOES clean up a partial clone this run created (alreadyExists: false)', async () => {
    const { workdir, deckPath, targetDir } = makeAddSandbox()
    const errSpy = spyOn(console, 'error').mockImplementation(() => {})
    const warnSpy = spyOn(console, 'warn').mockImplementation(() => {})
    const exitCodes: number[] = []

    // 注意:targetDir 必须由**这次 fetch 尝试**造出来,不能在调用前就存在 ——
    // `alreadyExists` 来自 buildFetchPlan 对真实 fs 的观测,不是 mock 能改的字段。
    // 这正合闸门的语义:它问的是"运行前这儿有没有东西"。
    expect(existsSync(targetDir)).toBe(false)

    const io: AddSkillIO = {
      probe: (async () => undefined) as any,
      fetchPlan: ((() => {
        // 模拟 git clone 写了一半然后失败:目录在本次尝试中才出现
        mkdirSync(targetDir, { recursive: true })
        writeFileSync(join(targetDir, 'partial'), 'half-written by a failed git clone')
        return { status: 'failed', targetDir, message: 'git clone exploded halfway' }
      }) as any),
      exit: hardExitSentinel(exitCodes),
    }

    try {
      await expect(addSkill('github.com/acme/widgets', { deck: deckPath, workdir }, io))
        .rejects.toThrow('HARD_EXIT_1')
      // 本次尝试的残留物:清掉,否则下次 add 会撞上半个仓库
      expect(existsSync(targetDir)).toBe(false)
    } finally {
      errSpy.mockRestore()
      warnSpy.mockRestore()
      rmSync(workdir, { recursive: true, force: true })
    }
  })
})

// ── --dry-run(TASK-20260910160707856)───────────────────────────────────────
// `--dry-run` 的用途正是"动手之前先看清单" —— 而它恰好在打印清单那一步崩:
// 使用点(`[${skillType}.skills.${alias}]`)在 `const alias = rawAlias` **之前**,
// 同一函数作用域内的 TDZ。与 deck 内容无关、与网络无关,走到那一行必然抛。
//
// 计划还得与实际**同判**:alias 与复用/克隆判定都取自真实执行用的那份值,
// 读不了的 deck 在这儿就拒绝(真实执行也会拒绝),不打印一份跑不了的清单。

/** 读取器读不了的 deck:多行内联表 —— `@iarna/toml` 拒收,`toml-eslint-parser` 收。 */
function writeUnreadableDeck(workdir: string): string {
  const deckPath = join(workdir, 'skill-deck.toml')
  writeFileSync(deckPath, `[deck]
working_set = ".claude/skills"
cold_pool = "pool"

[tool.skills.alpha]
path = "github.com/foo/bar"
meta = {
  a = 1,
  b = 2,
}
`)
  return deckPath
}

describe('addSkill --dry-run', () => {
  it('prints the plan and returns without throwing (TDZ pin: alias exists before the dry-run branch)', async () => {
    const { workdir, deckPath } = makeAddSandbox()
    const lines: string[] = []
    const logSpy = spyOn(console, 'log').mockImplementation((...args: any[]) => { lines.push(args.join(' ')) })
    const exitCodes: number[] = []

    try {
      // 注:没有注入 fetchPlan —— dry-run 在 probe/clone **之前**就 return。
      // 这一步不联网、不碰冷池,是这个测试能当"回归钉子"的前提。
      await addSkill('github.com/acme/widgets', { deck: deckPath, workdir, dryRun: true },
        { exit: hardExitSentinel(exitCodes) })

      const out = lines.join('\n')
      expect(out).toContain('[tool.skills.widgets]')
      expect(out).toContain('path = "github.com/acme/widgets"')
      expect(out).toContain('Would clone')
      expect(exitCodes).toEqual([])
    } finally {
      logSpy.mockRestore()
      rmSync(workdir, { recursive: true, force: true })
    }
  })

  it('reuse branch: an existing repo dir is reported as reuse, not clone (executeFetchPlan reads the dir, not .git)', async () => {
    const { workdir, deckPath, targetDir } = makeAddSandbox()
    mkdirSync(targetDir, { recursive: true })
    const lines: string[] = []
    const logSpy = spyOn(console, 'log').mockImplementation((...args: any[]) => { lines.push(args.join(' ')) })

    try {
      await addSkill('github.com/acme/widgets', { deck: deckPath, workdir, dryRun: true },
        { exit: hardExitSentinel([]) })

      const out = lines.join('\n')
      expect(out).toContain('Would reuse the existing dir — no clone')
      expect(out).not.toContain('Would clone')
    } finally {
      logSpy.mockRestore()
      rmSync(workdir, { recursive: true, force: true })
    }
  })

  it('@skill locator: the plan marks alias/path as provisional (discovery happens after the clone)', async () => {
    const { workdir, deckPath } = makeAddSandbox()
    const lines: string[] = []
    const logSpy = spyOn(console, 'log').mockImplementation((...args: any[]) => { lines.push(args.join(' ')) })

    try {
      await addSkill('acme/widgets@pdf', { deck: deckPath, workdir, dryRun: true },
        { exit: hardExitSentinel([]) })

      const out = lines.join('\n')
      // pre-discovery 的 alias 是 repo 名 —— 真实执行可能改成发现的目录名,
      // 所以计划必须自己说出来,而不是印一份看起来已定的清单。
      expect(out).toContain('[tool.skills.widgets]')
      expect(out).toContain('provisional')
    } finally {
      logSpy.mockRestore()
      rmSync(workdir, { recursive: true, force: true })
    }
  })

  it('unreadable deck: refuses before printing a plan, with the three-part message', async () => {
    const { workdir } = makeAddSandbox()
    const deckPath = writeUnreadableDeck(workdir)
    const lines: string[] = []
    const errLines: string[] = []
    const logSpy = spyOn(console, 'log').mockImplementation((...args: any[]) => { lines.push(args.join(' ')) })
    const errSpy = spyOn(console, 'error').mockImplementation((...args: any[]) => { errLines.push(args.join(' ')) })
    const exitCodes: number[] = []

    try {
      await expect(addSkill('github.com/acme/widgets', { deck: deckPath, workdir, dryRun: true },
        { exit: hardExitSentinel(exitCodes) })).rejects.toThrow('HARD_EXIT_1')

      expect(exitCodes).toEqual([1])
      const err = errLines.join('\n')
      expect(err).toContain('cannot be read by the tool\'s own parser')
      expect(err).toContain('why:')
      expect(err).toContain('fix:')
      expect(err).not.toContain('at parseInlineTable')  // 栈不外泄
      // 计划不能先印一份跑不了的清单
      expect(lines.join('\n')).not.toContain('Would add to skill-deck.toml')
    } finally {
      logSpy.mockRestore()
      errSpy.mockRestore()
      rmSync(workdir, { recursive: true, force: true })
    }
  })

  it('write path: unreadable deck → three-part message, not the iarna stack', async () => {
    const { workdir, deckPath, targetDir } = makeAddSandbox()
    mkdirSync(targetDir, { recursive: true })
    writeFileSync(join(targetDir, 'SKILL.md'), '---\nname: widgets\ndescription: test\n---\n')

    const errLines: string[] = []
    const errSpy = spyOn(console, 'error').mockImplementation((...args: any[]) => { errLines.push(args.join(' ')) })
    const warnSpy = spyOn(console, 'warn').mockImplementation(() => {})
    const logSpy = spyOn(console, 'log').mockImplementation(() => {})
    const exitCodes: number[] = []
    const io: AddSkillIO = {
      probe: (async () => undefined) as any,
      // 写回时读不了。实测里这种 deck 是**全程**读不了的 —— 那种情况下
      // resolveColdPoolPath 的兜底会把冷池退回默认,于是"仓库已在池里"
      // 就是走到这道闸的现实路径(已用真实 CLI 跑通:三件套消息 + exit 1 +
      // deck 逐字节不变)。这里冷池已在计划期用可读的 deck 定好,
      // 所以在这一步把文件换成读不了的版本来钉住同一道闸 ——
      // 闸本身只读 deckPath,冷池从哪来与它无关。
      fetchPlan: ((() => {
        writeUnreadableDeck(workdir)
        return { status: 'already-present', targetDir }
      }) as any),
      exit: hardExitSentinel(exitCodes),
    }

    try {
      await expect(addSkill('github.com/acme/widgets', { deck: deckPath, workdir }, io))
        .rejects.toThrow('HARD_EXIT_1')

      expect(exitCodes).toEqual([1])
      const err = errLines.join('\n')
      expect(err).toContain('cannot be read by the tool\'s own parser')
      expect(err).toContain('why:')
      expect(err).toContain('fix:')
      expect(err).toContain('nothing was changed on disk')
      expect(err).not.toContain('at parseInlineTable')
    } finally {
      errSpy.mockRestore()
      warnSpy.mockRestore()
      logSpy.mockRestore()
      rmSync(workdir, { recursive: true, force: true })
    }
  })
})
