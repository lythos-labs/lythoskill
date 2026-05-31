#!/bin/bash
# T2: runAudit IO Injection — Agent BDD (reproduce.sh)
# Task: TASK-20260529214618391
# Epic: EPIC-20260529214429614
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "=== Step 1: Verify target file ==="
echo "  $REPO_ROOT/packages/lythoskill-curator/src/cli.ts"

echo ""
echo "=== Step 2: Run audit tests ==="
cd "$REPO_ROOT"
bun test packages/lythoskill-curator/src/cli.test.ts --grep "runAudit" 2>&1 | tail -10

echo ""
echo "=== Step 3: Agent executes task (IoC handoff) ==="
echo "  cd $REPO_ROOT"
echo "  <spawn subagent>"
echo ""
echo "  Task:"
echo "    1. Read packages/lythoskill-curator/src/cli.ts"
echo "    2. Verify runAudit(argv, io?: CuratorIO) signature exists"
echo "    3. Verify runAudit uses io.log/io.error/io.exit"
echo "    4. Read packages/lythoskill-curator/src/cli.test.ts"
echo "    5. Verify A1-A3 tests exist:"
echo "       - A1: Normal audit → Summary + score"
echo "       - A2: Empty DB → 0 issues, score 100"
echo "       - A3: DB not found → error + exit(1)"
echo "    6. Run bun test --grep 'runAudit'"
echo "    7. Write decision-log.jsonl to $SCRIPT_DIR/"

echo ""
echo "=== Step 4: Judge ==="
echo "  Criteria: $SCRIPT_DIR/judge.md"
