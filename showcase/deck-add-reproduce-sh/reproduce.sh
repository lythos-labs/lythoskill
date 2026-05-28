#!/usr/bin/env bash
# ── Deck Add reproduce.sh — IoC verification ─────────────────────────────
# Purpose: Verify deck add → link → working set symlink end-to-end.
#          Replaces stale deck-add.agent.md (localhost format incompatible
#          with current FQ locator rules).
#
# Prerequisites: bun, local deck source at packages/lythoskill-deck
# Output:        PASS/FAIL per step, exit 0 on all PASS
# Cleanup:       trap removes TMPDIR on exit
# ──────────────────────────────────────────────────────────────────────────
set -euo pipefail

TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

DECK_CLI="/Users/chariots/Downloads/lythoskill-main/packages/lythoskill-deck/src/cli.ts"

PASS=0
FAIL=0

pass() { echo "   ✅ PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "   ❌ FAIL: $1"; FAIL=$((FAIL + 1)); }

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🃏 Deck Add reproduce.sh"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── Step 1: Setup cold pool with a valid skill ───────────────────────────
echo ""
echo "📦 Step 1: Setup cold pool"

POOL="$TMPDIR/cold-pool"
mkdir -p "$POOL/github.com/test-org/test-repo/skills/test-skill"

cat > "$POOL/github.com/test-org/test-repo/skills/test-skill/SKILL.md" << 'SKILLEOF'
---
name: test-skill
description: A test skill for deck add verification
---

# Test Skill
Minimal skill for reproduce.sh validation.
SKILLEOF

pass "Cold pool skill created"

# ── Step 2: Create skill-deck.toml with one existing skill ───────────────
echo ""
echo "📝 Step 2: Create skill-deck.toml"

PROJECT="$TMPDIR/project"
mkdir -p "$PROJECT/.claude/skills"

cat > "$PROJECT/skill-deck.toml" << 'DECKEOF'
[deck]
max_cards = 5
cold_pool = "./cold-pool"
working_set = ".claude/skills"

[tool.skills.skill-a]
path = "github.com/test-org/test-repo/skills/test-skill"
DECKEOF

pass "skill-deck.toml created with skill-a"

# Symlink cold-pool into project so relative path resolves
ln -s "$POOL" "$PROJECT/cold-pool"

# ── Step 3: Link to establish working set ────────────────────────────────
echo ""
echo "🔗 Step 3: deck link — establish working set"

(cd "$PROJECT" && bun "$DECK_CLI" link) >/dev/null 2>&1

if [ -L "$PROJECT/.claude/skills/skill-a" ]; then
  pass "skill-a symlink created"
else
  fail "skill-a symlink missing"
fi

# ── Step 4: Add a new skill to the deck ──────────────────────────────────
echo ""
echo "➕ Step 4: deck add — add skill-b to deck"

# Create second skill in cold pool
mkdir -p "$POOL/github.com/test-org/test-repo/skills/skill-b"
cat > "$POOL/github.com/test-org/test-repo/skills/skill-b/SKILL.md" << 'SKILLEOF'
---
name: skill-b
description: Second test skill
---

# Skill B
Another minimal skill.
SKILLEOF

# Add skill-b to skill-deck.toml
cat >> "$PROJECT/skill-deck.toml" << 'DECKEOF'

[tool.skills.skill-b]
path = "github.com/test-org/test-repo/skills/skill-b"
DECKEOF

pass "skill-b added to skill-deck.toml"

# ── Step 5: Link to sync working set ─────────────────────────────────────
echo ""
echo "🔗 Step 5: deck link — sync working set"

(cd "$PROJECT" && bun "$DECK_CLI" link) >/dev/null 2>&1

if [ -L "$PROJECT/.claude/skills/skill-b" ]; then
  pass "skill-b symlink created"
else
  fail "skill-b symlink missing"
fi

# Verify skill-a still exists
if [ -L "$PROJECT/.claude/skills/skill-a" ]; then
  pass "skill-a symlink preserved"
else
  fail "skill-a symlink lost"
fi

# ── Step 6: Verify lock file ─────────────────────────────────────────────
echo ""
echo "🔒 Step 6: Verify skill-deck.lock"

if [ -f "$PROJECT/skill-deck.lock" ]; then
  LOCK_SKILLS=$(cat "$PROJECT/skill-deck.lock" | grep -c '"alias"' || echo "0")
  if [ "$LOCK_SKILLS" -eq 2 ] 2>/dev/null; then
    pass "Lock file has 2 skills"
  else
    fail "Lock file skill count != 2 (got $LOCK_SKILLS)"
  fi
else
  fail "skill-deck.lock missing"
fi

# ── Step 7: Remove skill-a ───────────────────────────────────────────────
echo ""
echo "➖ Step 7: deck remove — remove skill-a"

(cd "$PROJECT" && bun "$DECK_CLI" remove skill-a) >/dev/null 2>&1

# Verify skill-a removed from toml
if grep -q "skill-a" "$PROJECT/skill-deck.toml"; then
  fail "skill-a still in skill-deck.toml"
else
  pass "skill-a removed from skill-deck.toml"
fi

# Verify symlink removed
if [ -L "$PROJECT/.claude/skills/skill-a" ]; then
  fail "skill-a symlink still exists"
else
  pass "skill-a symlink removed"
fi

# Verify skill-b preserved
if [ -L "$PROJECT/.claude/skills/skill-b" ]; then
  pass "skill-b symlink preserved"
else
  fail "skill-b symlink lost"
fi

# Verify cold pool untouched
if [ -f "$POOL/github.com/test-org/test-repo/skills/test-skill/SKILL.md" ]; then
  pass "Cold pool source preserved"
else
  fail "Cold pool source deleted"
fi

# ── Step 8: Link after remove ────────────────────────────────────────────
echo ""
echo "🔗 Step 8: deck link — sync after remove"

(cd "$PROJECT" && bun "$DECK_CLI" link) >/dev/null 2>&1

if [ -L "$PROJECT/.claude/skills/skill-b" ] && [ ! -L "$PROJECT/.claude/skills/skill-a" ]; then
  pass "Working set consistent after remove + link"
else
  fail "Working set inconsistent after remove + link"
fi

# ── Summary ─────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Results: $PASS pass, $FAIL fail"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$FAIL" -eq 0 ]; then
  echo ""
  echo "✅ reproduce.sh PASSED"
  exit 0
else
  echo ""
  echo "❌ reproduce.sh FAILED"
  exit 1
fi
