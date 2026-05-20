#!/bin/bash
# Head Skill Self-Claim Verification — Experiment 1: anthropic/pdf
# Target: github.com/anthropics/skills/skills/pdf
# Self-claim: "Use this skill whenever the user wants to do anything with PDF files...
#   reading or extracting text/tables from PDFs..."
# ═══════════════════════════════════════════════════════════════════════════
# AGENT-ONLY REPLAY — human execution is intentionally incomplete.
# Pattern: Shell stdout as Agent Prompt Injection
# ═══════════════════════════════════════════════════════════════════════════
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKDIR=$(mktemp -d)

echo "=== Step 1: Prepare workdir ==="
cp "$SCRIPT_DIR/test-table.pdf" "$WORKDIR/"
cp "$SCRIPT_DIR/SKILL.md" "$WORKDIR/skill.md"
echo "  WORKDIR: $WORKDIR"
echo "  Input: test-table.pdf (contains a 4x5 sales table)"
echo "  Skill: github.com/anthropics/skills/skills/pdf"
echo ""

echo "=== Step 2: Agent Task (IoC handoff) ==="
echo "  cd $WORKDIR"
echo "  <spawn subagent>"
echo ""
echo "  INSTRUCTIONS:"
echo "  1. Read $WORKDIR/skill.md completely. This is the ONLY skill you have."
echo "  2. The file test-table.pdf contains a sales report table with 3 products"
echo "     (Widget A, Widget B, Widget C) and monthly figures for Jan-Mar 2026."
echo "  3. Extract the table data and save it as $WORKDIR/output.csv"
echo "  4. You MUST follow the skill's guidance on which tool/library to use."
echo "  5. Do NOT use tools or approaches not mentioned in the skill."
echo "  6. Write a brief $WORKDIR/decision-log.md documenting:"
echo "     - Which approach/library you chose and why"
echo "     - Any difficulties encountered"
echo "     - Whether the skill's guidance was sufficient"
echo ""
echo "=== Step 3: Judge verification (criteria in judge.md) ==="
echo "  After agent completes, verify against $SCRIPT_DIR/../judge.md"
echo "  Write judge-verdict.json to $WORKDIR"
echo ""
echo "=== Done ==="
