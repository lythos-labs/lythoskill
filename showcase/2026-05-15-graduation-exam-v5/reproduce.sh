#!/usr/bin/env bash
set -euo pipefail

# Graduation Exam v5 — reproduce with prompt-template IoC + white-box observability
# Run: 2026-05-15, arena v0.13.x

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_DIR="$SCRIPT_DIR/run-$(date +%Y%m%d-%H%M%S)"

echo "🎓 Graduation Exam v5 — Arena Pipeline Verification"
echo "   Deck: examples/decks/recipe-report.toml"
echo "   Output: $OUTPUT_DIR"
echo ""

BRIEF="Produce a professional .docx cookie recipe report with an embedded 5-dimension radar chart (Taste, Nutrition, Difficulty, Time, Cost). Include ingredient ratios with Baker's Percentages and scientific explanations."

bunx @lythos/skill-arena@latest single \
  --brief "$BRIEF" \
  --deck "$SCRIPT_DIR/../../examples/decks/recipe-report.toml" \
  --player kimi \
  --timeout 600000 \
  --out "$OUTPUT_DIR"

echo ""
echo "✅ Done. Output: $OUTPUT_DIR"
