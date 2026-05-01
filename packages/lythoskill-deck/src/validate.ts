#!/usr/bin/env bun
/**
 * deck-validate.ts — Skill Deck configuration validator
 *
 * 读取 skill-deck.toml → 校验 schema、引用有效性、约束合规性。
 * 不做：创建 symlink、修改文件系统。
 */

import { parse as parseToml } from "@iarna/toml";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { findDeckToml, expandHome, findSource } from "./link.js";

export function validateDeck(cliDeckPath?: string, cliWorkdir?: string): void {
  const PROJECT_DIR = cliWorkdir ? resolve(cliWorkdir) : process.cwd();
  const DECK_PATH = cliDeckPath
    ? resolve(cliDeckPath)
    : findDeckToml(PROJECT_DIR) || resolve(PROJECT_DIR, "skill-deck.toml");

  if (!existsSync(DECK_PATH)) {
    console.error(`❌ skill-deck.toml not found: ${DECK_PATH}`);
    process.exit(1);
  }

  const deckRaw = readFileSync(DECK_PATH, "utf-8");
  let deck: any;
  try {
    deck = parseToml(deckRaw);
  } catch (err: any) {
    console.error(`❌ TOML parse error: ${err.message}`);
    process.exit(1);
  }

  const errors: string[] = [];
  const warnings: string[] = [];

  // ── Validate deck section ──────────────────────────────────

  if (!deck.deck || typeof deck.deck !== "object") {
    errors.push("[deck] section is required");
  } else {
    const maxCards = deck.deck.max_cards;
    if (maxCards === undefined) {
      errors.push("deck.max_cards is required");
    } else if (!Number.isInteger(maxCards) || maxCards < 1) {
      errors.push(`deck.max_cards must be a positive integer, got ${maxCards}`);
    }
  }

  const COLD_POOL = expandHome(deck.deck?.cold_pool || "~/.agents/skill-repos", PROJECT_DIR);
  const MAX_CARDS = Number(deck.deck?.max_cards || 10);

  // ── Validate skill declarations ────────────────────────────

  const declaredNames = new Set<string>();
  let declaredCount = 0;

  for (const section of ["innate", "tool", "combo"] as const) {
    const skills = deck[section]?.skills;
    if (skills === undefined) continue;
    if (!Array.isArray(skills)) {
      errors.push(`[${section}].skills must be an array`);
      continue;
    }
    for (const name of skills) {
      if (!name || typeof name !== "string") {
        errors.push(`[${section}] contains invalid skill name`);
        continue;
      }
      declaredCount++;
      if (declaredNames.has(name)) {
        warnings.push(`Skill "${name}" is declared in multiple sections`);
      }
      declaredNames.add(name);

      const src = findSource(name, COLD_POOL, PROJECT_DIR);
      if (!src) {
        errors.push(`Skill not found: ${name} (${section})`);
      }
    }
  }

  // ── Validate transient section ─────────────────────────────

  const transientCount = Object.keys(deck.transient || {}).length;
  if (deck.transient) {
    for (const [key, value] of Object.entries(deck.transient)) {
      const t = value as any;
      if (!t || typeof t !== "object") {
        errors.push(`transient.${key} must be a table`);
        continue;
      }
      if (!t.path) {
        errors.push(`transient.${key} missing required field: path`);
        continue;
      }
      const src = resolve(PROJECT_DIR, t.path);
      if (!existsSync(src)) {
        errors.push(`transient path does not exist: ${key} → ${src}`);
      }
      if (t.expires) {
        const d = new Date(t.expires);
        if (isNaN(d.getTime())) {
          errors.push(`transient.${key} has invalid expires format: ${t.expires}`);
        }
      }
    }
  }

  // ── Budget check ───────────────────────────────────────────

  const total = declaredCount + transientCount;
  if (total > MAX_CARDS) {
    errors.push(`Budget exceeded: declared ${total} skill(s), max_cards = ${MAX_CARDS}`);
  }

  // ── Report ─────────────────────────────────────────────────

  if (warnings.length > 0) {
    for (const w of warnings) console.warn(`⚠️  ${w}`);
  }

  if (errors.length > 0) {
    for (const e of errors) console.error(`❌ ${e}`);
    console.error(`\n❌ Validation failed: ${errors.length} error(s)`);
    process.exit(1);
  }

  console.log(`✅ Validation passed: ${total} skill(s), max_cards = ${MAX_CARDS}`);
}
