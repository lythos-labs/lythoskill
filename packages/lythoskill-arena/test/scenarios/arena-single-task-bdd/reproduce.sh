#!/bin/bash
# BDD: Arena single-task smoke test — reproduce.sh IoC pattern
# Migrated from: arena-single-task.agent.md
# Date: 2026-05-18
# Package: lythoskill-arena
#
# Self-bootstrapping: arena tests its own ability to spawn a subagent
# that creates greet.ts + greet.test.ts + runs bun test.
# ═══════════════════════════════════════════════════════════════════════════
set -e

TEST_DIR="/tmp/arena-single-bdd-$(date +%Y%m%d-%H%M%S)"
WORKDIR="$TEST_DIR/work"

echo "=== Step 1: Create test environment ==="
mkdir -p "$WORKDIR"

echo "=== Step 2: No deck needed — minimal arena single task ==="
echo "  Workdir ready: $WORKDIR"

echo ""
echo "=== Step 3: Agent executes task (IoC handoff) ==="
echo "  cd $WORKDIR"
echo "  <spawn subagent>"
echo ""
echo "  IoContract: all commands idempotent. Exit 0 = success."
echo ""
echo "  Task:"
echo "    1. Create greet.ts exporting greet(name: string): string"
echo '       → returns `Hello, ${name}!`'
echo "    2. Create greet.test.ts with 2 bun:test cases:"
echo "       - greet('World') → 'Hello, World!'"
echo "       - greet('') → 'Hello, !'"
echo "    3. Run 'bun test' and write pass/fail summary to result.txt"
echo "    4. MANDATORY: write decision-log.jsonl to CWD"
echo "       Each line: {\"step\":\"...\",\"decision\":\"...\",\"reason\":\"...\",\"ts\":\"...\"}"

echo ""
echo "=== Step 4: Judge verification (criteria in judge.md) ==="
echo "  Verify against $(dirname "$0")/judge.md"
echo "  Write judge-verdict.json to $WORKDIR"

echo ""
echo "=== Done ==="
echo "  Agent output: $WORKDIR"
echo "  Judge criteria: $(dirname "$0")/judge.md"
