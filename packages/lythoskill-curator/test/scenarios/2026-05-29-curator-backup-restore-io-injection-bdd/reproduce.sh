#!/bin/bash
# T5: backupIndex/restoreIndex/printHelp IO Injection — Agent BDD (reproduce.sh)
# Task: TASK-20260529214624302
# Epic: EPIC-20260529214429614
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "=== Step 1: Verify target file ==="
echo "  $REPO_ROOT/packages/lythoskill-curator/src/cli.ts"

echo ""
echo "=== Step 2: Run backup/restore/help tests ==="
cd "$REPO_ROOT"
bun test packages/lythoskill-curator/src/cli.test.ts --grep "backupIndex|restoreIndex|printHelp" 2>&1 | tail -10

echo ""
echo "=== Step 3: Agent executes task (IoC handoff) ==="
echo "  cd $REPO_ROOT"
echo "  <spawn subagent>"
echo ""
echo "  Task:"
echo "    1. Read packages/lythoskill-curator/src/cli.ts"
echo "    2. Verify signatures:"
echo "       - backupIndex(outputDir, io?: CuratorIO)"
echo "       - restoreIndex(outputDir, io?: CuratorIO)"
echo "       - printHelp(io?: CuratorIO)"
echo "    3. Verify all use io.log/io.error/io.exit"
echo "    4. Read packages/lythoskill-curator/src/cli.test.ts"
echo "    5. Verify B1-B3 + H1 tests exist:"
echo "       - B1: Backup created → log + files"
echo "       - B2: Restore from backup → content restored"
echo "       - B3: No backup → error + exit(1)"
echo "       - H1: Help contains key commands"
echo "    6. Run bun test --grep 'backupIndex|restoreIndex|printHelp'"
echo "    7. Write decision-log.jsonl to $SCRIPT_DIR/"

echo ""
echo "=== Step 4: Judge ==="
echo "  Criteria: $SCRIPT_DIR/judge.md"
