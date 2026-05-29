#!/usr/bin/env bash
# ── Deck Symlink/Snapshot reproduce.sh ───────────────────────────────────
# Purpose: Verify to-symlink / to-snapshot mode switching end-to-end.
#
# Sampling strategy: Clone a real skill repo into TMPDIR test-cold-pool.
# This preserves "tar" semantics — the test samples from real repos and
# creates an isolated, reproducible, updatable snapshot.
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
echo "🔄 Deck Symlink/Snapshot reproduce.sh"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── Step 1: Sample a real skill repo into test cold pool ─────────────────
echo ""
echo "📦 Step 1: Sample real skill repo into test cold pool"

COLD="$TMPDIR/test-cold-pool"
mkdir -p "$COLD"

# Clone a real repo (shallow, fast) — this is the "tar" sampling
# Using lythoskill's own repo as a known-good sample
SAMPLE_REPO="github.com/lythos-labs/lythoskill"
git clone --depth=1 "https://$SAMPLE_REPO.git" "$COLD/$SAMPLE_REPO" >/dev/null 2>&1

if [ -d "$COLD/$SAMPLE_REPO/.git" ]; then
  pass "Sampled real repo: $SAMPLE_REPO"
else
  fail "Failed to clone sample repo"
fi

# ── Step 2: Create project with skill-deck.toml ──────────────────────────
echo ""
echo "📝 Step 2: Create skill-deck.toml"

PROJECT="$TMPDIR/project"
mkdir -p "$PROJECT/.claude/skills"

cat > "$PROJECT/skill-deck.toml" << DECKEOF
[deck]
max_cards = 5
cold_pool = "./test-cold-pool"
working_set = ".claude/skills"

[tool.skills.lythoskill-deck]
path = "$SAMPLE_REPO/skills/lythoskill-deck"
DECKEOF

# Symlink cold-pool into project so relative path resolves
ln -s "$COLD" "$PROJECT/test-cold-pool"

pass "skill-deck.toml created"

# ── Step 3: Link to establish working set (symlink mode) ─────────────────
echo ""
echo "🔗 Step 3: deck link — establish working set"

(cd "$PROJECT" && bun "$DECK_CLI" link) >/dev/null 2>&1

WS_SKILL="$PROJECT/.claude/skills/lythoskill-deck"

if [ -L "$WS_SKILL" ]; then
  pass "lythoskill-deck is a symlink (default mode)"
else
  fail "lythoskill-deck is not a symlink after link"
fi

# ── Step 4: Verify lock file records symlink mode ────────────────────────
echo ""
echo "🔒 Step 4: Verify lock file mode = symlink"

LOCK="$PROJECT/skill-deck.lock"
if [ -f "$LOCK" ]; then
  if grep -q '"mode": "symlink"' "$LOCK"; then
    pass "Lock file records symlink mode"
  else
    fail "Lock file missing symlink mode"
  fi
else
  fail "skill-deck.lock missing"
fi

# ── Step 5: Switch to snapshot mode ──────────────────────────────────────
echo ""
echo "🧊 Step 5: deck to-snapshot — convert to real directory"

(cd "$PROJECT" && bun "$DECK_CLI" to-snapshot lythoskill-deck) >/dev/null 2>&1

if [ -d "$WS_SKILL" ] && [ ! -L "$WS_SKILL" ]; then
  pass "lythoskill-deck is now a real directory (snapshot)"
else
  fail "lythoskill-deck is still a symlink after to-snapshot"
fi

# Verify content preserved
if [ -f "$WS_SKILL/SKILL.md" ]; then
  pass "SKILL.md content preserved in snapshot"
else
  fail "SKILL.md missing from snapshot"
fi

# Verify lock updated
if grep -q '"mode": "snapshot"' "$LOCK"; then
  pass "Lock file updated to snapshot mode"
else
  fail "Lock file still shows symlink mode"
fi

# ── Step 6: Idempotency — to-snapshot again is no-op ─────────────────────
echo ""
echo "⏭️  Step 6: Idempotency — to-snapshot again"

SNAP_OUTPUT=$(cd "$PROJECT" && bun "$DECK_CLI" to-snapshot lythoskill-deck 2>&1 || true)

if echo "$SNAP_OUTPUT" | grep -qi "already"; then
  pass "Second to-snapshot reports no-op"
else
  fail "Second to-snapshot did not report no-op"
fi

# ── Step 7: Switch back to symlink mode ──────────────────────────────────
echo ""
echo "🔗 Step 7: deck to-symlink — convert back to symlink"

(cd "$PROJECT" && bun "$DECK_CLI" to-symlink lythoskill-deck) >/dev/null 2>&1

if [ -L "$WS_SKILL" ]; then
  pass "lythoskill-deck is a symlink again"
else
  fail "lythoskill-deck is not a symlink after to-symlink"
fi

# Verify lock updated back
if grep -q '"mode": "symlink"' "$LOCK"; then
  pass "Lock file updated back to symlink mode"
else
  fail "Lock file still shows snapshot mode"
fi

# ── Step 8: Idempotency — to-symlink again is no-op ──────────────────────
echo ""
echo "⏭️  Step 8: Idempotency — to-symlink again"

LINK_OUTPUT=$(cd "$PROJECT" && bun "$DECK_CLI" to-symlink lythoskill-deck 2>&1 || true)

if echo "$LINK_OUTPUT" | grep -qi "already"; then
  pass "Second to-symlink reports no-op"
else
  fail "Second to-symlink did not report no-op"
fi

# ── Step 9: Verify symlink points to cold pool ───────────────────────────
echo ""
echo "🎯 Step 9: Verify symlink target"

LINK_TARGET=$(readlink "$WS_SKILL" || echo "")
if echo "$LINK_TARGET" | grep -q "$SAMPLE_REPO"; then
  pass "Symlink points to cold pool source"
else
  fail "Symlink target unexpected: $LINK_TARGET"
fi

# ── Step 10: deck link preserves mode ────────────────────────────────────
echo ""
echo "🔄 Step 10: deck link — should preserve current mode"

(cd "$PROJECT" && bun "$DECK_CLI" link) >/dev/null 2>&1

if [ -L "$WS_SKILL" ]; then
  pass "deck link preserves symlink mode"
else
  fail "deck link changed mode unexpectedly"
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
