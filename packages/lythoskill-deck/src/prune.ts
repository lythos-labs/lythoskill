#!/usr/bin/env bun
/**
 * deck-prune.ts — Cold pool garbage collection
 *
 * Scans the cold pool for repositories no longer referenced by any
 * skill-deck.toml declaration and offers to delete them.
 * Does NOT modify deck.toml or the working set.
 */

import { parse as parseToml } from "@iarna/toml";
import { existsSync, readFileSync, readdirSync, statSync, rmSync } from "node:fs";
import { resolve, dirname, join, relative } from "node:path";
import { createInterface } from "node:readline";
import { findDeckToml, expandHome, findSource } from "./link.js";
import { parseDeck } from "./parse-deck.js";

interface PruneCandidate {
  repoPath: string;
  repoRel: string;
  size: number;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
}

function calculateDirSize(dir: string): number {
  let total = 0;
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name);
      if (entry.isDirectory()) {
        total += calculateDirSize(p);
      } else if (entry.isFile()) {
        total += statSync(p).size;
      }
    }
  } catch {}
  return total;
}

function scanColdPoolRepos(coldPool: string): string[] {
  const repos: string[] = [];
  try {
    for (const host of readdirSync(coldPool, { withFileTypes: true })) {
      if (!host.isDirectory() || host.name.startsWith(".")) continue;
      const hostPath = join(coldPool, host.name);

      // Flat skill: cold-pool/skill-name/ (localhost style)
      if (existsSync(join(hostPath, "SKILL.md"))) {
        repos.push(hostPath);
        continue;
      }

      for (const owner of readdirSync(hostPath, { withFileTypes: true })) {
        if (!owner.isDirectory() || owner.name.startsWith(".")) continue;
        const ownerPath = join(hostPath, owner.name);

        // Standalone repo: cold-pool/host.tld/owner/repo/
        if (existsSync(join(ownerPath, "SKILL.md"))) {
          repos.push(ownerPath);
          continue;
        }

        for (const repo of readdirSync(ownerPath, { withFileTypes: true })) {
          if (!repo.isDirectory() || repo.name.startsWith(".")) continue;
          repos.push(join(ownerPath, repo.name));
        }
      }
    }
  } catch {}
  return repos;
}

function isRepoReferenced(repoPath: string, declaredPaths: string[], coldPool: string, projectDir: string): boolean {
  for (const path of declaredPaths) {
    const result = findSource(path, coldPool, projectDir);
    if (result.path) {
      // Check if the resolved skill path is inside this repo
      const rel = relative(repoPath, result.path);
      if (!rel.startsWith("..") && rel !== "") {
        return true;
      }
      if (result.path === repoPath) {
        return true;
      }
    }
  }
  return false;
}

async function confirm(message: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`${message} (y/N) `, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === "y");
    });
  });
}

export async function pruneDeck(cliDeckPath?: string, cliWorkdir?: string, yes?: boolean): Promise<void> {
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

  const { entries: parsedEntries } = parseDeck(deckRaw);
  const declaredPaths = parsedEntries.map(e => e.path);

  // Legacy string-array fallback
  for (const section of ["innate", "tool", "combo"] as const) {
    const skills = deck[section]?.skills;
    if (Array.isArray(skills)) {
      for (const name of skills) {
        if (name && typeof name === "string" && !declaredPaths.includes(name)) {
          declaredPaths.push(name);
        }
      }
    }
  }

  // ── 扫描 cold pool ──────────────────────────────────────────

  if (!existsSync(COLD_POOL)) {
    console.log("📭 Cold pool does not exist. Nothing to prune.");
    process.exit(0);
  }

  const allRepos = scanColdPoolRepos(COLD_POOL);
  if (allRepos.length === 0) {
    console.log("📭 Cold pool is empty. Nothing to prune.");
    process.exit(0);
  }

  // ── 求差集 ──────────────────────────────────────────────────

  const candidates: PruneCandidate[] = [];
  for (const repoPath of allRepos) {
    if (isRepoReferenced(repoPath, declaredPaths, COLD_POOL, PROJECT_DIR)) continue;
    const size = calculateDirSize(repoPath);
    candidates.push({ repoPath, repoRel: relative(COLD_POOL, repoPath), size });
  }

  if (candidates.length === 0) {
    console.log("✅ All cold pool repositories are referenced. Nothing to prune.");
    process.exit(0);
  }

  // ── 报告 ────────────────────────────────────────────────────

  const totalSize = candidates.reduce((sum, c) => sum + c.size, 0);
  console.log(`\n🧹 Prune candidates — ${candidates.length} repo(s), ${formatSize(totalSize)} total:\n`);
  for (const c of candidates) {
    console.log(`   ${c.repoRel} (${formatSize(c.size)})`);
  }

  // ── 确认 ────────────────────────────────────────────────────

  let shouldDelete = false;
  if (yes) {
    shouldDelete = true;
    console.log("\n⚠️  --yes flag set: deleting without confirmation.");
  } else {
    shouldDelete = await confirm(`\nDelete ${candidates.length} unreferenced repo(s)?`);
  }

  if (!shouldDelete) {
    console.log("❎ Prune cancelled.");
    process.exit(0);
  }

  // ── 执行删除 ────────────────────────────────────────────────

  let deleted = 0;
  let failed = 0;
  for (const c of candidates) {
    try {
      rmSync(c.repoPath, { recursive: true, force: true });
      console.log(`  🗑️  Deleted: ${c.repoRel}`);
      deleted++;
    } catch (err: any) {
      console.error(`  ❌ Failed to delete ${c.repoRel}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n📦 Prune complete: ${deleted} deleted, ${failed} failed`);

  if (failed > 0) {
    process.exit(1);
  }
}
