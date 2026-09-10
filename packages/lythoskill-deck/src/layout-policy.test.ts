#!/usr/bin/env bun
/**
 * layout-policy.test.ts — fan-out 策略检查 + 循环链守卫
 *
 * Dormancy 纪律:默认 deck(.claude/skills + .agents/skills)零警告;
 * 危险/误配置才发声。docs 级行为不变是 AC,这里是它的测试。
 *
 * Run: bun test packages/lythoskill-deck/src/layout-policy.test.ts
 */

import { describe, it, expect } from 'bun:test'
import { collectFanOutWarnings } from './layout-policy.ts'
import { wouldCreateCycle, parseAcknowledgedUnlisted } from './link.ts'

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
  it('same CLI scanning two fan-out dirs warns with duplicate-name ref', () => {
    const warnings = collectFanOutWarnings(['.claude/skills', '.agents/skills', 'plugins/x/.agents/skills'])
    const opencodeDup = warnings.find(w => w.ref.match(/46327/))
    expect(opencodeDup).toBeDefined()
    expect(opencodeDup!.message).toMatch(/scans 2 fan-out dirs/)
  })

  it('two DIFFERENT CLIs sharing a convention is fine (single dir each)', () => {
    // .claude/skills (claude) + .goose/skills (goose) — different CLIs, no duplicate-scan;
    // only the goose data-loss trigger fires
    const warnings = collectFanOutWarnings(['.claude/skills', '.goose/skills'])
    expect(warnings.filter(w => w.message.includes('fan-out dirs'))).toEqual([])
  })
})

describe('collectFanOutWarnings — unlisted targets (B18, ADR-20260910120047122)', () => {
  it('a target no CLI scans emits ONE info line, not silence', () => {
    const warnings = collectFanOutWarnings(['.claude/skills', '.some-new-cli/skills'])
    expect(warnings).toHaveLength(1)
    expect(warnings[0].severity).toBe('info')
    expect(warnings[0].message).toBe('.some-new-cli/skills: no layout data — hazards unknown')
    expect(warnings[0].ref).toContain('acknowledged_unlisted')
  })

  it('absolute form of an unlisted dir is recognized too', () => {
    const warnings = collectFanOutWarnings(['/proj/.some-new-cli/skills'])
    expect(warnings.map(w => w.severity)).toEqual(['info'])
  })

  it('two listed targets get a line each (no over-eager merging)', () => {
    // 刻意不去重:`~/.x/skills`(家目录)与 `.x/skills`(项目内)是两个真目录,
    // 合并键会把其中一个的行吞掉。重复的目标多一行 info,代价是零。
    const warnings = collectFanOutWarnings(['.a/skills', '~/.a/skills'])
    expect(warnings).toHaveLength(2)
  })

  it('acknowledged_unlisted earns silence — the declaration is the source', () => {
    const targets = ['.claude/skills', '.some-new-cli/skills']
    expect(collectFanOutWarnings(targets, {
      acknowledgedUnlisted: ['.some-new-cli/skills'],
    })).toEqual([])
  })

  it('acknowledgement matches by suffix, so relative pattern covers absolute target', () => {
    expect(collectFanOutWarnings(['/home/u/proj/.some-new-cli/skills'], {
      acknowledgedUnlisted: ['.some-new-cli/skills'],
    })).toEqual([])
  })

  it('an acknowledgement does NOT suppress a real data-loss hazard', () => {
    // 豁免只关掉「无数据」这条;名单内的危险仍然发声 —— 否则它就是个静音开关
    const warnings = collectFanOutWarnings(['.goose/skills'], {
      acknowledgedUnlisted: ['.goose/skills'],
    })
    expect(warnings.map(w => w.severity)).toEqual(['data-loss'])
  })

  it('unlisted info does not displace hazard lines (info sorts last)', () => {
    const warnings = collectFanOutWarnings(['.goose/skills', '.some-new-cli/skills'])
    expect(warnings.map(w => w.severity)).toEqual(['data-loss', 'info'])
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

describe('parseAcknowledgedUnlisted — TOML shape tolerance', () => {
  it('absent / non-array → no exemptions', () => {
    expect(parseAcknowledgedUnlisted(undefined)).toEqual([])
    expect(parseAcknowledgedUnlisted('.some-cli/skills')).toEqual([])
  })

  it('keeps strings, trims, drops non-strings and blanks', () => {
    expect(parseAcknowledgedUnlisted([' .a/skills ', 3, '', null, '.b/skills']))
      .toEqual(['.a/skills', '.b/skills'])
  })
})
