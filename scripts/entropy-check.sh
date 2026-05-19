#!/bin/sh
# entropy-check.sh — Weekly governance debt scan
#
# Usage: bash scripts/entropy-check.sh [--force]
#   --force   Skip day-interval gate, always run full scan
#
# Exit codes:
#   0  — always (non-blocking by default)
#
# This script is called by .husky/pre-push. It writes a timestamp to
# .last-entropy-check to survive across sessions. The timestamp file
# is gitignored — it is local state only.
#
# Design: tips as prompt navigation. The script surfaces debt; the agent
# decides action. Never auto-fix. Use --strict for CI blocking mode.

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CHECKPOINT_FILE="$PROJECT_DIR/.last-entropy-check"
FORCE=false
STRICT=false
DAY_SECONDS=86400
WEEK_SECONDS=604800

# Parse args
for arg in "$@"; do
  case "$arg" in
    --force) FORCE=true ;;
    --strict) STRICT=true ;;
  esac
done

# ── Day-interval gate ──────────────────────────────────────────
# If checkpoint exists and is < 7 days old, skip silently.
if [ "$FORCE" != true ] && [ -f "$CHECKPOINT_FILE" ]; then
  LAST_CHECK=$(cat "$CHECKPOINT_FILE")
  NOW=$(date +%s)
  ELAPSED=$((NOW - LAST_CHECK))
  if [ "$ELAPSED" -lt "$WEEK_SECONDS" ]; then
    DAYS=$((ELAPSED / DAY_SECONDS))
    echo "🔒 Entropy check skipped ($DAYS days since last scan). Use --force to override."
    exit 0
  fi
fi

# ── Header ─────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  🔍  Entropy Check — Governance Debt Scan"
echo "═══════════════════════════════════════════════════════════════"
echo ""

ISSUES=0
WARNINGS=0

# ── 1. Cortex probe ────────────────────────────────────────────
echo "[1/5] Cortex probe..."
if [ -f "$PROJECT_DIR/packages/lythoskill-project-cortex/src/cli.ts" ]; then
  PROBE_OUT=$(bun "$PROJECT_DIR/packages/lythoskill-project-cortex/src/cli.ts" probe 2>&1) || true
  # Extract only warnings and empty shells
  PROBE_WARNINGS=$(echo "$PROBE_OUT" | grep -E "^\s*⚠️" || true)
  PROBE_EMPTY=$(echo "$PROBE_OUT" | grep -E "^\s*📭 Empty shells" || true)
  if [ -n "$PROBE_WARNINGS" ]; then
    echo "$PROBE_WARNINGS"
    ISSUES=$((ISSUES + 1))
  fi
  if [ -n "$PROBE_EMPTY" ]; then
    echo "$PROBE_EMPTY"
    WARNINGS=$((WARNINGS + 1))
  fi
  if [ -z "$PROBE_WARNINGS" ] && [ -z "$PROBE_EMPTY" ]; then
    echo "  ✅ Cortex clean"
  fi
else
  echo "  ⚠️  Cortex CLI not found — skipping probe"
fi

# ── 2. Symlinks in skills/ ─────────────────────────────────────
echo ""
echo "[2/5] Checking skills/ for symlinks..."
SYMLINKS=$(find "$PROJECT_DIR/skills/" -maxdepth 1 -type l 2>/dev/null || true)
if [ -n "$SYMLINKS" ]; then
  echo "  ❌ Symlinks found in skills/ (build output pollution):"
  echo "$SYMLINKS" | while read link; do
    echo "    - $(basename "$link")"
  done
  ISSUES=$((ISSUES + 1))
else
  echo "  ✅ No symlinks in skills/"
fi

# ── 3. Working set directories in git ──────────────────────────
echo ""
echo "[3/5] Checking for committed working set directories..."
WS_LEAKS=$(git ls-files "$PROJECT_DIR/.agents/skills/" "$PROJECT_DIR/.claude/skills/" "$PROJECT_DIR/.kimi/skills/" "$PROJECT_DIR/.cursor/skills/" 2>/dev/null | head -5 || true)
if [ -n "$WS_LEAKS" ]; then
  echo "  ❌ Working set files tracked by git (should be gitignored):"
  echo "$WS_LEAKS" | while read f; do
    echo "    - $f"
  done
  ISSUES=$((ISSUES + 1))
else
  echo "  ✅ No working set leaks in git"
fi

# ── 4. Env var prefix consistency ──────────────────────────────
echo ""
echo "[4/5] Checking env var prefix consistency..."
# Look for LYTHOSKILL_ (legacy prefix) in source (excluding mirror.ts which has compat)
LEGACY_VARS=$(grep -rn 'LYTHOSKILL_' --include='*.ts' "$PROJECT_DIR/packages/" 2>/dev/null | grep -v 'mirror.ts' | grep -v 'mirror.test.ts' | head -5 || true)
if [ -n "$LEGACY_VARS" ]; then
  echo "  ❌ Legacy LYTHOSKILL_ prefix found outside mirror compat code:"
  echo "$LEGACY_VARS" | while read line; do
    echo "    $line"
  done
  ISSUES=$((ISSUES + 1))
else
  echo "  ✅ No legacy prefix leaks"
fi

# ── 5. Missing weekly ──────────────────────────────────────────
echo ""
echo "[5/5] Checking for missing weekly..."
CURRENT_WEEK=$(date +%V)
CURRENT_YEAR=$(date +%Y)
WEEKLY_FILE="$PROJECT_DIR/weekly/${CURRENT_YEAR}-W${CURRENT_WEEK}.md"
if [ ! -f "$WEEKLY_FILE" ]; then
  echo "  ⚠️  No weekly for current week (W${CURRENT_WEEK}): $WEEKLY_FILE"
  echo "     Run weekly scribe or reconstruct from daily + git + cortex."
  WARNINGS=$((WARNINGS + 1))
else
  echo "  ✅ Weekly exists: ${CURRENT_YEAR}-W${CURRENT_WEEK}.md"
fi

# ── Summary ────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════════"
if [ "$ISSUES" -gt 0 ]; then
  echo "  ❌  Entropy check FAILED — $ISSUES issue(s), $WARNINGS warning(s)"
  echo "═══════════════════════════════════════════════════════════════"
  echo ""
  echo "  Fix the issues above, then re-run:"
  echo "    bash scripts/entropy-check.sh --force"
  echo ""
  # Write checkpoint even on failure (so next check is 7 days later, not spam)
  date +%s > "$CHECKPOINT_FILE"
  exit 1
elif [ "$WARNINGS" -gt 0 ]; then
  echo "  ⚠️  Entropy check PASSED with $WARNINGS warning(s)"
  echo "═══════════════════════════════════════════════════════════════"
  echo ""
  date +%s > "$CHECKPOINT_FILE"
  exit 0
else
  echo "  ✅  Entropy check PASSED — governance debt low"
  echo "═══════════════════════════════════════════════════════════════"
  echo ""
  date +%s > "$CHECKPOINT_FILE"
  exit 0
fi
