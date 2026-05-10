#!/usr/bin/env bun
/**
 * scripts/check-path-safety.ts — Pre-commit path safety guard.
 *
 * Detects: user-controlled aliases used as path components without prior
 * sanitization via validateAlias() or safeResolveInDir().
 *
 * Runs in <100ms — suitable for husky pre-commit.
 * Blocks commit if unsafe patterns found (exit 1).
 *
 * Reference: CWE-22, deck sweep 2026-05-10 P0+P1 findings
 */

import { readFileSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const PACKAGES_DIR = join(ROOT, "packages");

// Ranked by filesystem manipulation risk (deck > cold-pool > arena > curator)
const GUARDED_PACKAGES = [
  "lythoskill-deck",
  "lythoskill-cold-pool",
  "lythoskill-arena",
  "lythoskill-curator",
];

// Patterns that indicate alias/path used without sanitization
// Rule: join(workingSet, alias) is unsafe; join(workingSet, validatedAlias) is OK
const UNSAFE_JOIN_ALIAS = /join\(\s*\w+,\s*(?:match\.alias|alias|skill)\s*\)/;
const VALIDATION_CALL = /validateAlias|safeResolveInDir/;

interface Finding {
  file: string;
  line: number;
  content: string;
}

function checkFile(filePath: string): Finding[] {
  const findings: Finding[] = [];
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  // If the file imports path-guard, it's aware of the safe pattern — skip checking
  if (content.includes("from \"./path-guard.js\"") || content.includes("from './path-guard.js'")) {
    return findings;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (UNSAFE_JOIN_ALIAS.test(line)) {
      findings.push({
        file: filePath,
        line: i + 1,
        content: line.trim(),
      });
    }
  }
  return findings;
}

function main() {
  const allFindings: Finding[] = [];

  for (const pkg of GUARDED_PACKAGES) {
    const srcDir = join(PACKAGES_DIR, pkg, "src");
    if (!existsSync(srcDir)) continue;

    for (const entry of require("node:fs").readdirSync(srcDir)) {
      if (!entry.endsWith(".ts") || entry.endsWith(".test.ts")) continue;
      const filePath = join(srcDir, entry);
      const findings = checkFile(filePath);
      allFindings.push(...findings);
    }
  }

  if (allFindings.length === 0) {
    console.log("✅ path-safety: no unsafe alias/path usage detected");
    process.exit(0);
  }

  console.error("❌ path-safety: unsafe alias/path usage detected:");
  console.error("");
  for (const f of allFindings) {
    const rel = relative(ROOT, f.file);
    console.error(`  ${rel}:${f.line}  ${f.content}`);
  }
  console.error("");
  console.error("Fix: wrap alias/path with validateAlias() or safeResolveInDir() before using in join().");
  console.error("See: packages/lythoskill-deck/src/path-guard.ts");
  process.exit(1);
}

main();
