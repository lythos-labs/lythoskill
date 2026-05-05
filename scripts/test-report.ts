#!/usr/bin/env bun
/**
 * scripts/test-report.ts — Capture full test suite output + coverage per commit.
 * Usage: bun scripts/test-report.ts
 * Output: test-results/<YYYYMMDD-HHMMSS>-<short-hash>.txt
 */

import { $ } from "bun";
import { mkdirSync, writeFileSync, symlinkSync, unlinkSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");

const shortHash = (await $`git -C ${ROOT} rev-parse --short HEAD`.quiet()).text().trim();
const fullHash = (await $`git -C ${ROOT} rev-parse HEAD`.quiet()).text().trim();
const commitMsg = (await $`git -C ${ROOT} log -1 --format=%s`.quiet()).text().trim();
const branch = (await $`git -C ${ROOT} branch --show-current`.quiet()).text().trim();
const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const fileId = `${timestamp.replace(/T/, "-")}-${shortHash}`;
const dateIso = new Date().toISOString();

const outDir = join(ROOT, "test-results");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, `${fileId}.txt`);

const lines: string[] = [];

function header() {
  lines.push("# Test Report");
  lines.push(`# date:    ${dateIso}`);
  lines.push(`# commit:  ${fullHash} (${shortHash})`);
  lines.push(`# message: ${commitMsg}`);
  lines.push(`# branch:  ${branch}`);
  lines.push("");
}

async function runSuite(name: string, cmd: string[]) {
  const sep = "─".repeat(60);
  lines.push(`${sep}`);
  lines.push(`  ${name}`);
  lines.push(`${sep}`);
  lines.push(`$ ${cmd.join(" ")}`);
  lines.push("");

  const proc = Bun.spawn(cmd, { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] });
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;

  lines.push(out);
  if (err) lines.push(err);
  if (exitCode !== 0) lines.push(`  ⚠️  exit=${exitCode}`);
  lines.push("");
}

async function main() {
  header();

  await runSuite("test-utils", ["bun", "test", "packages/lythoskill-test-utils/src/bdd-runner.test.ts", "packages/lythoskill-test-utils/src/agent-bdd.test.ts", "packages/lythoskill-test-utils/src/judge.test.ts", "packages/lythoskill-test-utils/src/agents-claude.test.ts", "packages/lythoskill-test-utils/src/schema.test.ts"]);
  await runSuite("curator", ["bun", "test",
    "packages/lythoskill-curator/src/curator-core.test.ts",
    "packages/lythoskill-curator/src/feed-adapters.test.ts",
    "packages/lythoskill-curator/src/cli.test.ts",
    "--if-present",
  ]);
  await runSuite("cortex-bdd", ["bun", "packages/lythoskill-project-cortex/test/runner.ts"]);
  await runSuite("deck-unit", ["bun", "test", "packages/lythoskill-deck/src/"]);
  await runSuite("deck-bdd", ["bun", "packages/lythoskill-deck/test/runner.ts"]);
  await runSuite("arena", ["bun", "test", "packages/lythoskill-arena/src/"]);

  const sep = "═".repeat(60);
  lines.push(sep);
  lines.push(`report: ${outPath}`);

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
  console.error(err);
  process.exit(1);
});
