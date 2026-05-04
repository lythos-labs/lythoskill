#!/usr/bin/env bun
/**
 * deck-refresh.ts — Refresh declared skills from their upstream sources
 *
 * Reads skill-deck.toml → traverses declared skills → git pull.
 * Supports single-skill (by FQ path or alias) or all skills.
 * Never modifies deck.toml.
 */

import { parse as parseToml } from "@iarna/toml";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve, dirname, join, relative } from "node:path";
import { findDeckToml, expandHome, findSource, linkDeck } from "./link.js";
import { parseDeck } from "./parse-deck.js";

interface RefreshResult {
  name: string;
  path: string;
  status: "updated" | "up-to-date" | "skipped" | "failed" | "not-git";
  message?: string;
}

export function findGitRoot(dir: string, coldPool: string): string | null {
  // Standalone skill: .git directly in skill dir
  if (existsSync(join(dir, ".git"))) {
    return dir;
  }

  try {
    const out = execSync("git rev-parse --show-toplevel", {
      cwd: dir,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();

    const resolvedRoot = realpathSync(out);
    const resolvedDir = realpathSync(dir);
    const resolvedColdPool = realpathSync(coldPool);

    // Must be an ancestor of dir (standalone case handled above)
    if (!resolvedDir.startsWith(resolvedRoot + "/")) {
      return null;
    }

    // Must be within cold_pool — prevents finding an unrelated git repo outside
    if (resolvedRoot === resolvedColdPool || resolvedRoot.startsWith(resolvedColdPool + "/")) {
      return out;
    }

    return null;
  } catch {
    return null;
  }
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

  const COLD_POOL = expandHome(deck.deck?.cold_pool || "~/.agents/skill-repos", PROJECT_DIR);

  // ── 收集声明 ────────────────────────────────────────────────

  const declared: { name: string; alias: string; path: string; type: string }[] = [];

  // Use parseDeck for alias-dict compatibility
  const { entries: parsedEntries, deprecated: isDeprecated } = parseDeck(deckRaw);
  if (isDeprecated) {
    console.warn("⚠️  Deprecation: string-array skill entries are deprecated. Run `deck migrate-schema` to upgrade.");
  }

  for (const entry of parsedEntries) {
    declared.push({ name: entry.path, alias: entry.alias, path: entry.path, type: entry.type });
  }

  if (declared.length === 0) {
    console.log("📭 No skills declared in deck. Nothing to refresh.");
    process.exit(0);
  }

  // ── 确定目标 ────────────────────────────────────────────────

  let targets: { name: string; alias: string; path: string; type: string }[];

  if (target) {
    // Try resolve as alias first, then as FQ path
    const byAlias = declared.find(d => d.alias === target);
    if (byAlias) {
      targets = [byAlias];
    } else {
      const byPath = declared.find(d => d.path === target);
      if (byPath) {
        targets = [byPath];
      } else {
        console.error(`❌ Skill not found in deck: ${target}`);
        console.error(`   Declared aliases: ${declared.map(d => d.alias).join(", ")}`);
        process.exit(1);
      }
    }
  } else {
    targets = declared;
  }

  // ── 执行刷新 ────────────────────────────────────────────────

  const results: RefreshResult[] = [];
  let updated = 0;
  let upToDate = 0;
  let skipped = 0;
  let failed = 0;

  for (const item of targets) {
    const result = findSource(item.path, COLD_POOL, PROJECT_DIR);

    if (result.error || !result.path) {
      results.push({ name: item.alias, path: "", status: "failed", message: result.error || "Skill not found in cold pool" });
      failed++;
      continue;
    }

    const path = result.path;

    // localhost skills are user-managed; skip
    const relativePath = relative(COLD_POOL, path);
    if (relativePath.startsWith("localhost")) {
      results.push({ name: item.alias, path: relativePath, status: "skipped", message: "localhost skill — user-managed" });
      skipped++;
      continue;
    }

    const gitRoot = findGitRoot(path, COLD_POOL);
    if (!gitRoot) {
      results.push({ name: item.alias, path: relativePath, status: "not-git", message: "skipped: not a git repository" });
      skipped++;
      continue;
    }

    const pullResult = gitPull(gitRoot);
    results.push({ name: item.alias, path: relativePath, status: pullResult.status, message: pullResult.message });

    if (pullResult.status === "updated") updated++;
    else if (pullResult.status === "up-to-date") upToDate++;
    else failed++;
  }

  // ── 报告 ────────────────────────────────────────────────────

  const scope = target ? `single skill` : `${declared.length} skill(s)`;
  console.log(`\n📦 Skill Refresh Report — ${scope} checked`);
  console.log(`   Updated: ${updated} | Up-to-date: ${upToDate} | Skipped: ${skipped} | Failed: ${failed}`);
  console.log();

  for (const r of results) {
    const icon =
      r.status === "updated" ? "🔄" :
      r.status === "up-to-date" ? "✅" :
      r.status === "skipped" ? "⏭️" :
      r.status === "not-git" ? "📁" :
      "❌";
    console.log(`${icon} ${r.name}`);
    if (r.message && r.status !== "up-to-date") {
      const lines = r.message.split("\n").filter(l => l.trim());
      for (const line of lines.slice(0, 3)) {
        console.log(`   ${line.trim()}`);
      }
      if (lines.length > 3) {
        console.log(`   ... (${lines.length - 3} more lines)`);
      }
    }
  }

  if (updated > 0) {
    console.log(`\n💡 Run 'bunx @lythos/skill-deck link' to sync refreshed skills to working set.`);
    console.log("🔗 Running deck link...");
    linkDeck(cliDeckPath, cliWorkdir);
  }

  if (failed > 0) {
    process.exit(1);
  }
}
