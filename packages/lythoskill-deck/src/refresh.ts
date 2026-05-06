#!/usr/bin/env bun
/**
 * deck-refresh.ts — Refresh declared skills from their upstream sources
 *
 * Reads skill-deck.toml → traverses declared skills → git pull.
 * Supports single-skill (by FQ path or alias) or all skills.
 * Never modifies deck.toml.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gitPull } from "@lythos/cold-pool";
import { findDeckToml, linkDeck } from "./link.js";
import { parseDeck } from "./parse-deck.js";
import { buildRefreshPlan, detectGitRoot, executeRefreshPlan } from "./refresh-plan.js";

// Backward compat: old findGitRoot returns string|null
export function findGitRoot(dir: string, coldPool: string): string | null {
  const result = detectGitRoot(dir, coldPool)
  return result.gitRoot ?? null
}

export function refreshDeck(cliDeckPath?: string, cliWorkdir?: string, target?: string): void {
  const deckPath = cliDeckPath || process.argv.find((_, i, a) => a[i - 1] === "--deck");
  const workdir = cliWorkdir

  const DECK_PATH = deckPath ? resolve(deckPath) : findDeckToml(process.cwd()) || resolve('skill-deck.toml')

  if (!existsSync(DECK_PATH)) {
    console.error(`❌ skill-deck.toml not found in ${process.cwd()}`)
    console.error(`\nCreate one or specify a path: bunx @lythos/skill-deck link --deck /path/to/deck.toml`)
    process.exit(1)
  }

  const deckRaw = readFileSync(DECK_PATH, 'utf-8')

  // ── Plan: pure target collection + type classification ─────────────
  const plan = buildRefreshPlan(deckRaw, {
    deckPath: DECK_PATH,
    workdir: workdir ? resolve(workdir) : undefined,
    coldPool: undefined, // derive from deck
    target,
  })

  const { entries: parsedEntries, deprecated: isDeprecated } = parseDeck(deckRaw)
  if (isDeprecated) {
    console.warn('⚠️  Deprecation: string-array skill entries are deprecated. Run `deck migrate-schema` to upgrade.')
  }

  if (parsedEntries.length === 0) {
    console.log('📭 No skills declared in deck. Nothing to refresh.')
    process.exit(0)
  }

  if (target && plan.targets.length === 0) {
    console.error(`❌ Skill not found in deck: ${target}`)
    const { entries } = parseDeck(deckRaw)
    console.error(`   Declared aliases: ${entries.map(d => d.alias).join(', ')}`)
    process.exit(1)
  }

  // ── Execute with real IO ────────────────────────────────────
  const results = executeRefreshPlan(plan, {
    gitPull,
    log: console.log,
    linkDeck: () => {
      console.log(`\n💡 Run 'bunx @lythos/skill-deck link' to sync refreshed skills to working set.`)
      console.log('🔗 Running deck link...')
      linkDeck(cliDeckPath, cliWorkdir)
    },
  })

  if (results.some(r => r.status === 'failed')) process.exit(1)
}
