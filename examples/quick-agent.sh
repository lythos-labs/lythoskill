#!/usr/bin/env bash
# quick-agent.sh — fetch deck + prompt → agent output. Curl pipeline style.
#
# Usage:
#   bash quick-agent.sh documents "Polish this article"
#   bash quick-agent.sh https://example.com/my-deck.toml "Write a PRD"
#   bash quick-agent.sh ./local-deck.toml "Audit my config"
#
# Curl (zero local files):
#   curl -fsSL https://raw.githubusercontent.com/lythos-labs/lythoskill/refs/heads/main/examples/quick-agent.sh | bash -s -- documents "Polish this article"
#
# Prerequisites: bun, kimi (uv tool install kimi-cli && kimi login)
set -euo pipefail

DECK_SPEC="${1:-}"
PROMPT="${2:-}"
OUT_DIR="${3:-./agent-output-$(date +%Y%m%d-%H%M%S)}"
# ── Player detection: explicit env > auto-detect > error ──────
if [ -n "${LYTHOS_PLAYER:-}" ]; then
  PLAYER="$LYTHOS_PLAYER"
  if ! command -v "$PLAYER" &>/dev/null; then
    echo "⚠️  LYTHOS_PLAYER=$PLAYER set but binary not found in PATH"
  fi
elif command -v kimi &>/dev/null; then
  PLAYER="kimi"
elif command -v deepseek &>/dev/null; then
  PLAYER="deepseek"
  echo "⚠️  Using deepseek: -p mode is text-only (no file/shell tools). Set LYTHOS_PLAYER=kimi if you have it."
elif command -v claude &>/dev/null; then
  PLAYER="claude"
  echo "⚠️  Using claude: -p mode may hang on tool-heavy tasks. Set LYTHOS_PLAYER=kimi for best results."
else
  echo "❌ No agent player found in PATH."
  echo "   Install one: uv tool install kimi-cli && kimi login"
  echo "   Or set LYTHOS_PLAYER to a custom agent binary."
  exit 1
fi

if [ -z "$DECK_SPEC" ] || [ -z "$PROMPT" ] || [ -z "$(echo "$PROMPT" | xargs)" ]; then
  echo "❌ Missing arguments."
  echo "Usage: quick-agent.sh <deck> <prompt> [out-dir]"
  echo "  deck:  documents | design-studio | visual-explainer | engineering | governance | full-stack | URL | path.toml"
  echo "  prompt: your task description (wrap in quotes)"
  echo "  Agent: set LYTHOS_PLAYER env (kimi|deepseek|claude), auto-detected: $PLAYER"
  echo ""
  echo "Received: deck='$DECK_SPEC' prompt='$PROMPT'"
  exit 1
fi

TMPDIR="$(mktemp -d)"
trap "rm -rf $TMPDIR" EXIT

# ── Resolve deck: URL, built-in name, or local path ──────────
DECK_RAW="https://raw.githubusercontent.com/lythos-labs/lythoskill/refs/heads/main/examples/decks"

case "$DECK_SPEC" in
  https://*|http://*)
    # Auto-convert github.com/blob/... → raw.githubusercontent.com/...
    FETCH_URL="$DECK_SPEC"
    if echo "$FETCH_URL" | grep -q 'github\.com/.*/blob/'; then
      FETCH_URL=$(echo "$FETCH_URL" | sed 's|github\.com/|raw.githubusercontent.com/|; s|/blob/|/|')
    fi
    echo "📥 Fetching deck: $FETCH_URL"
    HTTP_CODE=$(curl -sSL --connect-timeout 10 --max-time 30 -w "%{http_code}" -o "$TMPDIR/deck.toml" "$FETCH_URL")
    if [ "$HTTP_CODE" != "200" ]; then
      echo "❌ Deck fetch failed (HTTP $HTTP_CODE): $FETCH_URL"
      exit 1
    fi
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
    HTTP_CODE=$(curl -sSL --connect-timeout 10 --max-time 30 -w "%{http_code}" -o "$TMPDIR/deck.toml" "$DECK_RAW/${DECK_SPEC}.toml" 2>/dev/null) || true
    if [ "$HTTP_CODE" = "200" ] && [ -s "$TMPDIR/deck.toml" ]; then
      : # fetched successfully
    else
      # Fallback: GitHub raw unreachable or 404 — use built-in template
      echo "⚠️  GitHub raw unreachable, using built-in template for '$DECK_SPEC'"
      case "$DECK_SPEC" in
        documents)
          cat > "$TMPDIR/deck.toml" << 'TOML'
[deck]
max_cards = 10
[tool.skills.pdf]
path = "github.com/anthropics/skills/skills/pdf"
[tool.skills.docx]
path = "github.com/anthropics/skills/skills/docx"
TOML
          ;;
        engineering)
          cat > "$TMPDIR/deck.toml" << 'TOML'
[deck]
max_cards = 10
[tool.skills.tdd]
path = "github.com/mattpocock/skills/skills/engineering/tdd"
[tool.skills.design-doc-mermaid]
path = "github.com/SpillwaveSolutions/design-doc-mermaid"
TOML
          ;;
        design-studio)
          cat > "$TMPDIR/deck.toml" << 'TOML'
[deck]
max_cards = 10
[tool.skills.frontend-design]
path = "github.com/anthropics/skills/skills/frontend-design"
[tool.skills.theme-factory]
path = "github.com/anthropics/skills/skills/theme-factory"
[tool.skills.brand-guidelines]
path = "github.com/anthropics/skills/skills/brand-guidelines"
TOML
          ;;
        visual-explainer)
          cat > "$TMPDIR/deck.toml" << 'TOML'
[deck]
max_cards = 10
[tool.skills.design-doc-mermaid]
path = "github.com/SpillwaveSolutions/design-doc-mermaid"
[tool.skills.theme-factory]
path = "github.com/anthropics/skills/skills/theme-factory"
TOML
          ;;
        scout)
          cat > "$TMPDIR/deck.toml" << 'TOML'
[deck]
max_cards = 10
# Scout — intentionally thin. Agent uses built-in web access to investigate.
TOML
          ;;
        *)
          echo "❌ Unknown deck: $DECK_SPEC and no fallback template"
          exit 1
          ;;
      esac
    fi
    ;;
esac

echo "🚀 quick-agent: $PROMPT"
echo "📁 Output: $OUT_DIR"

mkdir -p "$OUT_DIR"

# ── Run agent: deck + prompt → execute + judge ───────────────
bunx --prefer-offline @lythos/skill-arena@0.9.22 agent-run \
  --brief "$PROMPT" \
  --deck "$TMPDIR/deck.toml" \
  --out "$OUT_DIR" \
  --player "$PLAYER"

# ── Self-check: deck link + skill visibility ──────────────────
if [ "${LYTHOS_SELFCHECK:-1}" != "0" ]; then
  echo ""
  echo "🔍 Self-check: deck link + skill visibility..."
  SELFCHECK_DIR="$OUT_DIR/self-check"
  mkdir -p "$SELFCHECK_DIR"

  bunx --prefer-offline @lythos/skill-arena@0.9.22 agent-run \
    --brief "1. List the contents of .claude/skills/ directory (run ls -la or equivalent). 2. Report: how many skills are visible, their names, and whether they are symlinks. 3. If .claude/skills/ is empty or missing, state this clearly." \
    --deck "$TMPDIR/deck.toml" \
    --out "$SELFCHECK_DIR" \
    --player "$PLAYER" || echo "⚠️  Self-check had issues (see $SELFCHECK_DIR/)"

  if [ -f "$SELFCHECK_DIR/agent-stdout.txt" ]; then
    echo ""
    echo "📋 Skill visibility report:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    head -30 "$SELFCHECK_DIR/agent-stdout.txt"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Done. Files in $OUT_DIR:"
ls -la "$OUT_DIR/"
