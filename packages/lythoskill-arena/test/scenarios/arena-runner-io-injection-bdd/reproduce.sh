#!/usr/bin/env bash
# Arena Runner IO Injection — Agent BDD (reproduce.sh)
# Task: TASK-20260530135730555
# Date: 2026-05-30
#
# ═══════════════════════════════════════════════════════════════════════════
# AGENT-ONLY REPLAY — human execution is intentionally incomplete.
#
#   bash reproduce.sh
#
# Step 3 is NOT a shell command. It prints a contextual instruction to stdout.
# When a HUMAN runs this, Step 3 is useless — they see an echo and nothing.
# When an AGENT runs this, Step 3 acts as IoC prompt injection:
#   the agent reads stdout, recognizes <spawn subagent> as its role, takes over.
#
# Pattern: Shell stdout as Agent Prompt Injection
# Judge criteria are in judge.md — NOT embedded in the task prompt.
# The task agent never sees the scoring rubric.
# ═══════════════════════════════════════════════════════════════════════════
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
WORKDIR="/tmp/reproduce-arena-runner-$(date +%Y%m%d-%H%M%S)"

cleanup() {
  rm -rf "$WORKDIR"
}
trap cleanup EXIT

echo "=== Step 1: Verify repo structure ==="
echo "  Repo root: $REPO_ROOT"
echo "  Target file: packages/lythoskill-arena/src/runner.ts"
echo "  Test file:   packages/lythoskill-arena/src/runner.test.ts"

echo ""
echo "=== Step 2: Run existing runner tests (deterministic scaffold) ==="
cd "$REPO_ROOT"
bun test packages/lythoskill-arena/src/runner.test.ts --silent 2>&1 | tail -5 || true

echo ""
echo "=== Step 3: Agent executes task in repo (IoC handoff) ==="
echo "  cd $REPO_ROOT"
echo "  <spawn subagent>"
echo ""
echo "  Task:"
echo "    1. Read packages/lythoskill-arena/src/runner.ts"
echo "    2. Verify runArenaFromToml({ toml, taskPath }, mockIO) accepts mock IO:"
echo "       - runArenaFromToml(opts: { toml, taskPath, outDir?, dryRun?, log?, configDir? })"
echo "       - The dryRun option must produce a plan WITHOUT real fs/spawn/agent calls"
echo "    3. Verify mock IO prevents real agent spawn when dryRun=true:"
echo "       - No Bun.spawn, no useAgent, no agent.spawn calls in dry-run path"
echo "       - Only io.log (or opts.log) is called with plan output"
echo "    4. Create a minimal arena.toml + task brief at $WORKDIR/"
echo "       arena.toml must have at least 2 sides with different decks."
echo "    5. Create a minimal test file at $WORKDIR/arena-runner-io.test.ts"
echo "       that calls runArenaFromToml with dryRun=true and a mock log function."
echo "       Verify the mock log captures plan output (side names, run counts, decks)."
echo "    6. Run the test file with bun test $WORKDIR/arena-runner-io.test.ts"
echo "    7. Write decision-log.jsonl to $WORKDIR"
echo "       Each line: {\"step\":\"...\",\"decision\":\"...\",\"reason\":\"...\",\"ts\":\"...\"}"
echo ""

echo "=== Step 4: Judge verification (criteria in judge.md) ==="
echo "  After agent completes, verify against $SCRIPT_DIR/judge.md"
echo "  Write judge-verdict.json to $WORKDIR"

echo ""
echo "=== Step 5: archive ==="
mkdir -p "$WORKDIR"
bunx @lythos/skill-arena@latest archive \
  --from "$WORKDIR" \
  --to "$SCRIPT_DIR/run-output" \
  --sides side-a \
  --report "$WORKDIR/report.md" 2>/dev/null || echo "  (archive skipped — run after agent completes)"

echo ""
echo "=== Done ==="
echo "  Agent output: $WORKDIR"
echo "  Judge criteria: $SCRIPT_DIR/judge.md"
