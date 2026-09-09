#!/usr/bin/env bun
/**
 * adapter-registry.test.ts — registry 数据完整性 + 索引纯函数
 *
 * Run: bun test packages/lythoskill-deck/src/adapter-registry.test.ts
 */

import { describe, it, expect } from 'bun:test'
import {
  ADAPTER_REGISTRY,
  SURVEY_CLAIMED_COUNT,
  SYMLINK_TIERS,
  adaptersScanning,
  dirMatches,
  targetModeOverride,
  registryProblems,
  adapterById,
} from './adapter-registry.ts'

describe('registry data integrity', () => {
  it('self-check passes (ids unique, tiers/severities valid, URLs, ISO dates)', () => {
    expect(registryProblems()).toEqual([])
  })

  it(`covers all ${SURVEY_CLAIMED_COUNT} surveyed CLIs`, () => {
    expect(ADAPTER_REGISTRY.length).toBe(SURVEY_CLAIMED_COUNT)
  })

  it('every row has a source URL and a verification date', () => {
    for (const a of ADAPTER_REGISTRY) {
      expect(a.source).toMatch(/^https?:\/\//)
      expect(a.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('docs-tier set is exactly the survey-verified four', () => {
    const docsTier = ADAPTER_REGISTRY.filter(a => a.symlinkTier === 'docs').map(a => a.id).sort()
    expect(docsTier).toEqual(['claude-code', 'codex', 'gemini-cli', 'roo-code'])
    for (const a of ADAPTER_REGISTRY) {
      expect(SYMLINK_TIERS).toContain(a.symlinkTier)
    }
  })

  it('goose carries the data-loss hazard with triggerDirs (#11600)', () => {
    const goose = adapterById('goose')!
    const h = goose.hazards.find(x => x.id === 'recursive-unlink-delete')!
    expect(h.severity).toBe('data-loss')
    expect(h.ref).toMatch(/11600/)
    expect(h.triggerDirs).toEqual(['.goose/skills'])
  })

  it('data-loss hazards must have triggerDirs (no warn-on-every-deck)', () => {
    for (const a of ADAPTER_REGISTRY) {
      for (const h of a.hazards) {
        if (h.severity === 'data-loss') {
          expect(h.triggerDirs?.length, `${a.id}/${h.id}`).toBeGreaterThan(0)
        }
      }
    }
  })
})

describe('adaptersScanning', () => {
  it('.claude/skills is scanned only by claude-code', () => {
    expect(adaptersScanning('.claude/skills').map(a => a.id)).toEqual(['claude-code'])
  })

  it('.agents/skills is the shared convention (9+ scanners, incl. goose hazard tier)', () => {
    const ids = adaptersScanning('.agents/skills').map(a => a.id)
    for (const expected of ['goose', 'opencode', 'crush', 'kimi', 'cursor', 'roo-code', 'gemini-cli', 'codex', 'kiro']) {
      expect(ids).toContain(expected)
    }
    expect(ids).not.toContain('claude-code')
  })

  it('absolute project paths match by suffix', () => {
    const ids = adaptersScanning('/home/user/proj/.agents/skills').map(a => a.id)
    expect(ids).toContain('goose')
    expect(ids).toContain('opencode')
  })

  it('home-relative adapter targets match project-relative dirs', () => {
    expect(adaptersScanning('~/.claude/skills').map(a => a.id)).toEqual(['claude-code'])
  })

  it('bare "skills" dir matches nothing (no basename false positives)', () => {
    expect(adaptersScanning('skills')).toEqual([])
    expect(adaptersScanning('/x/skills')).toEqual([])
  })

  it('dsh has no fan-out dirs (plugin model)', () => {
    expect(adapterById('dsh')!.fanOutTargets).toEqual([])
    expect(adaptersScanning('.dsh/skills')).toEqual([])
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
