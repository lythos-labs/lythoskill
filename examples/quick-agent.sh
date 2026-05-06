#!/usr/bin/env bash
# quick-agent.sh — zero-setup agent execution
#
# Usage:
#   bash quick-agent.sh documents "Polish this article"
#   bash quick-agent.sh engineering "Write a PRD for user auth"
#   bash quick-agent.sh governance "Audit my skill-deck.toml"
#
# Curl (no clone needed):
#   curl -fsSL https://raw.githubusercontent.com/lythos-labs/lythoskill/main/examples/quick-agent.sh | bash -s -- documents "Polish this article"
#
# Prerequisites: bun, kimi (uv tool install kimi-cli && kimi login)
set -euo pipefail

DECK_NAME="${1:-}"
PROMPT="${2:-}"
OUT_DIR="${3:-./agent-output}"

if [ -z "$DECK_NAME" ] || [ -z "$PROMPT" ]; then
  echo "Usage: quick-agent.sh <deck> <prompt> [out-dir]"
  echo ""
  echo "Built-in decks:"
  echo "  documents   — PDF, DOCX, web-search"
  echo "  engineering — TDD, PRD, diagrams"
  echo "  governance  — deck, cortex, scribe, onboarding"
  echo "  full-stack  — React, composition, TDD, diagrams"
  echo ""
  echo "Examples:"
  echo "  bash quick-agent.sh documents 'Polish this article'"
  echo "  bash quick-agent.sh engineering 'Write a PRD for user auth'"
  exit 1
fi

TMPDIR="$(mktemp -d)"
trap "rm -rf $TMPDIR" EXIT

# ── Generate deck.toml on the fly ──────────────────────────────
case "$DECK_NAME" in
  documents)
    cat > "$TMPDIR/deck.toml" << 'TOML'
[deck]
max_cards = 10

[tool.skills.pdf]
path = "github.com/anthropics/skills/skills/pdf"

[tool.skills.docx]
path = "github.com/anthropics/skills/skills/docx"

[tool.skills.web-search]
path = "localhost/web-search"
TOML
    ;;
  engineering)
    cat > "$TMPDIR/deck.toml" << 'TOML'
[deck]
max_cards = 10

[tool.skills.tdd]
path = "github.com/mattpocock/skills/skills/engineering/tdd"

[tool.skills.to-prd]
path = "github.com/mattpocock/skills/skills/engineering/to-prd"

[tool.skills.design-doc-mermaid]
path = "github.com/SpillwaveSolutions/design-doc-mermaid"
TOML
    ;;
  governance)
    cat > "$TMPDIR/deck.toml" << 'TOML'
[deck]
max_cards = 10

[innate.skills.lythoskill-deck]
path = "github.com/lythos-labs/lythoskill/skills/lythoskill-deck"

[innate.skills.project-cortex]
path = "github.com/lythos-labs/lythoskill/skills/lythoskill-project-cortex"

[innate.skills.project-onboarding]
path = "github.com/lythos-labs/lythoskill/skills/lythoskill-project-onboarding"

[innate.skills.project-scribe]
path = "github.com/lythos-labs/lythoskill/skills/lythoskill-project-scribe"
TOML
    ;;
  full-stack)
    cat > "$TMPDIR/deck.toml" << 'TOML'
[deck]
max_cards = 15

[tool.skills.react]
path = "github.com/vercel-labs/agent-skills/skills/react-best-practices"

[tool.skills.composition]
path = "github.com/vercel-labs/agent-skills/skills/composition-patterns"

[tool.skills.tdd]
path = "github.com/mattpocock/skills/skills/engineering/tdd"

[tool.skills.pdf]
path = "github.com/anthropics/skills/skills/pdf"

[tool.skills.design-doc-mermaid]
path = "github.com/SpillwaveSolutions/design-doc-mermaid"
TOML
    ;;
  *)
    echo "❌ Unknown deck: $DECK_NAME"
    echo "   Available: documents, engineering, governance, full-stack"
    exit 1
    ;;
esac

echo "🚀 quick-agent: $DECK_NAME × '$PROMPT'"
echo "📁 Output: $OUT_DIR"

mkdir -p "$OUT_DIR"

# ── Run agent ───────────────────────────────────────────────────
bunx @lythos/skill-arena@0.9.19 agent-run \
  --brief "$PROMPT" \
  --deck "$TMPDIR/deck.toml" \
  --out "$OUT_DIR"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Done. Files in $OUT_DIR:"
ls -la "$OUT_DIR/"
