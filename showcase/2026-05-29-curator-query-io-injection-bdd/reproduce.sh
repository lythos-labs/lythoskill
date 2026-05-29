#!/bin/bash
# T1: runQuery IO Injection — Agent BDD (reproduce.sh)
# Task: TASK-20260529214616879
# Epic: EPIC-20260529214429614
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "=== Step 1: Verify target file ==="
echo "  $REPO_ROOT/packages/lythoskill-curator/src/cli.ts"

echo ""
echo "=== Step 2: Run query tests ==="
cd "$REPO_ROOT"
bun test packages/lythoskill-curator/src/cli.test.ts --grep "runQuery" 2>&1 | tail -10

echo ""
echo "=== Step 3: Agent executes task (IoC handoff) ==="
echo "  cd $REPO_ROOT"
echo "  <spawn subagent>"
echo ""
echo "  Task:"
echo "    1. Read packages/lythoskill-curator/src/cli.ts"
echo "    2. Verify runQuery(argv, io?: CuratorIO) signature exists"
echo "    3. Verify runQuery uses io.log/io.error/io.exit (not console/process directly)"
echo "    4. Read packages/lythoskill-curator/src/cli.test.ts"
echo "    5. Verify Q1-Q4 tests exist:"
echo "       - Q1: No SQL + DB exists → schema output"
echo "       - Q2: SELECT query → markdown table"
echo "       - Q3: DB not found → error + exit(1)"
echo "       - Q4: Non-SELECT query → rejected"
echo "    6. Run bun test packages/lythoskill-curator/src/cli.test.ts --grep 'runQuery'"
echo "    7. Write decision-log.jsonl to $SCRIPT_DIR/"
echo ""
echo "=== Step 4: Judge ==="
echo "  Criteria: $SCRIPT_DIR/judge.md"
