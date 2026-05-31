#!/bin/bash
# T6: --help entry IO Injection — Agent BDD (reproduce.sh)
# Task: TASK-20260529214626313
# Epic: EPIC-20260529214429614
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "=== Step 1: Verify target file ==="
echo "  $REPO_ROOT/packages/lythoskill-curator/src/cli.ts"

echo ""
echo "=== Step 2: Run help tests ==="
cd "$REPO_ROOT"
bun test packages/lythoskill-curator/src/cli.test.ts --grep "printHelp" 2>&1 | tail -10

echo ""
echo "=== Step 3: Agent executes task (IoC handoff) ==="
echo "  cd $REPO_ROOT"
echo "  <spawn subagent>"
echo ""
echo "  Task:"
echo "    1. Read packages/lythoskill-curator/src/cli.ts"
echo "    2. Verify main entry routes --help to printHelp(defaultCuratorIO)"
echo "    3. Verify printHelp(io?: CuratorIO) uses io.log/io.exit"
echo "    4. Read packages/lythoskill-curator/src/cli.test.ts"
echo "    5. Verify H1 test exists: help output contains key commands"
echo "    6. Run bun test --grep 'printHelp'"
echo "    7. Write decision-log.jsonl to $SCRIPT_DIR/"

echo ""
echo "=== Step 4: Judge ==="
echo "  Criteria: $SCRIPT_DIR/judge.md"
