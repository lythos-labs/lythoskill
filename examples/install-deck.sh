#!/usr/bin/env bash
set -e

DECKS_URL="https://raw.githubusercontent.com/lythos-labs/lythoskill/main/examples/decks"

if [ -f "skill-deck.toml" ]; then
  echo "⚠️  skill-deck.toml already exists. Move or delete it first."
  exit 1
fi

DECK=${1:-documents}

case "$DECK" in
  documents|engineering|full-stack|governance) ;;
  *)
    echo "Unknown deck: $DECK"
    echo "Available: documents, engineering, full-stack, governance"
    exit 1
    ;;
esac

echo "📥 Downloading $DECK deck..."
curl -fsSL "$DECKS_URL/$DECK.toml" > skill-deck.toml

echo "🔗 Linking skills..."
bunx @lythos/skill-deck link

echo ""
echo "✅ Done. Active skills in .claude/skills/:"
ls -1 .claude/skills/ 2>/dev/null || echo "  (none yet — add missing skills with: bunx @lythos/skill-deck add <path>)"
