#!/usr/bin/env bun
/**
 * cli-layout.test.ts — CLI-layout 数据完整性 + 索引纯函数
 *
 * Run: bun test packages/lythoskill-deck/src/cli-layout.test.ts
 */

import { describe, it, expect } from 'bun:test'
import {
  CLI_LAYOUTS,
  SURVEY_CLAIMED_COUNT,
  SYMLINK_TIERS,
  layoutsScanning,
  dirMatches,
  targetModeOverride,
  layoutProblems,
  layoutById,
  PER_ROLE_SCOPING_MAX,
} from './cli-layout.ts'

describe('cli-layout data integrity', () => {
  it('self-check passes (ids unique, tiers/severities valid, URLs, ISO dates)', () => {
    expect(layoutProblems()).toEqual([])
  })

  it(`covers all ${SURVEY_CLAIMED_COUNT} surveyed CLIs`, () => {
    expect(CLI_LAYOUTS.length).toBe(SURVEY_CLAIMED_COUNT)
  })

  it('every row has a source URL and a verification date', () => {
    for (const a of CLI_LAYOUTS) {
      expect(a.source).toMatch(/^https?:\/\//)
      expect(a.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('qwen is the only row whose provenance is "restored" (B3)', () => {
    // verifiedAt 16 行同为普查日,单看它读不出"这行是补的" —— 补录出身必须显式
    const restored = CLI_LAYOUTS.filter(a => a.verifiedBy === 'restored').map(a => a.id)
    expect(restored).toEqual(['qwen-code'])
    const qwen = layoutById('qwen-code')!
    expect(qwen.hazards.some(h => /restored|unpersisted/i.test(h.note))).toBe(true)
  })

  it('perRoleScoping is non-empty and stays a one-line datum (B13)', () => {
    for (const a of CLI_LAYOUTS) {
      expect(a.perRoleScoping.trim().length, `${a.id}`).toBeGreaterThan(0)
      expect(a.perRoleScoping.length, `${a.id}`).toBeLessThanOrEqual(PER_ROLE_SCOPING_MAX)
    }
  })

  it('docs-tier set is exactly the survey-verified four', () => {
    const docsTier = CLI_LAYOUTS.filter(a => a.symlinkTier === 'docs').map(a => a.id).sort()
    expect(docsTier).toEqual(['claude-code', 'codex', 'gemini-cli', 'roo-code'])
    for (const a of CLI_LAYOUTS) {
      expect(SYMLINK_TIERS).toContain(a.symlinkTier)
    }
  })

  it('goose carries the data-loss hazard with triggerDirs (#11600)', () => {
    const goose = layoutById('goose')!
    const h = goose.hazards.find(x => x.id === 'recursive-unlink-delete')!
    expect(h.severity).toBe('data-loss')
    expect(h.ref).toMatch(/11600/)
    expect(h.triggerDirs).toContain('.goose/skills')
    // B2:同一个动作(Goose UI 删除)对 goose 扫到的**每个**目录都成立,
    // 所以 ~/.config/goose/skills 也必须激活 —— 只写项目内那个是漏报
    expect(h.triggerDirs).toContain('~/.config/goose/skills')
  })

  it('data-loss hazards must have triggerDirs (no warn-on-every-deck)', () => {
    for (const a of CLI_LAYOUTS) {
      for (const h of a.hazards) {
        if (h.severity === 'data-loss') {
          expect(h.triggerDirs?.length, `${a.id}/${h.id}`).toBeGreaterThan(0)
        }
      }
    }
  })

  it('a data-loss hazard covers every EXCLUSIVE fan-out target of its own layout (B2, property)', () => {
    // 不变量版(比钉字面值强):hazard 描述的是**动作**(如 Goose UI 删除),
    // 动作落在该 CLI 扫到的哪个目录上都一样 —— 所以除**共享目录**外必须全覆盖。
    // 共享目录(.agents/skills 等,≥2 家扫描)是刻意的例外:默认 deck 就扇进它,
    // 覆盖它会让每个默认 deck 次次报警(cli-layout.ts hazard.triggerDirs 注释)。
    // 这条不变量在 B2 修复前是红的 —— 它抓的是**整类**漏报,不是那一行。
    for (const a of CLI_LAYOUTS) {
      const exclusive = a.fanOutTargets.filter(t => layoutsScanning(t).length === 1)
      for (const h of a.hazards) {
        if (h.severity !== 'data-loss') continue
        for (const t of exclusive) {
          expect(h.triggerDirs, `${a.id}/${h.id} must cover exclusive target ${t}`).toContain(t)
        }
      }
    }
  })
})

describe('layoutsScanning', () => {
  it('.claude/skills is scanned only by claude-code', () => {
    expect(layoutsScanning('.claude/skills').map(a => a.id)).toEqual(['claude-code'])
  })

  it('.agents/skills is the shared convention (9+ scanners, incl. goose hazard tier)', () => {
    const ids = layoutsScanning('.agents/skills').map(a => a.id)
    for (const expected of ['goose', 'opencode', 'crush', 'kimi', 'cursor', 'roo-code', 'gemini-cli', 'codex', 'kiro']) {
      expect(ids).toContain(expected)
    }
    expect(ids).not.toContain('claude-code')
  })

  it('absolute project paths match by suffix', () => {
    const ids = layoutsScanning('/home/user/proj/.agents/skills').map(a => a.id)
    expect(ids).toContain('goose')
    expect(ids).toContain('opencode')
  })

  it('home-relative layout targets match project-relative dirs', () => {
    expect(layoutsScanning('~/.claude/skills').map(a => a.id)).toEqual(['claude-code'])
  })

  it('bare "skills" dir matches nothing (no basename false positives)', () => {
    expect(layoutsScanning('skills')).toEqual([])
    expect(layoutsScanning('/x/skills')).toEqual([])
  })

  it('dsh has no fan-out dirs (plugin model)', () => {
    expect(layoutById('dsh')!.fanOutTargets).toEqual([])
    expect(layoutsScanning('.dsh/skills')).toEqual([])
  })
})

describe('dirMatches', () => {
  it('matches normalized equality and /-suffix', () => {
    expect(dirMatches('.goose/skills', '.goose/skills')).toBe(true)
    expect(dirMatches('/proj/.goose/skills', '.goose/skills')).toBe(true)
    expect(dirMatches('/proj/.goose/skills', '.clinerules')).toBe(false)
    expect(dirMatches('.agents/skills', '.goose/skills')).toBe(false)
  })
})

describe('targetModeOverride (docs-tier regression dormancy)', () => {
  it('default docs-tier dirs have no override — link.ts behavior unchanged', () => {
    expect(targetModeOverride('.claude/skills')).toBeUndefined()
    expect(targetModeOverride('.agents/skills')).toBeUndefined()
    expect(targetModeOverride('~/.claude/skills')).toBeUndefined()
  })

  it('.clinerules (cline) gets snapshot with cited reason', () => {
    const o = targetModeOverride('.clinerules')!
    expect(o.mode).toBe('snapshot')
    expect(o.reason).toMatch(/cline/i)
    expect(o.reason).toMatch(/https?:\/\//)
  })
})
