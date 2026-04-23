#!/usr/bin/env bun
// Thin script — routes to the starter package
import { spawnSync } from "node:child_process";

const result = spawnSync(
  "bunx",
  ["@lythos/skill-arena", ...process.argv.slice(2)],
  { stdio: "inherit", shell: false }
);
process.exit(result.status ?? 0);
