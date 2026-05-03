#!/usr/bin/env bash
# judge.sh <run-dir>
# Verify that the agent linked the pdf skill correctly.
set -euo pipefail

RUN_DIR="${1:?run-dir required}"
WORK="$RUN_DIR/work"
OUTPUT="$RUN_DIR/OUTPUT.md"
PROBLEM_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

fails=0
fail() { echo "  ✗ $1"; fails=$((fails + 1)); }
ok()   { echo "  ✓ $1"; }

echo "Checking acceptance criteria for deck-link-from-cold-pool:"

# 1. .claude/skills/pdf exists and is a symbolic link
SYMLINK="$WORK/.claude/skills/pdf"
if [[ -L "$SYMLINK" ]]; then
  ok ".claude/skills/pdf is a symbolic link"

  # Resolve target by `cd`-ing through it (portable, no realpath/greadlink)
  RESOLVED="$(cd "$SYMLINK" 2>/dev/null && pwd -P || echo "")"

  if [[ -n "$RESOLVED" && -f "$RESOLVED/SKILL.md" ]]; then
    ok "symlink target contains SKILL.md ($RESOLVED)"
  else
    fail "symlink target missing SKILL.md (resolved='$RESOLVED')"
  fi

  if [[ "$RESOLVED" == *"/.demo-cold-pool/"* ]]; then
    ok "symlink resolves into .demo-cold-pool/"
  else
    fail "symlink target is outside .demo-cold-pool/ (resolved='$RESOLVED')"
  fi
else
  fail ".claude/skills/pdf is not a symbolic link (or missing)"
fi

# 2. OUTPUT.md exists and non-empty
if [[ -s "$OUTPUT" ]]; then
  ok "OUTPUT.md exists and is non-empty"
else
  fail "OUTPUT.md missing or empty"
fi

# 3. skill-deck.toml unchanged
SEED_HASH="$(shasum "$PROBLEM_DIR/seed/skill-deck.toml" | awk '{print $1}')"
WORK_HASH="$(shasum "$WORK/skill-deck.toml" 2>/dev/null | awk '{print $1}' || echo "")"
if [[ -n "$WORK_HASH" && "$SEED_HASH" == "$WORK_HASH" ]]; then
  ok "skill-deck.toml unchanged"
else
  fail "skill-deck.toml was modified or missing"
fi

echo
if [[ $fails -eq 0 ]]; then
  echo "All checks passed."
  exit 0
else
  echo "$fails check(s) failed."
  exit 1
fi
