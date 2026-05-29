#!/usr/bin/env bun
/**
 * deck-refresh.ts — Refresh declared skills from their upstream sources
 *
 * Default: discover-only — outputs a structured plan, never executes git pull.
 * With `exec: true` — executes the plan (git pull + linkDeck).
 *
 * Agent-driven apply: the agent reads the plan, decides what to pull,
 * and can probe / retry / fix per target. Not a dead heredoc script.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gitPull } from "@lythos/cold-pool";
import { probeConnectivity } from "@lythos/cold-pool/src/mirror.js";
import { findDeckToml, linkDeck } from "./link.js";
import { parseDeck } from "./parse-deck.js";
import { buildRefreshPlan, detectGitRoot, executeRefreshPlan } from "./refresh-plan.js";

// Backward compat: old findGitRoot returns string|null
export function findGitRoot(dir: string, coldPool: string): string | null {
  const result = detectGitRoot(dir, coldPool)
  return result.gitRoot ?? null
}

/** Quick behind-count probe for a single git root. Pure, no mutation.
 *
 * Uses `HEAD..@{upstream}` (two-dot) instead of `HEAD...@{upstream}` (three-dot)
 * because shallow clones (--depth=1) break the symmetric difference semantics
 * of three-dot notation. Two-dot only counts commits reachable from upstream
 * but not from HEAD — exactly what "behind" means.
 */
async function probeBehindCount(gitRoot: string): Promise<number | undefined> {
  try {
    const { execSync } = await import("node:child_process");
    execSync("git fetch --depth=1 origin", { cwd: gitRoot, timeout: 5000, stdio: "pipe" });
    const count = execSync("git rev-list --count HEAD..@{upstream}", {
      cwd: gitRoot, timeout: 3000, encoding: "utf-8", stdio: "pipe",
    }).trim();
    return parseInt(count, 10);
  } catch {
    return undefined;
  }
}

export async function refreshDeck(
  cliDeckPath?: string,
  cliWorkdir?: string,
  target?: string,
  exec = false,
): Promise<void> {
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

  // ── Discover: enrich plan with behind counts ─────────────────────
  const enriched = await Promise.all(
    plan.targets.map(async (t) => {
      if (t.type !== 'git' || !t.gitRoot) return { ...t, behind: undefined };
      const behind = await probeBehindCount(t.gitRoot);
      return { ...t, behind };
    })
  );

  // ── Default path: print plan, do NOT pull ──────────────────────
  if (!exec) {
    console.log(`📋 Refresh Plan — ${enriched.length} skill(s)`)
    console.log(``)
    for (const t of enriched) {
      const behindStr = t.behind === undefined ? '?' : t.behind > 0 ? `${t.behind} behind` : 'up to date';
      switch (t.type) {
        case 'git':
          console.log(`🔄 ${t.alias}  ${t.path}  (${behindStr})`)
          break
        case 'localhost':
          console.log(`📁 ${t.alias}  ${t.path}  (localhost — user-managed)`)
          break
        case 'missing':
          console.log(`❌ ${t.alias}  ${t.path}  (missing from cold pool)`)
          break
        case 'not-git':
          console.log(`📁 ${t.alias}  ${t.path}  (not a git repo)`)
          break
      }
    }
    console.log(``)
    console.log(`💡 To apply this plan: deck refresh --exec`)
    console.log(`   Or let an agent read this plan and execute per target with probe + retry.`)
    return
  }

  // ── Exec path: agent/human has explicitly opted in ─────────────
  // ── Plan→Apply boundary: probe network before any git pull ─────
  const gitTargets = plan.targets.filter(t => t.type === 'git')
  if (gitTargets.length > 0) {
    const firstTarget = gitTargets[0]!
    const probeUrl = `https://${firstTarget.path}`
    const probe = await probeConnectivity(probeUrl, 5000)
    if (!probe) {
      console.error(`⚠️  Network probe failed for ${probeUrl}`)
      console.error(`   Refresh may fail for git targets. To fix:`)
      console.error(`     export LYTHOS_GH_MIRROR="https://your-mirror.com"`)
      console.error(`     # Or set LYTHOS_SOCKS_PROXY for SOCKS5 routing`)
      console.error(`   Continuing anyway — per-target errors will be reported below.`)
      console.error()
    }
  }

  const results = executeRefreshPlan(plan, {
    gitPull,
    log: console.log,
    linkDeck: async () => {
      console.log(`\n💡 Run 'bunx @lythos/skill-deck link' to sync refreshed skills to working set.`)
      console.log('🔗 Running deck link...')
      await linkDeck(cliDeckPath, cliWorkdir)
    },
  })

  if (results.some(r => r.status === 'failed')) process.exit(1)
}
