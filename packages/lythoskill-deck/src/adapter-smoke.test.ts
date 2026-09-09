#!/usr/bin/env bun
/**
 * adapter-smoke.test.ts — pinned-version smoke: deck link against docs-tier dirs
 *
 * 探针纪律的落地项(round-2 adapter depreciation discipline item c):
 * fixture deck → linkDeck → docs-tier fan-out 目录里的每个条目都必须满足
 *   1) 是 symlink(非拷贝)  2) 绝对路径  3) 无环  4) 解析到含 SKILL.md 的目录
 * 且默认 fan-out 对零 adapter 警告(dormancy)。
 *
 * Run: bun test packages/lythoskill-deck/src/adapter-smoke.test.ts
 */

import { describe, it, expect, afterEach } from 'bun:test'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, lstatSync, readlinkSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve, isAbsolute } from 'node:path'
import { tmpdir } from 'node:os'

import { linkDeck, wouldCreateCycle } from './link.ts'

let cleanup: string[] = []
const warnings: string[] = []
const origWarn = console.warn

afterEach(() => {
  for (const dir of cleanup) rmSync(dir, { recursive: true, force: true })
  cleanup = []
  warnings.length = 0
  console.warn = origWarn
})

function makeTmp(): string {
  const dir = mkdtempSync(join(tmpdir(), 'deck-smoke-'))
  cleanup.push(dir)
  return dir
}

function makeDocsTierDeck(root: string): { deckPath: string; skillDir: string } {
  const coldPool = join(root, 'pool')
  const skillDir = join(coldPool, 'localhost', 'me', 'docs-tier-skill')
  mkdirSync(skillDir, { recursive: true })
  writeFileSync(join(skillDir, 'SKILL.md'), '---\nname: docs-tier-skill\n---\n')

  const deckPath = join(root, 'skill-deck.toml')
  writeFileSync(deckPath, [
    '[deck]',
    'max_cards = 10',
    'working_set = ".claude/skills"',       // claude-code (docs tier)
    'cold_pool = "./pool"',
    // docs-tier branded dirs, deliberately NOT mixing with the shared
    // .agents/skills (that combo = same adapter scanning two roots = dup WARN)
    'also_link_to = [".roo/skills", ".gemini/skills"]',
    '',
    '[innate.skills.docs-tier-skill]',
    'path = "localhost/me/docs-tier-skill"',
    '',
  ].join('\n'))
  return { deckPath, skillDir }
}

function captureWarnings() {
  warnings.length = 0
  console.warn = (...args: any[]) => { warnings.push(args.join(' ')) }
}

describe('docs-tier smoke — deck link against docs-tier fan-out dirs', () => {
  it('every entry is an absolute, acyclic symlink resolving to a SKILL.md dir', async () => {
    const root = makeTmp()
    const { deckPath, skillDir } = makeDocsTierDeck(root)
    captureWarnings()

    await linkDeck(deckPath, root, { noBackup: true, skipHealthFetch: true })

    for (const rel of ['.claude/skills', '.roo/skills', '.gemini/skills']) {
      const dir = join(root, rel)
      const entries = readdirSync(dir)
      expect(entries).toContain('docs-tier-skill')
      const entryPath = join(dir, 'docs-tier-skill')
      const st = lstatSync(entryPath)
      expect(st.isSymbolicLink(), `${rel} entry must stay a symlink`).toBe(true)
      const target = readlinkSync(entryPath)
      expect(isAbsolute(target), `${rel} link must be absolute`).toBe(true)
      expect(wouldCreateCycle(target, dir)).toBe(false)
      expect(resolve(target)).toBe(resolve(skillDir))
      expect(readFileSync(join(entryPath, 'SKILL.md'), 'utf-8')).toContain('docs-tier-skill')
    }
  })

  it('default + docs-tier fan-out emits ZERO adapter warnings (dormancy)', async () => {
    const root = makeTmp()
    const { deckPath } = makeDocsTierDeck(root)
    captureWarnings()

    await linkDeck(deckPath, root, { noBackup: true, skipHealthFetch: true })

    const adapterWarnings = warnings.filter(w => w.includes('[data-loss]') || w.includes('[warning]') || w.includes('[adapter]'))
    expect(adapterWarnings).toEqual([])
  })

  it('hazard-triggering fan-out (.goose/skills) DOES warn at link time', async () => {
    const root = makeTmp()
    const { deckPath } = makeDocsTierDeck(root)
    // add goose-scanned branded dir to the fan-out
    const raw = readFileSync(deckPath, 'utf-8').replace(
      'also_link_to = [".roo/skills", ".gemini/skills"]',
      'also_link_to = [".agents/skills", ".goose/skills"]'
    )
    writeFileSync(deckPath, raw)
    captureWarnings()

    await linkDeck(deckPath, root, { noBackup: true, skipHealthFetch: true })

    const all = warnings.join('\n')
    expect(all).toContain('[data-loss]')
    expect(all).toContain('Goose')
    expect(all).toMatch(/11600/)
  })

  it('cycle-class layout is refused, not created', async () => {
    const root = makeTmp()
    const coldPool = join(root, 'pool')
    // source INSIDE the fan-out dir (self-referencing class, opencode #45961).
    // '_src' top-level dir: reconcileTargetDir sweep skips _-prefixed entries,
    // so the source survives to exercise the guard itself.
    const skillDir = join(root, '.claude', 'skills', '_src', 'loop-skill')
    mkdirSync(skillDir, { recursive: true })
    writeFileSync(join(skillDir, 'SKILL.md'), '---\nname: loop-skill\n---\n')
    const deckPath = join(root, 'skill-deck.toml')
    // transient skill whose path is inside the working set
    writeFileSync(deckPath, [
      '[deck]',
      'max_cards = 10',
      'working_set = ".claude/skills"',
      `cold_pool = "${coldPool}"`,
      '',
      '[transient.loop-skill]',
      'path = ".claude/skills/_src/loop-skill"',
      '',
    ].join('\n'))

    await linkDeck(deckPath, root, { noBackup: true, skipHealthFetch: true })
    // loop-skill source is inside the fan-out dir → refused at BOTH link sites,
    // source untouched, no self-referencing symlink created
    const st = lstatSync(join(root, '.claude', 'skills', 'loop-skill'), { throwIfNoEntry: false })
    expect(st?.isSymbolicLink() ?? false).toBe(false)
    expect(readFileSync(join(skillDir, 'SKILL.md'), 'utf-8')).toContain('loop-skill')
  })
})
