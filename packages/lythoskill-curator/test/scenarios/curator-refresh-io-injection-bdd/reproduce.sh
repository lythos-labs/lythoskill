#!/bin/bash
# T4: runRefreshPlan/Execute IO Injection — Agent BDD (reproduce.sh)
# Task: TASK-20260529214622541
# Epic: EPIC-20260529214429614
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "=== Step 1: Verify target file ==="
echo "  $REPO_ROOT/packages/lythoskill-curator/src/cli.ts"

echo ""
echo "=== Step 2: Run refresh tests ==="
cd "$REPO_ROOT"
bun test packages/lythoskill-curator/src/cli.test.ts --grep "runRefresh" 2>&1 | tail -10

echo ""
echo "=== Step 3: Agent executes task (IoC handoff) ==="
echo "  cd $REPO_ROOT"
echo "  <spawn subagent>"
echo ""
echo "  Task:"
echo "    1. Read packages/lythoskill-curator/src/cli.ts"
echo "    2. Verify runRefreshPlan and runRefreshExecute are export async with io?: CuratorIO"
echo "    3. Verify both use io.log/io.error/io.exit (not console/process directly)"
echo "    4. Verify git range is HEAD..@{upstream} (two-dot) not HEAD...@{upstream} (three-dot)"
echo "    5. Read packages/lythoskill-curator/src/cli.test.ts"
echo "    6. Verify R1-R5 tests exist:"
echo "       - R1: Empty pool → 0 items"
echo "       - R2: Pool with git repo → plan includes repo"
echo "       - R3: Two-dot range verification"
echo "       - R4: No plan file → error + exit(1)"
echo "       - R5: All up to date → success"
echo "    7. Run bun test --grep 'runRefresh'"
echo "    8. Write decision-log.jsonl to $SCRIPT_DIR/"

echo ""
echo "=== Step 4: Judge ==="
echo "  Criteria: $SCRIPT_DIR/judge.md"
