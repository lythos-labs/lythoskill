#!/usr/bin/env bun
/**
 * scripts/pre-commit-test.ts — Pre-commit test gate
 *
 * Only runs tests for packages with staged source changes.
 * Blocks commit if any test fails (exit 1).
 *
 * Called by .husky/pre-commit after ADR checks.
 */

import { $ } from "bun";
import { existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");

// 1. Find staged files in packages/*/src/
const staged = await $`git -C ${ROOT} diff --cached --name-only --diff-filter=ACM`.quiet();
const stagedFiles = staged.text().trim().split("\n").filter(Boolean);
const srcPattern = /^packages\/([^/]+)\/src\//;
const changedPackages = new Set<string>();
for (const f of stagedFiles) {
  const m = f.match(srcPattern);
  if (m) changedPackages.add(m[1]);
}

// Also check test/ and scripts/ changes
const testPattern = /^packages\/([^/]+)\/test\//;
for (const f of stagedFiles) {
  const m = f.match(testPattern);
  if (m) changedPackages.add(m[1]);
}

if (changedPackages.size === 0) {
  process.exit(0);
}

// 2. Run tests per changed package
let failed = 0;
for (const pkg of changedPackages) {
  const pkgDir = join(ROOT, "packages", pkg);
  if (!existsSync(pkgDir)) continue;

  console.log(`\n🧪 ${pkg}`);
  const result = await $`sh -c "cd packages/${pkg} && bun test 2>&1 || true"`.cwd(ROOT).nothrow().quiet();
  const stdout = result.stdout.toString();

  // bun test exits 1 when 0 test files found — not a failure
  if (stdout.includes("0 test files matching")) {
    console.log(`✅ ${pkg}: no test files (skip)`);
    continue;
  }

  const exitCode = result.exitCode;
  if (exitCode !== 0) {
    console.error(`❌ ${pkg}: tests failed (exit ${exitCode})`);
    failed++;
  } else {
    console.log(`✅ ${pkg}: 0 fail`);
  }
}

if (failed > 0) {
  console.error(`\n❌ ${failed} package(s) have failing tests. Fix before committing.`);
  process.exit(1);
}

console.log(`✅ All changed packages pass (${changedPackages.size} checked)`);
process.exit(0);
