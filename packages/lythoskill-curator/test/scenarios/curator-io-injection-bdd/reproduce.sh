#!/bin/bash
# Curator CLI IO Injection — Agent BDD (reproduce.sh)
# Epic: EPIC-20260529214429614 / Task: TASK-20260529214622541
# Date: 2026-05-29
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
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKDIR="/tmp/reproduce-curator-io-$(date +%Y%m%d-%H%M%S)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "=== Step 1: Verify repo structure ==="
echo "  Repo root: $REPO_ROOT"
echo "  Target file: packages/lythoskill-curator/src/cli.ts"
echo "  Test file:   packages/lythoskill-curator/src/cli.test.ts"

echo ""
echo "=== Step 2: Run existing unit tests (deterministic scaffold) ==="
cd "$REPO_ROOT"
bun test packages/lythoskill-curator/src/cli.test.ts --silent 2>&1 | tail -5 || true

echo ""
echo "=== Step 3: Agent executes task in repo (IoC handoff) ==="
echo "  cd $REPO_ROOT"
echo "  <spawn subagent>"
echo ""
echo "  Task:"
echo "    1. Read packages/lythoskill-curator/src/cli.ts"
echo "    2. Verify ALL exported CLI entry functions accept CuratorIO parameter:"
echo "       - runCurator(argv, io?)"
echo "       - runAdd(argv, io?)"
echo "       - runTag(argv, io?)"
echo "       - runQuery(argv, io?)"
echo "       - runAudit(argv, io?)"
echo "       - runFind(argv, io?)"
echo "       - runRefreshPlan(argv, io?)   ← async"
echo "       - runRefreshExecute(argv, io?) ← async"
echo "       - backupIndex(outputDir, io?)"
echo "       - restoreIndex(outputDir, io?)"
echo "       - printHelp(io?)"
echo "    3. Verify ZERO direct console.log / console.error / process.exit calls"
echo "       inside these functions (all go through destructured {log, error, exit})."
echo "    4. Verify runRefreshPlan and runRefreshExecute use HEAD..@{upstream}"
echo "       (two-dot range) not HEAD...@{upstream} (three-dot range)."
echo "    5. Read packages/lythoskill-curator/src/cli.test.ts"
echo "    6. Verify tests inject IO (no spyOn(console) or spyOn(process))."
echo "    7. Verify R1-R5 refresh tests exist and cover:"
echo "       - R1: empty pool → 0 items"
echo "       - R2: pool with git repo → plan includes repo"
echo "       - R3: two-dot range verification"
echo "       - R4: no plan file → error + exit(1)"
echo "       - R5: all up to date → success"
echo "    8. Run bun test packages/lythoskill-curator/src/cli.test.ts"
echo "    9. Write decision-log.jsonl to $WORKDIR"
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
