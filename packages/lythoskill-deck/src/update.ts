#!/usr/bin/env bun
/**
 * deck-update.ts — Update declared skills from their upstream sources
 *
 * 读取 skill-deck.toml → 遍历声明的 skill → 对 git 来源执行 pull。
 * 职责：让冷池跟上上游版本。
 * 不做：下载新 skill（那是 add 的职责）、修改 deck.toml、同步 working set。
 */

import { parse as parseToml } from "@iarna/toml";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve, dirname, join, relative } from "node:path";
import { findDeckToml, expandHome, findSource } from "./link.js";

interface UpdateResult {
  name: string;
  path: string;
  status: "updated" | "up-to-date" | "skipped" | "failed" | "not-git";
  message?: string;
}

function isGitRepo(dir: string): boolean {
  return existsSync(join(dir, ".git"));
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

export function updateDeck(cliDeckPath?: string, cliWorkdir?: string): void {
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

  const declared: { name: string; type: string }[] = [];

  for (const section of ["innate", "tool", "combo"] as const) {
    for (const name of (deck[section]?.skills || [])) {
      if (!name || typeof name !== "string") continue;
      declared.push({ name, type: section });
    }
  }

  if (declared.length === 0) {
    console.log("📭 No skills declared in deck. Nothing to update.");
    process.exit(0);
  }

  // ── 执行更新 ────────────────────────────────────────────────

  const results: UpdateResult[] = [];
  let updated = 0;
  let upToDate = 0;
  let skipped = 0;
  let failed = 0;

  for (const { name, type } of declared) {
    const result = findSource(name, COLD_POOL, PROJECT_DIR);

    if (result.error || !result.path) {
      results.push({ name, path: "", status: "failed", message: result.error || "Skill not found" });
      failed++;
      continue;
    }

    const path = result.path;

    // localhost skills are user-managed; skip
    const relativePath = relative(COLD_POOL, path);
    if (relativePath.startsWith("localhost")) {
      results.push({ name, path: relativePath, status: "skipped", message: "localhost skill — user-managed" });
      skipped++;
      continue;
    }

    if (!isGitRepo(path)) {
      results.push({ name, path: relativePath, status: "not-git", message: "Not a git repository" });
      skipped++;
      continue;
    }

    const pullResult = gitPull(path);
    results.push({ name, path: relativePath, status: pullResult.status, message: pullResult.message });

    if (pullResult.status === "updated") updated++;
    else if (pullResult.status === "up-to-date") upToDate++;
    else failed++;
  }

  // ── 报告 ────────────────────────────────────────────────────

  console.log(`\n📦 Skill Update Report — ${declared.length} skill(s) checked`);
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
    console.log(`\n💡 Run 'bunx @lythos/skill-deck link' to sync updated skills to working set.`);
  }

  if (failed > 0) {
    process.exit(1);
  }
}

