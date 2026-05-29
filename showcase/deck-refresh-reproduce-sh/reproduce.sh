#!/usr/bin/env bash
# ── Deck Refresh reproduce.sh ────────────────────────────────────────────
# Purpose: Validate deck refresh plan-only + exec end-to-end.
# Isolation: cold_pool points to TMPDIR/test-cold-pool — never touches
#            ~/.agents/skill-repos.
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
echo "🔄 Deck Refresh reproduce.sh"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── Step 1: Setup mock remote repo with 2 skills ─────────────────────────
echo ""
echo "📦 Step 1: Setup mock remote repo"

REMOTE="$TMPDIR/remote"
mkdir -p "$REMOTE/skills/skill-a" "$REMOTE/skills/skill-b"

cat > "$REMOTE/skills/skill-a/SKILL.md" << 'SKILLEOF'
---
name: skill-a
description: Test skill A
---

# Skill A
Initial version.
SKILLEOF

cat > "$REMOTE/skills/skill-b/SKILL.md" << 'SKILLEOF'
---
name: skill-b
description: Test skill B
---

# Skill B
Initial version.
SKILLEOF

cd "$REMOTE"
git init
git config user.name "test"
git config user.email "test@test.com"
git add .
git commit -m "initial"

pass "Remote repo created with 2 skills"

# ── Step 2: Clone to cold pool (simulating user's cold pool) ─────────────
echo ""
echo "📥 Step 2: Clone to test cold pool"

COLD="$TMPDIR/test-cold-pool"
git clone "$REMOTE" "$COLD/github.com/test-org/test-repo" >/dev/null 2>&1

pass "Cold pool cloned"

# ── Step 3: Create project with skill-deck.toml ──────────────────────────
echo ""
echo "📝 Step 3: Create skill-deck.toml"

PROJECT="$TMPDIR/project"
mkdir -p "$PROJECT/.claude/skills"

cat > "$PROJECT/skill-deck.toml" << 'DECKEOF'
[deck]
max_cards = 5
cold_pool = "./test-cold-pool"
working_set = ".claude/skills"

[tool.skills.skill-a]
path = "github.com/test-org/test-repo/skills/skill-a"

[tool.skills.skill-b]
path = "github.com/test-org/test-repo/skills/skill-b"
DECKEOF

# Symlink cold-pool into project so relative path resolves
ln -s "$COLD" "$PROJECT/test-cold-pool"

pass "skill-deck.toml created"

# ── Step 4: Link to establish working set ────────────────────────────────
echo ""
echo "🔗 Step 4: deck link — establish working set"

(cd "$PROJECT" && bun "$DECK_CLI" link) >/dev/null 2>&1

if [ -L "$PROJECT/.claude/skills/skill-a" ] && [ -L "$PROJECT/.claude/skills/skill-b" ]; then
  pass "Both symlinks created"
else
  fail "Symlinks missing"
fi

# ── Step 5: Add commit to remote (simulate upstream update) ──────────────
echo ""
echo "⬆️  Step 5: Add commit to remote"

cd "$REMOTE"
echo "update" >> README.md
git add .
git commit -m "update"

pass "New commit on remote"

# ── Step 6: Plan-only refresh — verify behind count ──────────────────────
echo ""
echo "📋 Step 6: deck refresh (plan-only) — verify behind count"

PLAN_OUTPUT=$(cd "$PROJECT" && bun "$DECK_CLI" refresh 2>&1 || true)

echo "$PLAN_OUTPUT"

# Both skills should show "1 behind" (same repo, same behind count)
BEHIND_A=$(echo "$PLAN_OUTPUT" | grep "skill-a" | grep -o '[0-9]\+ behind' | grep -o '[0-9]\+' || echo "0")
BEHIND_B=$(echo "$PLAN_OUTPUT" | grep "skill-b" | grep -o '[0-9]\+ behind' | grep -o '[0-9]\+' || echo "0")

if [ "$BEHIND_A" = "1" ]; then
  pass "skill-a shows correct 1 behind"
else
  fail "skill-a behind count != 1 (got: $BEHIND_A)"
fi

if [ "$BEHIND_B" = "1" ]; then
  pass "skill-b shows correct 1 behind"
else
  fail "skill-b behind count != 1 (got: $BEHIND_B)"
fi

# ── Step 7: Exec refresh — apply updates ─────────────────────────────────
echo ""
echo "🚀 Step 7: deck refresh --exec — apply updates"

EXEC_OUTPUT=$(cd "$PROJECT" && bun "$DECK_CLI" refresh --exec 2>&1 || true)

echo "$EXEC_OUTPUT"

# Verify both skills updated (same repo, both should reflect pull)
if echo "$EXEC_OUTPUT" | grep -q "Updated:"; then
  UPDATED_COUNT=$(echo "$EXEC_OUTPUT" | grep "Updated:" | grep -o 'Updated: [0-9]\+' | grep -o '[0-9]\+' || echo "0")
  if [ "$UPDATED_COUNT" -ge 1 ] 2>/dev/null; then
    pass "Exec report shows updates ($UPDATED_COUNT)"
  else
    fail "Exec report shows 0 updates"
  fi
else
  fail "Exec output missing 'Updated:'"
fi

# Both skills should be mentioned in monorepo group output
if echo "$EXEC_OUTPUT" | grep -q "skill-a"; then
  pass "skill-a mentioned in exec output"
else
  fail "skill-a missing from exec output"
fi

if echo "$EXEC_OUTPUT" | grep -q "skill-b"; then
  pass "skill-b mentioned in exec output"
else
  fail "skill-b missing from exec output"
fi

# Verify monorepo grouping: same repo skills grouped together
if echo "$EXEC_OUTPUT" | grep -q "test-org/test-repo.*2 skill"; then
  pass "Monorepo skills grouped by repo"
else
  fail "Monorepo skills not grouped"
fi

# ── Step 8: Verify working set still valid after refresh ─────────────────
echo ""
echo "🔍 Step 8: Verify working set after refresh"

if [ -L "$PROJECT/.claude/skills/skill-a" ] && [ -L "$PROJECT/.claude/skills/skill-b" ]; then
  pass "Symlinks still valid after refresh"
else
  fail "Symlinks broken after refresh"
fi

# ── Step 9: Second plan-only refresh should show up-to-date ──────────────
echo ""
echo "📋 Step 9: Second plan-only refresh — should be up-to-date"

PLAN2_OUTPUT=$(cd "$PROJECT" && bun "$DECK_CLI" refresh 2>&1 || true)

if echo "$PLAN2_OUTPUT" | grep -q "up to date"; then
  pass "Second refresh shows up to date"
else
  fail "Second refresh still shows behind"
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
