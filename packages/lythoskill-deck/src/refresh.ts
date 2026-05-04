#!/usr/bin/env bun
/**
 * deck-refresh.ts — Refresh declared skills from their upstream sources
 *
 * Reads skill-deck.toml → traverses declared skills → git pull.
 * Supports single-skill (by FQ path or alias) or all skills.
 * Never modifies deck.toml.
 */

import { existsSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve } from "node:path";
import { findDeckToml, linkDeck } from "./link.js";
import { parseDeck } from "./parse-deck.js";
import { buildRefreshPlan, detectGitRoot } from "./refresh-plan.js";

// Backward compat: old findGitRoot returns string|null
export function findGitRoot(dir: string, coldPool: string): string | null {
  const result = detectGitRoot(dir, coldPool)
  return result.gitRoot ?? null
}

interface RefreshResult {
  name: string;
  path: string;
  status: "updated" | "up-to-date" | "skipped" | "failed" | "not-git";
  message?: string;
}

function gitPull(dir: string): { status: "updated" | "up-to-date" | "failed"; message: string } {
  try {
    const output = execSync("git pull", {
      cwd: dir,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 30000,
    }).trim();

    if (output.includes("Already up to date") || output.includes("Already up-to-date")) {
      return { status: "up-to-date", message: output };
    }
    return { status: "updated", message: output };
  } catch (err: any) {
    const stderr = err.stderr?.toString() || err.message || "";
    return { status: "failed", message: stderr.trim() };
  }
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

  // ── Execute: git pull for git-type targets ──────────────────────
  const results: RefreshResult[] = []
  let updated = 0, upToDate = 0, skipped = 0, failed = 0

  for (const t of plan.targets) {
    switch (t.type) {
      case 'missing':
        results.push({ name: t.alias, path: '', status: 'failed', message: 'Skill not found in cold pool' })
        failed++
        break
      case 'localhost':
        results.push({ name: t.alias, path: t.sourceRel, status: 'skipped', message: 'localhost skill — user-managed' })
        skipped++
        break
      case 'not-git':
        results.push({ name: t.alias, path: t.sourceRel, status: 'not-git', message: 'skipped: not a git repository' })
        skipped++
        break
      case 'git': {
        const pullResult = gitPull(t.gitRoot!)
        results.push({ name: t.alias, path: t.sourceRel, status: pullResult.status, message: pullResult.message })
        if (pullResult.status === 'updated') updated++
        else if (pullResult.status === 'up-to-date') upToDate++
        else failed++
        break
      }
    }
  }

  // ── Report ──────────────────────────────────────────────────────
  const scope = target ? 'single skill' : `${parsedEntries.length} skill(s)`
  console.log(`\n📦 Skill Refresh Report — ${scope} checked`)
  console.log(`   Updated: ${updated} | Up-to-date: ${upToDate} | Skipped: ${skipped} | Failed: ${failed}`)
  console.log()

  for (const r of results) {
    const icon =
      r.status === 'updated' ? '🔄' : r.status === 'up-to-date' ? '✅' :
      r.status === 'skipped' ? '⏭️' : r.status === 'not-git' ? '📁' : '❌'
    console.log(`${icon} ${r.name}`)
    if (r.message && r.status !== 'up-to-date') {
      for (const line of r.message.split('\n').filter(l => l.trim()).slice(0, 3)) {
        console.log(`   ${line.trim()}`)
      }
    }
  }

  if (updated > 0) {
    console.log(`\n💡 Run 'bunx @lythos/skill-deck link' to sync refreshed skills to working set.`)
    console.log('🔗 Running deck link...')
    linkDeck(cliDeckPath, cliWorkdir)
  }

  if (failed > 0) process.exit(1)
}
