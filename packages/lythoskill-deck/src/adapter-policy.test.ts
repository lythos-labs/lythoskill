#!/usr/bin/env bun
/**
 * adapter-policy.test.ts — fan-out 策略检查 + 循环链守卫
 *
 * Dormancy 纪律:默认 deck(.claude/skills + .agents/skills)零警告;
 * 危险/误配置才发声。docs 级行为不变是 AC,这里是它的测试。
 *
 * Run: bun test packages/lythoskill-deck/src/adapter-policy.test.ts
 */

import { describe, it, expect } from 'bun:test'
import { collectFanOutWarnings } from './adapter-policy.ts'
import { wouldCreateCycle } from './link.ts'

describe('collectFanOutWarnings — default pair dormancy (AC: docs-tier no regression)', () => {
  it('default .claude/skills + .agents/skills fan-out emits zero warnings', () => {
    expect(collectFanOutWarnings(['.claude/skills', '.agents/skills'])).toEqual([])
  })

  it('absolute paths of the default pair also emit zero warnings', () => {
    expect(collectFanOutWarnings(['/proj/.claude/skills', '/proj/.agents/skills'])).toEqual([])
  })

  it('docs-tier extra dirs (roo/gemini/codex branded) emit zero warnings', () => {
    expect(collectFanOutWarnings(['.claude/skills', '.roo/skills', '.gemini/skills'])).toEqual([])
  })
})

describe('collectFanOutWarnings — goose #11600 trigger', () => {
  it('.goose/skills fan-out emits the data-loss warning with issue ref', () => {
    const warnings = collectFanOutWarnings(['.claude/skills', '.goose/skills'])
    expect(warnings).toHaveLength(1)
    expect(warnings[0].severity).toBe('data-loss')
    expect(warnings[0].message).toMatch(/Goose/)
    expect(warnings[0].ref).toMatch(/11600/)
  })

  it('shared .agents/skills alone does NOT trigger the goose warning', () => {
    const warnings = collectFanOutWarnings(['.agents/skills'])
    expect(warnings.filter(w => w.severity === 'data-loss')).toEqual([])
  })
})

describe('collectFanOutWarnings — opencode #46327 duplicate-scan', () => {
  it('same adapter scanning two fan-out dirs warns with duplicate-name ref', () => {
    const warnings = collectFanOutWarnings(['.claude/skills', '.agents/skills', 'plugins/x/.agents/skills'])
    const opencodeDup = warnings.find(w => w.ref.match(/46327/))
    expect(opencodeDup).toBeDefined()
    expect(opencodeDup!.message).toMatch(/scans 2 fan-out dirs/)
  })

  it('two DIFFERENT adapters sharing a convention is fine (single dir each)', () => {
    // .claude/skills (claude) + .goose/skills (goose) — different adapters, no duplicate-scan;
    // only the goose data-loss trigger fires
    const warnings = collectFanOutWarnings(['.claude/skills', '.goose/skills'])
    expect(warnings.filter(w => w.message.includes('fan-out dirs'))).toEqual([])
  })
})

describe('wouldCreateCycle — opencode #45961 ENAMETOOLONG class', () => {
  it('source inside fan-out dir is a cycle risk', () => {
    expect(wouldCreateCycle('/proj/.agents/skills/foo', '/proj/.agents/skills')).toBe(true)
    expect(wouldCreateCycle('/proj/.agents/skills', '/proj/.agents/skills')).toBe(true)
  })

  it('sibling/cold-pool sources are safe (normal deck shape)', () => {
    expect(wouldCreateCycle('/home/user/.agents/skill-repos/x', '/proj/.claude/skills')).toBe(false)
    expect(wouldCreateCycle('/proj/.agents/skills2/foo', '/proj/.agents/skills')).toBe(false)
  })
})
