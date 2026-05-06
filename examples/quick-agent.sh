#!/usr/bin/env bash
# quick-agent.sh — fetch deck + prompt → agent output. Curl pipeline style.
#
# Usage:
#   bash quick-agent.sh documents "Polish this article"
#   bash quick-agent.sh https://example.com/my-deck.toml "Write a PRD"
#   bash quick-agent.sh ./local-deck.toml "Audit my config"
#
# Curl (zero local files):
#   curl -fsSL https://raw.githubusercontent.com/lythos-labs/lythoskill/main/examples/quick-agent.sh | bash -s -- documents "Polish this article"
#
# Prerequisites: bun, kimi (uv tool install kimi-cli && kimi login)
set -euo pipefail

DECK_SPEC="${1:-}"
PROMPT="${2:-}"
OUT_DIR="${3:-./agent-output}"

if [ -z "$DECK_SPEC" ] || [ -z "$PROMPT" ]; then
  echo "Usage: quick-agent.sh <deck> <prompt> [out-dir]"
  echo ""
  echo "<deck> can be:"
  echo "  documents   — built-in: PDF, DOCX, web-search"
  echo "  engineering — built-in: TDD, PRD, diagrams"
  echo "  governance  — built-in: deck, cortex, scribe, onboarding"
  echo "  full-stack  — built-in: React, composition, TDD, diagrams"
  echo "  https://... — raw deck URL (GitHub raw, gist, etc.)"
  echo "  ./path.toml — local deck file"
  exit 1
fi

TMPDIR="$(mktemp -d)"
trap "rm -rf $TMPDIR" EXIT

# ── Resolve deck: URL, built-in name, or local path ──────────
DECK_RAW="https://raw.githubusercontent.com/lythos-labs/lythoskill/main/examples/decks"

case "$DECK_SPEC" in
  https://*|http://*)
    echo "📥 Fetching deck: $DECK_SPEC"
    curl -fsSL "$DECK_SPEC" -o "$TMPDIR/deck.toml"
    ;;
  ./*|/*|*.toml)
    if [ -f "$DECK_SPEC" ]; then
      cp "$DECK_SPEC" "$TMPDIR/deck.toml"
      echo "📋 Local deck: $DECK_SPEC"
    else
      echo "❌ Deck file not found: $DECK_SPEC"
      exit 1
    fi
    ;;
  *)
    echo "📥 Fetching deck: $DECK_RAW/${DECK_SPEC}.toml"
    curl -fsSL "$DECK_RAW/${DECK_SPEC}.toml" -o "$TMPDIR/deck.toml" || {
      echo "❌ Unknown deck: $DECK_SPEC"
      echo "   Available: documents, engineering, governance, full-stack"
      echo "   Or pass a URL: https://raw.githubusercontent.com/..."
      exit 1
    }
    ;;
esac

echo "🚀 quick-agent: $PROMPT"
echo "📁 Output: $OUT_DIR"

mkdir -p "$OUT_DIR"

# ── Run agent: deck + prompt → execute + judge ───────────────
bunx @lythos/skill-arena@0.9.20 agent-run \
  --brief "$PROMPT" \
  --deck "$TMPDIR/deck.toml" \
  --out "$OUT_DIR"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Done. Files in $OUT_DIR:"
ls -la "$OUT_DIR/"
