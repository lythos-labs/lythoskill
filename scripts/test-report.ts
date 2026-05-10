#!/usr/bin/env bun
/**
 * scripts/test-report.ts — Full test report snapshot per commit.
 *
 * Usage:
 *   bun scripts/test-report.ts              # all unit tests (fast)
 *   bun scripts/test-report.ts --quick      # only changed packages
 *   bun scripts/test-report.ts --bdd        # include agent BDD (expensive, LLM calls)
 *   bun scripts/test-report.ts --all        # unit + coverage + BDD (full sweep)
 *
 * Output: test-results/<YYYYMMDD-HHMMSS>-<short-hash>.txt
 * Symlink: test-results/latest.txt → most recent report
 *
 * Called by: CI (test.yml), manually before release, or via "bun run test:report"
 */

import { mkdirSync, writeFileSync, symlinkSync, unlinkSync, existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");

// Parse flags
const args = process.argv.slice(2);
const quick = args.includes("--quick");
const bdd = args.includes("--bdd");
const all = args.includes("--all");

// ── Helpers ─────────────────────────────────────────────────
async function spawnQuiet(cmd: string, args: string[]): Promise<string> {
  const proc = Bun.spawn([cmd, ...args], { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] });
  const exitCode = await proc.exited;
  if (exitCode !== 0) return "";
  const text = await new Response(proc.stdout).text();
  return text.trim();
}

// ── Git context ────────────────────────────────────────────
const shortHash = await spawnQuiet("git", ["-C", ROOT, "rev-parse", "--short", "HEAD"]);
const fullHash = await spawnQuiet("git", ["-C", ROOT, "rev-parse", "HEAD"]);
const commitMsg = await spawnQuiet("git", ["-C", ROOT, "log", "-1", "--format=%s"]);
const branch = await spawnQuiet("git", ["-C", ROOT, "branch", "--show-current"]);
const dateIso = new Date().toISOString();
const fileId = `${dateIso.replace(/[:.]/g, "-").slice(0, 19).replace(/T/, "-")}-${shortHash}`;

const outDir = join(ROOT, "test-results");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, `${fileId}.txt`);

const lines: string[] = [];
let totalFailures = 0;
let totalPasses = 0;

function header() {
  lines.push("# Test Report");
  lines.push(`# date:    ${dateIso}`);
  lines.push(`# commit:  ${fullHash} (${shortHash})`);
  lines.push(`# message: ${commitMsg}`);
  lines.push(`# branch:  ${branch}`);
  lines.push(`# mode:    ${quick ? "quick" : all ? "full" : bdd ? "unit+bdd" : "unit"}`);
  lines.push("");
}

// ── Package discovery ──────────────────────────────────────
// Read workspace packages from root package.json (avoid hardcoding)
const rootPkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf-8"));
const workspaceGlobs: string[] = rootPkg.workspaces ?? ["packages/*"];
// Discover all workspace packages from fs (avoids hardcoded lists)
const allPackages: string[] = [];
for (const g of workspaceGlobs) {
  const base = g.replace(/\/\*$/, ""); // "packages/*" → "packages"
  const dir = join(ROOT, base);
  if (!existsSync(dir)) continue;
  for (const entry of readdirSync(dir)) {
    const pkgJson = join(dir, entry, "package.json");
    if (existsSync(pkgJson)) allPackages.push(entry);
  }
}

async function findChangedPackages(): Promise<Set<string>> {
  const changed = new Set<string>();
  const stagedFiles = await spawnQuiet("git", ["diff", "--cached", "--name-only", "--diff-filter=ACM"]);
  const files = (stagedFiles || await spawnQuiet("git", ["diff", "--name-only", "--diff-filter=ACM"]))
    .split("\n").filter(Boolean);
  for (const f of files) {
    const m = f.match(/^packages\/([^/]+)\/(?:src|test)\//);
    if (m) changed.add(m[1]);
  }
  return changed;
}

// ── Runner ──────────────────────────────────────────────────
async function runSuite(label: string, pkgDir: string, filter?: string) {
  const sep = "─".repeat(60);
  const cmd = filter
    ? `bun test --filter="${filter}" src/`
    : `bun test src/`;
  lines.push(`${sep}`);
  lines.push(`  ${label} (${pkgDir})`);
  lines.push(`  $ cd ${pkgDir} && ${cmd}`);
  lines.push(`${sep}`);

  const proc = Bun.spawn(
    ["sh", "-c", `cd ${pkgDir} && ${cmd} 2>&1 || true`],
    { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] },
  );
  const out = await new Response(proc.stdout).text();
  const exitCode = await proc.exited;

  lines.push(out);
  if (exitCode !== 0) {
    const failMatch = out.match(/(\d+) fail/);
    const passMatch = out.match(/(\d+) pass/);
    const fails = failMatch ? parseInt(failMatch[1]) : 0;
    const passes = passMatch ? parseInt(passMatch[1]) : 0;
    totalFailures += fails;
    totalPasses += passes;
    if (fails > 0) {
      lines.push(`  ❌ ${fails} fail(s)`);
    }
    if (out.includes("0 test files matching")) {
      lines.push("  ℹ️  no test files");
    }
  }
  lines.push("");
}

// ── Coverage runner ─────────────────────────────────────────
async function runCoverage(label: string, pkgDir: string) {
  const sep = "─".repeat(60);
  lines.push(`${sep}`);
  lines.push(`  ${label} (coverage)`);
  lines.push(`  $ cd ${pkgDir} && bun test --coverage src/`);
  lines.push(`${sep}`);

  const proc = Bun.spawn(
    ["sh", "-c", `cd ${pkgDir} && bun test --coverage src/ 2>&1 || true`],
    { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] },
  );
  const out = await new Response(proc.stdout).text();
  lines.push(out);
  lines.push("");
}

// ── Agent BDD runner ────────────────────────────────────────
const BDD_RUNNERS: Array<{ label: string; cmd: string[] }> = [
  { label: "cortex BDD", cmd: ["bun", "packages/lythoskill-project-cortex/test/runner.ts"] },
  { label: "deck BDD", cmd: ["bun", "packages/lythoskill-deck/test/runner.ts"] },
];

async function runBddSuite(label: string, cmd: string[]) {
  const sep = "─".repeat(60);
  lines.push(`${sep}`);
  lines.push(`  ${label} (agent BDD)`);
  lines.push(`  $ ${cmd.join(" ")}`);
  lines.push(`${sep}`);

  const proc = Bun.spawn(cmd, { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] });
  const out = await new Response(proc.stdout).text();
  const exitCode = await proc.exited;

  lines.push(out);
  if (exitCode !== 0) {
    lines.push(`  ⚠️  exit=${exitCode}`);
  }
  lines.push("");
}

// ── Main ────────────────────────────────────────────────────
async function main() {
  header();

  const targetPackages = quick
    ? [...(await findChangedPackages())]
    : allPackages;

  // Phase 1: Unit tests (always run)
  lines.push("## Unit Tests");
  lines.push("");
  for (const pkg of targetPackages) {
    const pkgDir = join(ROOT, "packages", pkg);
    if (!existsSync(pkgDir)) continue;
    await runSuite(pkg, pkgDir);
  }

  // Phase 2: Coverage (--all only)
  if (all) {
    lines.push("## Coverage");
    lines.push("");
    for (const pkg of targetPackages) {
      const pkgDir = join(ROOT, "packages", pkg);
      if (!existsSync(pkgDir)) continue;
      await runCoverage(pkg, pkgDir);
    }
  }

  // Phase 3: Agent BDD (--bdd or --all only)
  if (bdd || all) {
    lines.push("## Agent BDD");
    lines.push("");
    lines.push("> ⚠️ Agent BDD tests use LLM calls — expensive, not for pre-commit.");
    lines.push("> Run intentionally before major releases or architecture changes.");
    lines.push("");
    for (const suite of BDD_RUNNERS) {
      await runBddSuite(suite.label, suite.cmd);
    }
  }

  // Summary
  const sep = "═".repeat(60);
  lines.push(sep);
  lines.push(`report: ${outPath}`);
  if (totalFailures > 0) {
    lines.push(`result: ${totalFailures} FAILURE(S)`);
  } else {
    lines.push(`result: ${totalPasses} pass(es), 0 fail`);
  }

  const content = lines.join("\n") + "\n";
  writeFileSync(outPath, content);
  console.log(content);

  // Update latest symlink
  const latestLink = join(outDir, "latest.txt");
  if (existsSync(latestLink)) unlinkSync(latestLink);
  symlinkSync(`${fileId}.txt`, latestLink);

  console.log(`📋 ${outPath}`);
  console.log(`📎 ${latestLink}`);
}

main().catch((err) => {
  console.error("❌", err.message);
  process.exit(1);
});
