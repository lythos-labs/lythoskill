#!/usr/bin/env bash
set -euo pipefail

# Graduation Exam — reproduce the full lythoskill pipeline
# Original run: 2026-05-07, arena v0.9.x
# This script uses the latest arena version

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_DIR="$SCRIPT_DIR/run-$(date +%Y%m%d-%H%M%S)"

echo "🎓 Graduation Exam — Arena Pipeline Verification"
echo "   Deck: examples/decks/recipe-report.toml"
echo "   Output: $OUTPUT_DIR"
echo ""

# Fetch the recipe-report deck
DECK_URL="https://raw.githubusercontent.com/lythos-labs/lythoskill/refs/heads/main/examples/decks/recipe-report.toml"
DECK_FILE="$SCRIPT_DIR/skill-deck.toml"

if [ ! -f "$DECK_FILE" ]; then
  echo "📥 Fetching deck..."
  curl -fsSL "$DECK_URL" > "$DECK_FILE"
fi

# Link the deck to working set
echo "🔗 Linking deck..."
bunx @lythos/skill-deck@latest link --deck "$DECK_FILE" --workdir "$SCRIPT_DIR"

# Run arena single with the graduation exam brief
echo ""
echo "🏟️  Running arena single..."
BRIEF=$(cat "$(git rev-parse --show-toplevel 2>/dev/null || echo "$HOME")/Downloads/lythoskill-main/examples/graduation-exam.md" 2>/dev/null || cat "$SCRIPT_DIR/../../examples/graduation-exam.md" 2>/dev/null || echo "Produce a professional .docx cookie recipe report with an embedded 5-dimension radar chart (Taste, Nutrition, Difficulty, Time, Cost). Include ingredient ratios with Baker's Percentages and scientific explanations.")

bunx @lythos/skill-arena@latest single \
  --brief "$BRIEF" \
  --deck "$DECK_FILE" \
  --timeout 180000 \
  --out "$OUTPUT_DIR"

echo ""
echo "✅ Done. Output: $OUTPUT_DIR"
