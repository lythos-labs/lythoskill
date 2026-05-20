#!/bin/bash
# Head Skill Self-Claim Verification — Experiment 2: mattpocock/tdd
# Target: github.com/mattpocock/skills/skills/engineering/tdd
# Self-claim: "Use when user wants to build features or fix bugs using TDD,
#   mentions 'red-green-refactor', wants integration tests..."
# ═══════════════════════════════════════════════════════════════════════════
# AGENT-ONLY REPLAY — human execution is intentionally incomplete.
# Pattern: Shell stdout as Agent Prompt Injection
# ═══════════════════════════════════════════════════════════════════════════
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKDIR=$(mktemp -d)

echo "=== Step 1: Prepare workdir ==="
cp "$SCRIPT_DIR/calculator.js" "$WORKDIR/"
cp "$SCRIPT_DIR/calculator.test.js" "$WORKDIR/"
cp "$SCRIPT_DIR/package.json" "$WORKDIR/"
cp "$SCRIPT_DIR/SKILL.md" "$WORKDIR/skill.md"
echo "  WORKDIR: $WORKDIR"
echo "  Input: calculator.js (has a bug in divide(): uses Math.floor)"
echo "  Input: calculator.test.js (existing tests — one will fail after fix)"
echo "  Skill: github.com/mattpocock/skills/skills/engineering/tdd"
echo ""

echo "=== Step 2: Agent Task (IoC handoff) ==="
echo "  cd $WORKDIR"
echo "  <spawn subagent>"
echo ""
echo "  INSTRUCTIONS:"
echo "  1. Read $WORKDIR/skill.md completely. This is the ONLY skill you have."
echo "  2. Run the existing tests to see current state."
echo "  3. The divide() function has a bug: it uses Math.floor(a / b), which"
echo "     causes integer division. It should perform proper float division."
echo "  4. Use the TDD approach described in the skill to fix this bug."
echo "  5. You MUST demonstrate the red-green-refactor loop."
echo "  6. Write a brief $WORKDIR/decision-log.md documenting:"
echo "     - What test you added/modified (RED phase)"
echo "     - How you fixed the bug (GREEN phase)"
echo "     - Any refactoring you did"
echo "     - Whether the skill's guidance was sufficient for TDD"
echo ""
echo "=== Step 3: Judge verification (criteria in judge.md) ==="
echo "  After agent completes, verify against $SCRIPT_DIR/../judge.md"
echo "  Write judge-verdict.json to $WORKDIR"
echo ""
echo "=== Done ==="
