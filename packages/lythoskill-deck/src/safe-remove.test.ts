#!/usr/bin/env bun
/**
 * safe-remove.test.ts — Goose #11600 防线 + remove.ts dormancy
 *
 * 不变式(dormancy 守护):deck 的 unlink 路径删除 symlink 时,
 * cold pool 真身(链接目标)的内容一个 byte 都不动。
 *
 * Run: bun test packages/lythoskill-deck/src/safe-remove.test.ts
 */

import { describe, it, expect, afterEach } from 'bun:test'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync, lstatSync, existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'

import { removeSymlinkOnly, removeEntryForRelink } from './safe-remove.ts'
import { removeSkill, type DeckIO } from './remove.ts'

let cleanup: string[] = []
afterEach(() => {
  for (const dir of cleanup) rmSync(dir, { recursive: true, force: true })
  cleanup = []
})
function makeTmp(): string {
  const dir = mkdtempSync(join(tmpdir(), 'deck-rm-'))
  cleanup.push(dir)
  return dir
}

const COLD_CONTENT = '---\nname: precious\ndescription: cold pool content\n---\n# precious\n'

function makeColdPoolSkill(root: string): { coldPool: string; skillDir: string } {
  const coldPool = join(root, 'pool')
  const skillDir = join(coldPool, 'localhost', 'me', 'precious')
  mkdirSync(skillDir, { recursive: true })
  writeFileSync(join(skillDir, 'SKILL.md'), COLD_CONTENT)
  return { coldPool, skillDir }
}

const silentIO: DeckIO = {
  error: () => {},
  exit: () => { throw new Error('unexpected exit') },
  warn: () => {},
  log: () => {},
}

describe('removeSymlinkOnly', () => {
  it('removes the link; cold-pool target content survives byte-identical (Goose #11600 dormancy)', () => {
    const root = makeTmp()
    const { skillDir } = makeColdPoolSkill(root)
    const ws = join(root, '.goose', 'skills')
    mkdirSync(ws, { recursive: true })
    const link = join(ws, 'precious')
    symlinkSync(skillDir, link)

    expect(removeSymlinkOnly(link)).toBe(true)
    expect(existsSync(link)).toBe(false)                      // link gone
    expect(existsSync(join(skillDir, 'SKILL.md'))).toBe(true) // target alive
    expect(readFileSync(join(skillDir, 'SKILL.md'), 'utf-8')).toBe(COLD_CONTENT)
  })

  it('removes broken symlinks (existsSync-based code leaked these)', () => {
    const root = makeTmp()
    const ws = join(root, '.claude', 'skills')
    mkdirSync(ws, { recursive: true })
    const link = join(ws, 'ghost')
    symlinkSync(join(root, 'nowhere'), link)
    expect(existsSync(link)).toBe(false) // broken: existsSync follows the link
    expect(removeSymlinkOnly(link)).toBe(true)
    expect(lstatSync(link, { throwIfNoEntry: false })).toBeUndefined()
  })

  it('never touches a real directory', () => {
    const root = makeTmp()
    const real = join(root, 'realskill')
    mkdirSync(real, { recursive: true })
    writeFileSync(join(real, 'SKILL.md'), COLD_CONTENT)
    expect(removeSymlinkOnly(real)).toBe(false)
    expect(existsSync(join(real, 'SKILL.md'))).toBe(true)
  })

  it('no-op on missing path', () => {
    expect(removeSymlinkOnly(join(makeTmp(), 'nope'))).toBe(false)
  })
})

describe('removeEntryForRelink', () => {
  it('symlink → link gone, target intact; real dir → removed recursively', () => {
    const root = makeTmp()
    const { skillDir } = makeColdPoolSkill(root)
    const link = join(root, 'ws', 'precious')
    mkdirSync(join(root, 'ws'), { recursive: true })
    symlinkSync(skillDir, link)
    removeEntryForRelink(link)
    expect(existsSync(link)).toBe(false)
    expect(existsSync(join(skillDir, 'SKILL.md'))).toBe(true)

    const real = join(root, 'ws', 'oldsnap')
    mkdirSync(real, { recursive: true })
    writeFileSync(join(real, 'SKILL.md'), 'x')
    removeEntryForRelink(real)
    expect(existsSync(real)).toBe(false)
  })
})

describe('removeSkill end-to-end — the unlink path must not touch the cold pool', () => {
  function makeDeck(root: string, coldPoolRel: string): string {
    const deckPath = join(root, 'skill-deck.toml')
    writeFileSync(deckPath, [
      '[deck]',
      'max_cards = 10',
      'working_set = ".claude/skills"',
      `cold_pool = "${coldPoolRel}"`,
      'also_link_to = [".agents/skills", ".goose/skills"]',
      '',
      '[innate.skills.precious]',
      'path = "localhost/me/precious"',
      '',
    ].join('\n'))
    return deckPath
  }

  function linkEverywhere(root: string, coldPool: string): void {
    const skillDir = join(coldPool, 'localhost', 'me', 'precious')
    for (const rel of ['.claude/skills', '.agents/skills', '.goose/skills']) {
      const dir = join(root, rel)
      mkdirSync(dir, { recursive: true })
      symlinkSync(skillDir, join(dir, 'precious'))
    }
  }

  it('removes deck entry + all working-set links; cold pool survives (dormancy AC)', () => {
    const root = makeTmp()
    const { coldPool } = makeColdPoolSkill(root)
    const deckPath = makeDeck(root, './pool')
    linkEverywhere(root, coldPool)

    removeSkill('precious', deckPath, root, silentIO)

    // deck.toml entry gone
    expect(readFileSync(deckPath, 'utf-8')).not.toContain('precious')
    // all links gone
    for (const rel of ['.claude/skills', '.agents/skills', '.goose/skills']) {
      expect(lstatSync(join(root, rel, 'precious'), { throwIfNoEntry: false })).toBeUndefined()
    }
    // cold pool content byte-identical — the Goose #11600 invariant
    expect(readFileSync(join(coldPool, 'localhost', 'me', 'precious', 'SKILL.md'), 'utf-8')).toBe(COLD_CONTENT)
  })

  it('removes a BROKEN working-set link too (old existsSync path left it and reported "not found")', () => {
    const root = makeTmp()
    const { coldPool } = makeColdPoolSkill(root)
    const deckPath = makeDeck(root, './pool')
    linkEverywhere(root, coldPool)
    // simulate cold-pool dir renamed out from under the link → broken symlink
    rmSync(join(coldPool, 'localhost', 'me', 'precious'), { recursive: true, force: true })

    removeSkill('precious', deckPath, root, silentIO)

    for (const rel of ['.claude/skills', '.agents/skills', '.goose/skills']) {
      expect(lstatSync(join(root, rel, 'precious'), { throwIfNoEntry: false })).toBeUndefined()
    }
  })

  it('does not create stray files in the cold pool', () => {
    const root = makeTmp()
    const { coldPool } = makeColdPoolSkill(root)
    const deckPath = makeDeck(root, './pool')
    linkEverywhere(root, coldPool)
    const before = readdirSync(join(coldPool, 'localhost', 'me', 'precious')).sort()
    removeSkill('precious', deckPath, root, silentIO)
    const after = readdirSync(join(coldPool, 'localhost', 'me', 'precious')).sort()
    expect(after).toEqual(before)
  })
})
