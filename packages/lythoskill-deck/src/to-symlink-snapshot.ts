#!/usr/bin/env bun
/**
 * deck to-symlink/to-snapshot — switch a skill's link mode in the working set.
 *
 * Per ADR-20260507190157540: snapshot = default safe (cp, pinned), symlink = live (follows cold pool).
 * Per ADR-20260509144134332: command verbs renamed from sync/freeze to to-symlink/to-snapshot
 * to align with schema mode field and avoid collision with `deck link` (the reconcile primitive).
 */

import { existsSync, readFileSync, writeFileSync, rmSync, symlinkSync, cpSync, lstatSync } from 'node:fs'
import { resolve, dirname, join, relative } from 'node:path'
import { homedir } from 'node:os'
import { findDeckToml, expandHome } from './link.js'
import { parseDeck } from './parse-deck.js'
import { removeEntryForRelink, deckOwnsEntry } from './safe-remove.js'
import { readStateFile, writeStateFile, ownershipContextFor } from './state-file.js'
import { ColdPool, parseLocator } from '@lythos/cold-pool'
import { findSource } from './link.js'
import { parse as parseToml } from '@iarna/toml'
import type { SkillDeckLock, SkillDeckState } from './schema.js'
import { validateAlias } from './path-guard.js'

export interface SymlinkSnapshotIO {
  cwd: () => string;
  exit: (code?: number) => never;
  log: (msg: string) => void;
  error: (msg: string) => void;
}

const defaultIO: SymlinkSnapshotIO = {
  cwd: () => process.cwd(),
  exit: (code?: number) => process.exit(code ?? 0),
  log: (msg: string) => console.log(msg),
  error: (msg: string) => console.error(msg),
};

function readLock(projectDir: string): SkillDeckLock | null {
  const lockPath = join(projectDir, 'skill-deck.lock')
  if (!existsSync(lockPath)) return null
  try {
    return JSON.parse(readFileSync(lockPath, 'utf-8'))
  } catch {
    return null
  }
}

function writeLock(projectDir: string, lock: SkillDeckLock): void {
  const lockPath = join(projectDir, 'skill-deck.lock')
  writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n')
}

function readState(projectDir: string): SkillDeckState | null {
  return readStateFile(projectDir)
}

function writeState(projectDir: string, state: SkillDeckState): void {
  writeStateFile(projectDir, state)
}

function getProjectAndDeck(cliDeckPath?: string, cliWorkdir?: string, io: SymlinkSnapshotIO = defaultIO) {
  const cliDeck = cliDeckPath || process.argv.find((_, i, a) => a[i - 1] === '--deck')
  const DECK_PATH = cliDeck
    ? resolve(cliDeck)
    : findDeckToml(io.cwd()) || resolve('skill-deck.toml')

  if (!existsSync(DECK_PATH)) {
    io.error(`❌ skill-deck.toml not found in ${io.cwd()}`)
    io.exit(1)
  }

  const PROJECT_DIR = cliWorkdir ? resolve(cliWorkdir) : dirname(DECK_PATH)
  const deckRaw = readFileSync(DECK_PATH, 'utf-8')
  const deck = parseToml(deckRaw) as any
  const WORKING_SET = expandHome(deck.deck?.working_set || '.claude/skills', PROJECT_DIR)
  const COLD_POOL = expandHome(deck.deck?.cold_pool || '~/.agents/skill-repos', PROJECT_DIR)

  return { DECK_PATH, PROJECT_DIR, deckRaw, deck, WORKING_SET, COLD_POOL }
}

/**
 * Switch a skill to symlink mode (live link to cold pool source).
 * No-op if the working set entry is already a symlink.
 */
export function toSymlinkSkill(target: string, cliDeckPath?: string, cliWorkdir?: string, io: SymlinkSnapshotIO = defaultIO): void {
  const { DECK_PATH, PROJECT_DIR, deckRaw, WORKING_SET, COLD_POOL } = getProjectAndDeck(cliDeckPath, cliWorkdir, io)

  const { entries: parsedEntries } = parseDeck(deckRaw)
  const match = parsedEntries.find(e => e.alias === target || e.path === target)
  if (!match) {
    io.error(`❌ Skill not found in deck: ${target}`)
    io.exit(1)
  }

  try { validateAlias(match.alias) } catch (e: any) {
    io.error(`❌ Invalid alias in deck.toml: ${e.message}`)
    io.exit(1)
  }

  const dest = join(WORKING_SET, match.alias)
  const source = findSource(match.path, COLD_POOL, PROJECT_DIR)

  if (!source.path) {
    io.error(`❌ Source not found in cold pool: ${match.path}`)
    io.exit(1)
  }

  // Check current mode — 仅用于给人看的提示。**不作为删除依据**:
  // lstat 只能说"路径上有个真实目录",说不出"这个目录是 deck 建的"。
  let currentMode: 'snapshot' | 'symlink' | 'missing' = 'missing'
  try {
    const st = lstatSync(dest)
    currentMode = st.isSymbolicLink() ? 'symlink' : 'snapshot'
  } catch {}

  if (currentMode === 'symlink') {
    io.log(`⏭️  ${match.alias} is already in symlink mode`)
    return
  }

  if (currentMode === 'missing') {
    io.error(`❌ ${match.alias} not found in working set. Run 'deck link' first.`)
    io.exit(1)
  }

  // Remove snapshot, create symlink —— 先判归属。真实目录只有 state 记录在案
  // (deck 自己 pin 的 snapshot)才删;别的东西占了这个名字 → 停下报错,不删。
  const cleared = removeEntryForRelink(dest, ownershipContextFor(COLD_POOL, PROJECT_DIR))
  if (!cleared.removed && cleared.present) {
    io.error(`❌ Refusing to replace ${match.alias}: ${dest} is not deck's`)
    io.error(`   why:  ${cleared.reason}`)
    io.error(`   fix:  move or remove it yourself, then re-run; no changes were made`)
    io.exit(1)
  }
  symlinkSync(source.path, dest)
  io.log(`🔄 ${match.alias}: snapshot → symlink (target: ${relative(PROJECT_DIR, source.path)})`)

  // Update lock (mode is now declarative — it changes, so lock changes)
  const lock = readLock(PROJECT_DIR)
  if (lock) {
    const lockSkill = lock.skills.find(s => s.alias === match.alias)
    if (lockSkill) {
      // No linked_at in new lock schema; mode is in state
    }
    writeLock(PROJECT_DIR, lock)
  }

  // Update state (operational: linked_at, mode, 认领登记)
  const state = readState(PROJECT_DIR)
  if (state) {
    const stateSkill = state.skills.find(s => s.alias === match.alias)
    if (stateSkill) {
      stateSkill.linked_at = new Date().toISOString()
      stateSkill.mode = 'symlink'
      // 认领登记要保持与磁盘一致:这里刚把一个 snapshot 换成 symlink,
      // 该路径仍是 deck 的(dest 那份兜底证明还在),但 managed_dests 里
      // 若少了它,下一次 link 就可能把它判成外来。
      stateSkill.managed_dests = [...new Set([...(stateSkill.managed_dests ?? []), resolve(dest)])].sort()
    }
    writeState(PROJECT_DIR, state)
  }
}

/**
 * Switch a skill to snapshot mode (pinned copy from cold pool source).
 * No-op if the working set entry is already a real directory (not a symlink).
 */
export function toSnapshotSkill(target: string, cliDeckPath?: string, cliWorkdir?: string, io: SymlinkSnapshotIO = defaultIO): void {
  const { DECK_PATH, PROJECT_DIR, deckRaw, WORKING_SET, COLD_POOL } = getProjectAndDeck(cliDeckPath, cliWorkdir, io)

  const { entries: parsedEntries } = parseDeck(deckRaw)
  const match = parsedEntries.find(e => e.alias === target || e.path === target)
  if (!match) {
    io.error(`❌ Skill not found in deck: ${target}`)
    io.exit(1)
  }

  try { validateAlias(match.alias) } catch (e: any) {
    io.error(`❌ Invalid alias in deck.toml: ${e.message}`)
    io.exit(1)
  }

  const dest = join(WORKING_SET, match.alias)
  const source = findSource(match.path, COLD_POOL, PROJECT_DIR)

  if (!source.path) {
    io.error(`❌ Source not found in cold pool: ${match.path}`)
    io.exit(1)
  }

  // Check current mode
  let currentMode: 'snapshot' | 'symlink' | 'missing' = 'missing'
  try {
    const st = lstatSync(dest)
    currentMode = st.isSymbolicLink() ? 'symlink' : 'snapshot'
  } catch {}

  if (currentMode === 'snapshot') {
    // 有真实目录 ≠ 那是 deck 的 snapshot。查一下再说话 —— 之前这里无条件
    // 报"已经是 snapshot 模式",对外来目录就是一句假话(虽然没删东西)。
    const own = deckOwnsEntry(dest, ownershipContextFor(COLD_POOL, PROJECT_DIR))
    if (own.owned) {
      io.log(`⏭️  ${match.alias} is already in snapshot mode (deck's pinned copy)`)
    } else {
      io.error(`❌ ${match.alias} is a real directory, but not deck's — refusing to touch it`)
      io.error(`   why:  ${own.reason}`)
      io.error(`   fix:  move or remove it yourself if you want deck to manage this alias`)
      io.exit(1)
    }
    return
  }

  if (currentMode === 'missing') {
    io.error(`❌ ${match.alias} not found in working set. Run 'deck link' first.`)
    io.exit(1)
  }

  // Remove symlink, cp snapshot —— 先判归属:只有指向本 deck cold pool 的
  // symlink 才清得动,别的东西占了这个名字 → 停下报错,不删。
  const cleared = removeEntryForRelink(dest, ownershipContextFor(COLD_POOL, PROJECT_DIR))
  if (!cleared.removed && cleared.present) {
    io.error(`❌ Refusing to replace ${match.alias}: ${dest} is not deck's`)
    io.error(`   why:  ${cleared.reason}`)
    io.error(`   fix:  move or remove it yourself, then re-run; no changes were made`)
    io.exit(1)
  }
  cpSync(source.path, dest, { recursive: true })
  io.log(`🧊 ${match.alias}: symlink → snapshot (pinned copy from ${relative(PROJECT_DIR, source.path)})`)

  // Record HEAD in metadata
  try {
    const loc = parseLocator(match.path)
    if (loc && !loc.isLocalhost) {
      const pool = new ColdPool(COLD_POOL)
      // Best-effort: note that this is now pinned (snapshot mode)
      // The actual HEAD recording happens via git-hash async, but we note the intent
      io.log(`   📌 Pinned. Run 'deck link' to regenerate lock with updated content_hash.`)
    }
  } catch {}

  // Update lock
  const lock = readLock(PROJECT_DIR)
  if (lock) {
    const lockSkill = lock.skills.find(s => s.alias === match.alias)
    if (lockSkill) {
      // No linked_at in new lock schema; mode is in state
    }
    writeLock(PROJECT_DIR, lock)
  }

  // Update state
  const state = readState(PROJECT_DIR)
  if (state) {
    const stateSkill = state.skills.find(s => s.alias === match.alias)
    if (stateSkill) {
      stateSkill.linked_at = new Date().toISOString()
      stateSkill.mode = 'snapshot'
      // 认领登记:这个真实目录是 deck 刚 pin 的,记下来下次才删得动
      stateSkill.managed_dests = [...new Set([...(stateSkill.managed_dests ?? []), resolve(dest)])].sort()
    }
    writeState(PROJECT_DIR, state)
  }
}
