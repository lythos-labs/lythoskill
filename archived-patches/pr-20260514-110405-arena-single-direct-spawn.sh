#!/bin/bash
# PR: 20260514-110405-arena-single-direct-spawn
# Step 3 — cli.ts singleRun uses direct agent.spawn, not runAgentScenario.
# Arena fully liberated from "borrowing test infrastructure" (parseAgentMd, AgentScenario).
set -e
PATCH_NAME="$(basename "$0")"
STAMP="$(date +%Y%m%d-%H%M%S)"
mkdir -p archived-patches
cp packages/lythoskill-arena/src/cli.ts "archived-patches/cli.ts.${STAMP}.bak"
echo "✅ Backup: cli.ts"
# Self-archive
cp "$0" "archived-patches/${PATCH_NAME}"
rm "$0"
echo "   cli.ts singleRun → agent.spawn directly (no runAgentScenario/parseAgentMd)"
