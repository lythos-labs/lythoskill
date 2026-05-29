#!/bin/bash
# T3: runTag IO Injection — Agent BDD (reproduce.sh)
# Task: TASK-20260529214620383
# Epic: EPIC-20260529214429614
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "=== Step 1: Verify target file ==="
echo "  $REPO_ROOT/packages/lythoskill-curator/src/cli.ts"

echo ""
echo "=== Step 2: Run tag tests ==="
cd "$REPO_ROOT"
bun test packages/lythoskill-curator/src/cli.test.ts --grep "runTag" 2>&1 | tail -10

echo ""
echo "=== Step 3: Agent executes task (IoC handoff) ==="
echo "  cd $REPO_ROOT"
echo "  <spawn subagent>"
echo ""
echo "  Task:"
echo "    1. Read packages/lythoskill-curator/src/cli.ts"
echo "    2. Verify runTag(argv, io?: CuratorIO) signature exists"
echo "    3. Verify runTag uses io.log/io.error/io.exit"
echo "    4. Read packages/lythoskill-curator/src/cli.test.ts"
echo "    5. Verify T1-T4 tests exist:"
echo "       - T1: Tag niche → niches updated in DB"
echo "       - T2: Tag qa signal → niches contains qa: prefix"
echo "       - T3: Skill not found → error + exit(1)"
echo "       - T4: Missing --niche and --qa → error + exit(1)"
echo "    6. Run bun test --grep 'runTag'"
echo "    7. Write decision-log.jsonl to $SCRIPT_DIR/"

echo ""
echo "=== Step 4: Judge ==="
echo "  Criteria: $SCRIPT_DIR/judge.md"
