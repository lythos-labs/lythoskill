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
import { findDeckToml, expandHome } from "./link.js";
import { parseDeck } from "./parse-deck.js";
import { ColdPool } from "@lythos/cold-pool";
import { homedir } from "node:os";
import { join } from "node:path";

export function removeSkill(target: string, cliDeckPath?: string, cliWorkdir?: string): void {
  const cliDeck = cliDeckPath || process.argv.find((_, i, a) => a[i - 1] === "--deck");
  const DECK_PATH = cliDeck
    ? resolve(cliDeck)
    : findDeckToml(process.cwd()) || resolve("skill-deck.toml");

  if (!existsSync(DECK_PATH)) {
    console.error(`❌ skill-deck.toml not found in ${process.cwd()}`);
    console.error(`\nCreate one or specify a path: bunx @lythos/skill-deck link --deck /path/to/deck.toml`);
    process.exit(1);
  }

  const PROJECT_DIR = cliWorkdir ? resolve(cliWorkdir) : dirname(DECK_PATH);
  const deckRaw = readFileSync(DECK_PATH, "utf-8");
  const deck = parseToml(deckRaw) as any;

  const WORKING_SET = expandHome(deck.deck?.working_set || ".claude/skills", PROJECT_DIR);

  // ── 定位目标 ────────────────────────────────────────────────

  const { entries: parsedEntries } = parseDeck(deckRaw);

  // Match by alias first, then by path
  const match = parsedEntries.find(e => e.alias === target || e.path === target);

  if (!match) {
    console.error(`❌ Skill not found in deck: ${target}`);
    const aliases = parsedEntries.map(e => e.alias);
    if (aliases.length > 0) {
      console.error(`   Declared aliases: ${aliases.join(", ")}`);
    }
    process.exit(1);
  }

  // ── 删 deck.toml 条目 ───────────────────────────────────────

  const section = match.type;
  const alias = match.alias;

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
  console.log(`📝 Removed "${alias}" from [${section}.skills] in ${DECK_PATH}`);

  // ── 删 working set symlink ──────────────────────────────────

  const symlinkPath = join(WORKING_SET, alias);
  if (existsSync(symlinkPath)) {
    rmSync(symlinkPath, { recursive: true, force: true });
    console.log(`  🗑️  Removed symlink: ${symlinkPath}`);
  } else {
    console.log(`  ⚠️  Symlink not found: ${symlinkPath}`);
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
    console.warn(`⚠️  Metadata cleanup skipped: ${e.message}`);
  }

  console.log(`\n💡 Cold pool untouched. Run 'bunx @lythos/skill-deck prune' to GC unreferenced repos.`);
}
