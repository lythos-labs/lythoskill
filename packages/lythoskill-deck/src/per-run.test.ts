#!/usr/bin/env bun
/**
 * per-run.test.ts — per-run 渲染(zero-projection path)
 *
 * Run: bun test packages/lythoskill-deck/src/per-run.test.ts
 */

import { describe, it, expect, afterEach } from 'bun:test'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'

import { renderPerRun, perRun, type PerRunIO } from './per-run.ts'

let cleanup: string[] = []
afterEach(() => {
  for (const dir of cleanup) rmSync(dir, { recursive: true, force: true })
  cleanup = []
})
function makeTmp(): string {
  const dir = mkdtempSync(join(tmpdir(), 'deck-pr-'))
  cleanup.push(dir)
  return dir
}

describe('renderPerRun — kimi (flag, repeatable)', () => {
  it('renders repeatable --skills-dir flags + persistent extra_skill_dirs', () => {
    const r = renderPerRun('kimi', ['/a/.claude/skills', '/a/.agents/skills'])
    expect(r.error).toBeUndefined()
    expect(r.argv).toEqual(['--skills-dir', '/a/.claude/skills', '--skills-dir', '/a/.agents/skills'])
    expect(r.configLines).toEqual(['extra_skill_dirs = ["/a/.claude/skills","/a/.agents/skills"]'])
  })

  it('single target renders one flag pair', () => {
    const r = renderPerRun('kimi', ['/a/.claude/skills'])
    expect(r.argv).toEqual(['--skills-dir', '/a/.claude/skills'])
  })
})

describe('renderPerRun — crush (config, single-path)', () => {
  it('renders option skill-path config line', () => {
    const r = renderPerRun('crush', ['/a/.claude/skills'])
    expect(r.error).toBeUndefined()
    expect(r.argv).toEqual([])
    expect(r.configLines).toEqual(['option skill-path /a/.claude/skills'])
  })

  it('multiple targets → one option line per dir + note', () => {
    const r = renderPerRun('crush', ['/a', '/b'])
    expect(r.configLines).toEqual(['option skill-path /a', 'option skill-path /b'])
    expect(r.notes.join(' ')).toMatch(/single-path/)
  })
})

describe('renderPerRun — unsupported adapters', () => {
  it('role-kind adapter (roo-code) is refused with reason', () => {
    const r = renderPerRun('roo-code', ['/a'])
    expect(r.error).toMatch(/role/)
    expect(r.error).toMatch(/kimi/)
  })

  it('none-kind adapter (codex) explains its mechanism', () => {
    const r = renderPerRun('codex', ['/a'])
    expect(r.error).toMatch(/--profile switches config, not skills/)
  })

  it('unknown id lists supported adapters', () => {
    const r = renderPerRun('nope', ['/a'])
    expect(r.error).toMatch(/Unknown CLI/)
    expect(r.error).toMatch(/kimi/)
    expect(r.error).toMatch(/crush/)
  })
})

describe('perRun CLI — renders from deck state with zero side effects', () => {
  function makeDeck(root: string): string {
    const deckPath = join(root, 'skill-deck.toml')
    writeFileSync(deckPath, [
      '[deck]',
      'max_cards = 10',
      'working_set = ".claude/skills"',
      'cold_pool = "./pool"',
      'also_link_to = [".agents/skills"]',
      '',
    ].join('\n'))
    return deckPath
  }

  it('renders kimi invocation from working_set + also_link_to, absolute paths', () => {
    const root = makeTmp()
    const deckPath = makeDeck(root)
    const logs: string[] = []
    const io: PerRunIO = { error: (m) => { throw new Error(m) }, exit: () => { throw new Error('unexpected exit') }, log: (m) => logs.push(m) }

    perRun('kimi', deckPath, root, io)

    const out = logs.join('\n')
    expect(out).toMatch(/zero-projection/)
    expect(out).toContain(`kimi --skills-dir ${resolve(root, '.claude/skills')} --skills-dir ${resolve(root, '.agents/skills')}`)
    expect(out).toContain('extra_skill_dirs')
  })

  it('ZERO side effects: no dirs, no links, no files created (smoke)', () => {
    const root = makeTmp()
    const deckPath = makeDeck(root)
    const io: PerRunIO = { error: () => {}, exit: (c) => { throw new Error(`exit ${c}`) }, log: () => {} }

    perRun('kimi', deckPath, root, io)
    perRun('crush', deckPath, root, io)

    // project dir still contains ONLY skill-deck.toml
    expect(readdirSync(root)).toEqual(['skill-deck.toml'])
    expect(existsSync(join(root, '.claude', 'skills'))).toBe(false)
    expect(existsSync(join(root, '.agents', 'skills'))).toBe(false)
  })

  it('missing deck exits 1 with agent-facing error', () => {
    const root = makeTmp()
    let code: number | undefined
    const io: PerRunIO = { error: () => {}, exit: (c) => { code = c ?? 0 }, log: () => {} }
    perRun('kimi', join(root, 'nope.toml'), root, io)
    expect(code).toBe(1)
  })
})
