#!/usr/bin/env bun
/**
 * deck-validate.ts — Skill Deck configuration validator
 *
 * 读取 skill-deck.toml → 校验 schema、引用有效性、约束合规性。
 * Optional remote check (T8 of EPIC-20260507020846020):
 *   `--remote` → for each FQ locator, call cold-pool's buildValidationPlan
 *   + executeValidationPlan against api.github.com to verify repo and
 *   skill path exist BEFORE clone. Output structured ValidationReport.
 * `--format=json` emits machine-readable output for agents.
 */

import { parse as parseToml } from "@iarna/toml";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildValidationPlan,
  executeValidationPlan,
  ColdPool,
  hashSkillMd,
  parseLocator,
  type ValidationReport,
} from "@lythos/cold-pool";
import { findDeckToml, expandHome, findSource } from "./link.js";
import { join } from "node:path";
import { parseDeck } from "./parse-deck.js";

export interface ValidateOptions {
  remote?: boolean;
  format?: 'text' | 'json';
}

export interface DeckValidationReport {
  status: 'valid' | 'invalid';
  deckPath: string;
  errors: string[];
  warnings: string[];
  entries: Array<{
    locator: string;
    type: string;
    alias: string;
    localStatus: 'found' | 'missing' | 'parse-error';
    remote?: ValidationReport;
    drift?: {
      recordedSha256: string;
      currentSha256: string;
    };
  }>;
  budget: { declared: number; max_cards: number; within_budget: boolean };
}

export async function buildDeckValidation(
  cliDeckPath?: string,
  cliWorkdir?: string,
  options: ValidateOptions = {},
): Promise<DeckValidationReport> {
  const PROJECT_DIR = cliWorkdir ? resolve(cliWorkdir) : process.cwd();
  const DECK_PATH = cliDeckPath
    ? resolve(cliDeckPath)
    : findDeckToml(PROJECT_DIR) || resolve(PROJECT_DIR, "skill-deck.toml");

  if (!existsSync(DECK_PATH)) {
    return {
      status: 'invalid',
      deckPath: DECK_PATH,
      errors: [`skill-deck.toml not found: ${DECK_PATH}`],
      warnings: [],
      entries: [],
      budget: { declared: 0, max_cards: 0, within_budget: true },
    };
  }

  const deckRaw = readFileSync(DECK_PATH, "utf-8");
  let deck: any;
  try {
    deck = parseToml(deckRaw);
  } catch (err: any) {
    return {
      status: 'invalid',
      deckPath: DECK_PATH,
      errors: [`TOML parse error: ${err.message}`],
      warnings: [],
      entries: [],
      budget: { declared: 0, max_cards: 0, within_budget: true },
    };
  }

  const errors: string[] = [];
  const warnings: string[] = [];

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

  const { entries: parsedEntries, deprecated: isDeprecated, errors: parseErrors } = parseDeck(deckRaw);
  if (isDeprecated) {
    warnings.push("string-array skill entries are deprecated. Run `deck migrate-schema` to upgrade.");
  }
  errors.push(...parseErrors);

  const declaredNames = new Set<string>();
  let declaredCount = 0;
  const entryReports: DeckValidationReport['entries'] = [];

  for (const entry of parsedEntries) {
    declaredCount++;
    if (declaredNames.has(entry.path)) {
      warnings.push(`Skill "${entry.path}" is declared in multiple sections`);
    }
    declaredNames.add(entry.path);

    const result = findSource(entry.path, COLD_POOL, PROJECT_DIR);
    let localStatus: 'found' | 'missing' | 'parse-error';
    if (result.error) {
      errors.push(result.error);
      localStatus = 'parse-error';
    } else if (!result.path) {
      // Don't add to errors yet — remote check may have suggestions.
      // Local missing is only an error if remote also fails or is skipped.
      localStatus = 'missing';
    } else {
      localStatus = 'found';
    }

    let remote: ValidationReport | undefined;
    let drift: { recordedSha256: string; currentSha256: string } | undefined;

    if (options.remote) {
      const plan = buildValidationPlan(entry.path);
      remote = await executeValidationPlan(plan);
      if (remote.status === 'invalid') {
        errors.push(`Remote check invalid: ${entry.path} (${remote.phase})`);
      }
    } else if (localStatus === 'missing') {
      errors.push(`Skill not found in cold pool: ${entry.path} (${entry.type})`);
    }

    // ── Metadata drift check ──────────────────────────────────
    if (localStatus === 'found' && result.path) {
      try {
        const pool = new ColdPool(COLD_POOL);
        const locator = parseLocator(entry.path);
        if (locator) {
          const skillSubpath = locator.skill || '';
          const recorded = pool.metadata.getSkillHash(locator.host, locator.owner, locator.repo, skillSubpath);
          if (recorded) {
            const current = hashSkillMd(join(result.path, 'SKILL.md'));
            if (recorded !== current) {
              drift = { recordedSha256: recorded, currentSha256: current };
              warnings.push(`Content drift: ${entry.alias} — SKILL.md changed since last deck add/link`);
            }
          }
        }
      } catch {
        // Drift check is best-effort
      }
    }

    entryReports.push({
      locator: entry.path,
      type: entry.type,
      alias: entry.alias,
      localStatus,
      remote,
      drift,
    });
  }

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

  const total = declaredCount + transientCount;
  const within_budget = total <= MAX_CARDS;
  if (!within_budget) {
    errors.push(`Budget exceeded: declared ${total} skill(s), max_cards = ${MAX_CARDS}`);
  }

  return {
    status: errors.length > 0 ? 'invalid' : 'valid',
    deckPath: DECK_PATH,
    errors,
    warnings,
    entries: entryReports,
    budget: { declared: total, max_cards: MAX_CARDS, within_budget },
  };
}

function renderText(report: DeckValidationReport): void {
  for (const w of report.warnings) console.warn(`⚠️  ${w}`);

  for (const entry of report.entries) {
    if (entry.remote) {
      const status = entry.remote.status
      const icon = status === 'valid' ? '✅' : status === 'ambiguous' ? '⚠️ ' : '❌'
      console.log(`${icon} ${entry.locator} (${entry.type}) — ${status} (${entry.remote.phase})`)
      for (const fix of entry.remote.suggestedFixes) {
        const tag = fix.action === 'update-locator' && fix.newLocator ? `→ ${fix.newLocator}` : fix.action
        console.log(`     ${tag} (confidence: ${fix.confidence.toFixed(2)}) — ${fix.message}`)
      }
    }
    if (entry.drift) {
      console.log(`🔀 ${entry.alias} — content drift detected`)
      console.log(`     recorded: ${entry.drift.recordedSha256.slice(0, 16)}...`)
      console.log(`     current:  ${entry.drift.currentSha256.slice(0, 16)}...`)
      console.log(`     Run \`deck add ${entry.locator}\` to re-record metadata`)
    }
  }

  if (report.errors.length > 0) {
    for (const e of report.errors) console.error(`❌ ${e}`);
    console.error(`\n❌ Validation failed: ${report.errors.length} error(s)`);
  } else {
    console.log(`✅ Validation passed: ${report.budget.declared} skill(s), max_cards = ${report.budget.max_cards}`);
  }
}

export async function validateDeck(
  cliDeckPath?: string,
  cliWorkdir?: string,
  options: ValidateOptions = {},
): Promise<void> {
  const report = await buildDeckValidation(cliDeckPath, cliWorkdir, options);

  if (options.format === 'json') {
    console.log(JSON.stringify(report, null, 2));
  } else {
    renderText(report);
  }

  if (report.status === 'invalid') {
    process.exit(1);
  }
}
