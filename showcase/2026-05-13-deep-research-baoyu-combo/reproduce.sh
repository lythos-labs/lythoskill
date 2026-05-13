#!/usr/bin/env bash
set -euo pipefail

# T5: Deep Research × Baoyu Combo — Arena Single Demo Reproduction
# https://github.com/lythos-labs/lythoskill

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DECK="$SCRIPT_DIR/skill-deck.toml"
BRIEF="$SCRIPT_DIR/brief.md"

if ! command -v bunx >/dev/null 2>&1; then
  echo "Error: bunx not found. Install Bun first: https://bun.sh"
  exit 1
fi

if [[ ! -f "$DECK" ]]; then
  echo "Error: deck file not found: $DECK"
  exit 1
fi

if [[ ! -f "$BRIEF" ]]; then
  echo "Error: brief file not found: $BRIEF"
  exit 1
fi

echo "=== T5 Arena Single Demo ==="
echo "Deck:  $DECK"
echo "Brief: $BRIEF"
echo ""

bunx @lythos/skill-arena@latest single \
  --deck "$DECK" \
  --brief "$(cat "$BRIEF")"

echo ""
echo "=== Done ==="
echo "Check the run/ directory for output artifacts."
