#!/usr/bin/env bun
/**
 * deck-remove.ts — Remove a skill from the declaration layer
 *
 * Deletes the entry from skill-deck.toml and removes the working-set symlink.
 * Does NOT touch the cold pool (use `deck prune` for material-layer GC).
 */

import { parse as parseToml, stringify as stringifyToml } from "@iarna/toml";
import { existsSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { findDeckToml, expandHome, parseAlsoLinkTo } from "./link.js";
import { parseDeck } from "./parse-deck.js";
import { ColdPool } from "@lythos/cold-pool";
import { homedir } from "node:os";
import { validateAlias } from "./path-guard.js";

export interface DeckIO {
  error: (msg: string) => void;
  exit: (code?: number) => never;
  warn: (msg: string) => void;
  log: (msg: string) => void;
}

const defaultIO: DeckIO = {
  error: (msg: string) => console.error(msg),
  exit: (code?: number) => process.exit(code ?? 0),
  warn: (msg: string) => console.warn(msg),
  log: (msg: string) => console.log(msg),
};

export function removeSkill(target: string, cliDeckPath?: string, cliWorkdir?: string, io: DeckIO = defaultIO): void {
  const cliDeck = cliDeckPath || process.argv.find((_, i, a) => a[i - 1] === "--deck");
  const DECK_PATH = cliDeck
    ? resolve(cliDeck)
    : findDeckToml(process.cwd()) || resolve("skill-deck.toml");

  if (!existsSync(DECK_PATH)) {
    io.error(`❌ skill-deck.toml not found in ${process.cwd()}`);
    io.error(`\nCreate one or specify a path: bunx @lythos/skill-deck link --deck /path/to/deck.toml`);
    io.exit(1);
  }

  const PROJECT_DIR = cliWorkdir ? resolve(cliWorkdir) : dirname(DECK_PATH);
  const deckRaw = readFileSync(DECK_PATH, "utf-8");
  const deck = parseToml(deckRaw) as any;

  const WORKING_SET = expandHome(deck.deck?.working_set || ".claude/skills", PROJECT_DIR);

  const ALSO_LINK_TO_RESULT = parseAlsoLinkTo(deck.deck?.also_link_to, PROJECT_DIR);
  const ALSO_LINK_TO = ALSO_LINK_TO_RESULT.targets;
  if (ALSO_LINK_TO_RESULT.deprecated) {
    io.warn('⚠️  Deprecation: also_link_to as comma-separated string is deprecated. Use TOML array: also_link_to = [".agents/skills"]');
  }

  // ── 定位目标 ────────────────────────────────────────────────

  const { entries: parsedEntries } = parseDeck(deckRaw);

  // Match by alias first, then by path
  const match = parsedEntries.find(e => e.alias === target || e.path === target);

  if (!match) {
    io.error(`❌ Skill not found in deck: ${target}`);
    const aliases = parsedEntries.map(e => e.alias);
    if (aliases.length > 0) {
      io.error(`   Declared aliases: ${aliases.join(", ")}`);
    }
    io.exit(1);
  }

  // ── 删 deck.toml 条目 ───────────────────────────────────────

  const section = match.type;
  const alias = match.alias;

  // Validate alias before using as path component (CWE-22)
  try { validateAlias(alias) } catch (e: any) {
    io.error(`❌ Invalid alias in deck.toml: ${e.message}`)
    io.error(`   Fix skill-deck.toml before re-running.`)
    io.exit(1)
  }

  if (deck[section]?.skills) {
    if (Array.isArray(deck[section].skills)) {
      // Legacy string-array format
      deck[section].skills = deck[section].skills.filter((name: string) => {
        const a = name.split("/").pop() || name;
        return a !== alias;
      });
      if (deck[section].skills.length === 0) {
        delete deck[section].skills;
      }
    } else if (typeof deck[section].skills === "object") {
      // Dict format
      delete deck[section].skills[alias];
      if (Object.keys(deck[section].skills).length === 0) {
        delete deck[section].skills;
      }
    }
    // Clean up empty section
    if (Object.keys(deck[section] || {}).length === 0) {
      delete deck[section];
    }
  }

  writeFileSync(DECK_PATH, stringifyToml(deck));
  io.log(`📝 Removed "${alias}" from [${section}.skills] in ${DECK_PATH}`);

  // ── 删 working set symlink ──────────────────────────────────

  const symlinkPath = join(WORKING_SET, alias);
  if (existsSync(symlinkPath)) {
    rmSync(symlinkPath, { recursive: true, force: true });
    io.log(`  🗑️  Removed symlink: ${symlinkPath}`);
  } else {
    io.log(`  ⚠️  Symlink not found: ${symlinkPath}`);
  }

  // ── 删 also_link_to symlinks ─────────────────────────────────

  for (const target of ALSO_LINK_TO) {
    const linkPath = join(target, alias);
    if (existsSync(linkPath)) {
      rmSync(linkPath, { recursive: true, force: true });
      io.log(`  🗑️  Removed also_link_to symlink: ${linkPath}`);
    } else {
      io.log(`  ⚠️  also_link_to symlink not found: ${linkPath}`);
    }
  }

  // ── Metadata cleanup ────────────────────────────────────────

  try {
    const deck = parseToml(deckRaw) as any;
    const coldPoolRaw = deck.deck?.cold_pool || '~/.agents/skill-repos';
    const coldPoolPath = coldPoolRaw.startsWith('~/')
      ? join(homedir(), coldPoolRaw.slice(2))
      : resolve(PROJECT_DIR, coldPoolRaw);
    const pool = new ColdPool(coldPoolPath);
    pool.metadata.removeReference(match.path, DECK_PATH);
  } catch (e: any) {
    io.warn(`⚠️  Metadata cleanup skipped: ${e.message}`);
  }

  io.log(`\n💡 Cold pool untouched. Run 'bunx @lythos/cold-pool prune' to GC unreferenced repos.`);
}
