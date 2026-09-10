#!/usr/bin/env bun
/**
 * ZK re-trial adversarial cases — NOT part of the repo suite.
 * Run: cd /Users/chariots/Downloads/lythoskill-main && bun test /tmp/arena-p2-adapter-retrial/adversarial.test.ts
 */
import { describe, it, expect, afterEach } from 'bun:test'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync, lstatSync, existsSync, readdirSync, readFileSync, readlinkSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'

import { linkDeck } from '/Users/chariots/Downloads/lythoskill-main/packages/lythoskill-deck/src/link.ts'
import { collectFanOutWarnings } from '/Users/chariots/Downloads/lythoskill-main/packages/lythoskill-deck/src/adapter-policy.ts'
import { removeSymlinkOnly } from '/Users/chariots/Downloads/lythoskill-main/packages/lythoskill-deck/src/safe-remove.ts'

let cleanup: string[] = []
afterEach(() => {
  for (const dir of cleanup) rmSync(dir, { recursive: true, force: true })
  cleanup = []
})
function makeTmp(): string {
  const dir = mkdtempSync(join(tmpdir(), 'zk-adv-'))
  cleanup.push(dir)
  return dir
}

function silence() {
  const orig = { log: console.log, warn: console.warn, error: console.error }
  console.log = () => {}; console.warn = () => {}; console.error = () => {}
  return () => { console.log = orig.log; console.warn = orig.warn; console.error = orig.error }
}

function makeDeck(root: string, extra: string[]): string {
  const coldPool = join(root, 'pool')
  const skillDir = join(coldPool, 'localhost', 'me', 'adv-skill')
  mkdirSync(skillDir, { recursive: true })
  writeFileSync(join(skillDir, 'SKILL.md'), '---\nname: adv-skill\n---\n')
  const deckPath = join(root, 'skill-deck.toml')
  writeFileSync(deckPath, [
    '[deck]',
    'max_cards = 10',
    'working_set = ".claude/skills"',
    'cold_pool = "./pool"',
    `also_link_to = [${extra.map(e => `"${e}"`).join(', ')}]`,
    '',
    '[innate.skills.adv-skill]',
    'path = "localhost/me/adv-skill"',
    '',
  ].join('\n'))
  return deckPath
}

describe('ADV-1: broken symlink in working set, cold pool intact', () => {
  it('undeclared broken symlink swept; declared skill relinked; cold pool byte-identical', async () => {
    const root = makeTmp()
    const deckPath = makeDeck(root, ['.agents/skills'])
    const coldSkill = join(root, 'pool', 'localhost', 'me', 'adv-skill')
    // pre-seed working set with a BROKEN undeclared symlink + a stale declared one
    const ws = join(root, '.claude', 'skills')
    mkdirSync(ws, { recursive: true })
    symlinkSync(join(root, 'pool', 'localhost', 'me', 'ghost'), join(ws, 'ghost')) // broken
    symlinkSync(join(coldSkill, 'nonexistent-old'), join(ws, 'adv-skill'))        // declared but stale/broken
    const restore = silence()
    try {
      await linkDeck(deckPath, root, { noBackup: true, skipHealthFetch: true })
    } finally { restore() }
    expect(existsSync(join(ws, 'ghost'))).toBe(false)          // broken undeclared swept
    expect(lstatSync(join(ws, 'adv-skill')).isSymbolicLink()).toBe(true) // relinked
    expect(resolve(readlinkSync(join(ws, 'adv-skill')))).toBe(resolve(coldSkill))
    expect(readFileSync(join(coldSkill, 'SKILL.md'), 'utf-8')).toContain('adv-skill')
  })
})

describe('ADV-2: also_link_to with trailing slash / home-relative path — dormancy', () => {
  it('trailing slash on default pair still zero warnings', () => {
    expect(collectFanOutWarnings(['.claude/skills/', '.agents/skills/'])).toEqual([])
  })
  it('deep absolute path with trailing slash matches', () => {
    expect(collectFanOutWarnings(['/p/q/.goose/skills/'])).toHaveLength(1)
  })
  it('home-relative also_link_to duplicate-root warns (two claude-code roots)', () => {
    // working_set=.claude/skills + also_link_to=[~/.claude/skills] → claude-code scans 2 roots
    const w = collectFanOutWarnings(['/proj/.claude/skills', `${process.env.HOME}/.claude/skills`])
    expect(w.some(x => x.message.includes('Claude Code scans 2'))).toBe(true)
  })
})

describe('ADV-3: Cline .clinerules fan-out when .clinerules is a FILE (common layout)', () => {
  it('linkDeck with also_link_to=[".clinerules"] and .clinerules as file — graceful or crash?', async () => {
    const root = makeTmp()
    const deckPath = makeDeck(root, ['.clinerules'])
    writeFileSync(join(root, '.clinerules'), '# rules file\n') // FILE, the common Cline layout
    const restore = silence()
    let err: any = null
    try {
      await linkDeck(deckPath, root, { noBackup: true, skipHealthFetch: true })
    } catch (e) { err = e } finally { restore() }
    // Document actual behavior for the report
    if (err) {
      console.log('ADV-3 RESULT: linkDeck THREW:', err.code || err.message)
    } else {
      console.log('ADV-3 RESULT: linkDeck survived; .clinerules still file:', !existsSync(join(root, '.clinerules', 'adv-skill')))
    }
    expect(true).toBe(true) // record behavior, don't gate
  })

  it('.clinerules as DIR gets snapshot (real dir), not symlink', async () => {
    const root = makeTmp()
    const deckPath = makeDeck(root, ['.clinerules'])
    mkdirSync(join(root, '.clinerules'), { recursive: true }) // DIR layout
    const restore = silence()
    try {
      await linkDeck(deckPath, root, { noBackup: true, skipHealthFetch: true })
    } finally { restore() }
    const entry = join(root, '.clinerules', 'adv-skill')
    expect(existsSync(entry)).toBe(true)
    expect(lstatSync(entry).isSymbolicLink()).toBe(false) // snapshot copy per cline hazard
    expect(readFileSync(join(entry, 'SKILL.md'), 'utf-8')).toContain('adv-skill')
  })
})

describe('ADV-4: snapshot mode + source inside fan-out dir (cycle-guard bypass via mode)', () => {
  it('cpSync does not recurse infinitely / clobber source', async () => {
    const root = makeTmp()
    const skillDir = join(root, '.claude', 'skills', '_src', 'snap-skill')
    mkdirSync(skillDir, { recursive: true })
    writeFileSync(join(skillDir, 'SKILL.md'), '---\nname: snap-skill\n---\n')
    const deckPath = join(root, 'skill-deck.toml')
    writeFileSync(deckPath, [
      '[deck]', 'max_cards = 10', 'working_set = ".claude/skills"', 'cold_pool = "./pool"', '',
      '[transient.snap-skill]', 'path = ".claude/skills/_src/snap-skill"', '',
    ].join('\n'))
    const restore = silence()
    let err: any = null
    try {
      await linkDeck(deckPath, root, { noBackup: true, skipHealthFetch: true, mode: 'snapshot' })
    } catch (e) { err = e } finally { restore() }
    expect(err).toBeNull()
    // source survived
    expect(readFileSync(join(skillDir, 'SKILL.md'), 'utf-8')).toContain('snap-skill')
  })
})

describe('ADV-5: removeSymlinkOnly on symlink-to-symlink chain', () => {
  it('removes only the top link; chain target untouched', () => {
    const root = makeTmp()
    const real = join(root, 'real')
    mkdirSync(real, { recursive: true })
    writeFileSync(join(real, 'SKILL.md'), 'precious')
    const mid = join(root, 'mid')
    symlinkSync(real, mid)
    const top = join(root, 'top')
    symlinkSync(mid, top)
    expect(removeSymlinkOnly(top)).toBe(true)
    expect(existsSync(mid)).toBe(true) // mid chain intact
    expect(readFileSync(join(real, 'SKILL.md'), 'utf-8')).toBe('precious')
  })
})

describe('ADV-6: linkDeck default-pair real output has zero adapter warnings (E2E via warnings capture)', () => {
  it('no [data-loss]/[warning] adapter tags on default deck', async () => {
    const root = makeTmp()
    const deckPath = makeDeck(root, ['.agents/skills'])
    const captured: string[] = []
    const orig = console.warn
    console.warn = (...a: any[]) => { captured.push(a.join(' ')) }
    try {
      await linkDeck(deckPath, root, { noBackup: true, skipHealthFetch: true })
    } finally { console.warn = orig }
    const adapterWarns = captured.filter(w => w.includes('[data-loss]') || w.includes('[warning]'))
    expect(adapterWarns).toEqual([])
  })
})

describe('ADV-7: also_link_to containing BOTH .agents/skills and a nested duplicate root', () => {
  it('dup-scan warns once per adapter even with 3 roots', () => {
    const w = collectFanOutWarnings(['.claude/skills', '.agents/skills', 'plugins/x/.agents/skills', 'plugins/y/.agents/skills'])
    const dup = w.filter(x => x.message.includes('fan-out dirs'))
    expect(dup).toHaveLength(1) // one entry per adapter, not per pair
    expect(dup[0].message).toMatch(/scans 3 fan-out dirs/)
  })
})
