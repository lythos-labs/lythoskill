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

import { removeSymlinkOnly, removeEntryForRelink, type OwnershipContext } from './safe-remove.ts'
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

describe('removeEntryForRelink — 归属判定先行(k8s ownerReferences)', () => {
  /** 空账本:什么都没认领过。所有"外来"判定的基线。 */
  function ctxFor(coldPool: string, managed: string[] = []): OwnershipContext {
    return { coldPool: resolve(coldPool), managedDests: new Set(managed.map(p => resolve(p))) }
  }

  it('owned symlink → link gone, cold-pool target byte-identical', () => {
    const root = makeTmp()
    const { coldPool, skillDir } = makeColdPoolSkill(root)
    const ws = join(root, 'ws')
    mkdirSync(ws, { recursive: true })
    const link = join(ws, 'precious')
    symlinkSync(skillDir, link)

    const outcome = removeEntryForRelink(link, ctxFor(coldPool))
    expect(outcome).toEqual({ removed: true, via: 'symlink-into-coldpool' })
    expect(existsSync(link)).toBe(false)
    expect(readFileSync(join(skillDir, 'SKILL.md'), 'utf-8')).toBe(COLD_CONTENT)
  })

  it('REFUSES a real directory the deck never recorded, and leaves it intact', () => {
    // 曾经的形态:无条件 rmSync(recursive) —— 一道"清位"就能吃掉用户手写的
    // skill、别的项目的 fan-out 目录。安全边界是所有权,不是目录包含关系。
    const root = makeTmp()
    const { coldPool } = makeColdPoolSkill(root)
    const ws = join(root, 'ws')
    const foreign = join(ws, 'handwritten')
    mkdirSync(foreign, { recursive: true })
    writeFileSync(join(foreign, 'SKILL.md'), '---\nname: mine\n---\n# 用户手写的\n')

    const outcome = removeEntryForRelink(foreign, ctxFor(coldPool))
    expect(outcome.removed).toBe(false)
    if (outcome.removed) throw new Error('unreachable')
    expect(outcome.present).toBe(true)
    expect(outcome.reason).toContain('cannot prove it created it')
    // 目录与内容原封不动 —— 这是这条防线存在的全部意义
    expect(existsSync(foreign)).toBe(true)
    expect(readFileSync(join(foreign, 'SKILL.md'), 'utf-8')).toContain('用户手写的')
  })

  it('removes a real directory the deck DID record (its own pinned snapshot)', () => {
    const root = makeTmp()
    const { coldPool } = makeColdPoolSkill(root)
    const ws = join(root, 'ws')
    const snap = join(ws, 'oldsnap')
    mkdirSync(snap, { recursive: true })
    writeFileSync(join(snap, 'SKILL.md'), 'x')

    const outcome = removeEntryForRelink(snap, ctxFor(coldPool, [snap]))
    expect(outcome).toEqual({ removed: true, via: 'state-record' })
    expect(existsSync(snap)).toBe(false)
  })

  it('REFUSES a symlink pointing outside this deck cold pool (another project / global config)', () => {
    const root = makeTmp()
    const { coldPool } = makeColdPoolSkill(root)
    const otherProject = join(root, 'other-project', 'skill')
    mkdirSync(otherProject, { recursive: true })
    writeFileSync(join(otherProject, 'SKILL.md'), '---\nname: theirs\n---\n')
    const ws = join(root, 'ws')
    mkdirSync(ws, { recursive: true })
    const link = join(ws, 'theirs')
    symlinkSync(otherProject, link)

    const outcome = removeEntryForRelink(link, ctxFor(coldPool))
    expect(outcome.removed).toBe(false)
    if (outcome.removed) throw new Error('unreachable')
    expect(outcome.reason).toContain('outside this deck')
    expect(lstatSync(link).isSymbolicLink()).toBe(true)
    expect(existsSync(join(otherProject, 'SKILL.md'))).toBe(true)
  })

  it('missing path → present:false, so callers proceed with creation', () => {
    const root = makeTmp()
    const { coldPool } = makeColdPoolSkill(root)
    const outcome = removeEntryForRelink(join(root, 'ws', 'nope'), ctxFor(coldPool))
    expect(outcome).toEqual({ removed: false, present: false })
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
