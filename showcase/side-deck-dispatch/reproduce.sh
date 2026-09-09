#!/usr/bin/env bash
# ── Side Deck Dispatch reproduce.sh — IoC verification ───────────────────
# Purpose: Verify the task-scoped side-deck dispatch loop end-to-end:
#          parent deck linked → side deck arrives for one task →
#          `deck link --deck <side>` switches working set (deny-by-default:
#          parent skills leave the agent's view) → task done →
#          `deck link` on the parent deck restores it. Cold pool untouched.
#
# This is the mechanical half of the pattern documented in
# README.md §"Side Decks — Task-Scoped Dispatch". The intelligence half
# (agent reads the deck's combo prompts and executes them) is explicitly
# NOT runnable in CI — see the deck skill's combo consumption contract.
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
echo "🃏 Side Deck Dispatch reproduce.sh"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── Step 1: Cold pool fixture — 3 skills across two repos ────────────────
echo ""
echo "📦 Step 1: Setup cold pool"

POOL="$TMPDIR/cold-pool"
mkdir -p "$POOL/github.com/test-org/parent-repo/skills/parent-skill"
mkdir -p "$POOL/github.com/test-org/qa-repo/skills/sweep-reader"
mkdir -p "$POOL/github.com/test-org/qa-repo/skills/sweep-writer"

cat > "$POOL/github.com/test-org/parent-repo/skills/parent-skill/SKILL.md" << 'SKILLEOF'
---
name: parent-skill
description: The always-on project skill from the parent deck
---

# Parent Skill
Minimal skill for side-deck dispatch verification.
SKILLEOF

cat > "$POOL/github.com/test-org/qa-repo/skills/sweep-reader/SKILL.md" << 'SKILLEOF'
---
name: sweep-reader
description: QA sweep phase — read and triage findings
---

# Sweep Reader
Minimal skill for side-deck dispatch verification.
SKILLEOF

cat > "$POOL/github.com/test-org/qa-repo/skills/sweep-writer/SKILL.md" << 'SKILLEOF'
---
name: sweep-writer
description: QA sweep phase — write the audit report
---

# Sweep Writer
Minimal skill for side-deck dispatch verification.
SKILLEOF

pass "Cold pool: 3 skills in 2 repos"

# ── Step 2: Project with parent deck (the standing working set) ──────────
echo ""
echo "📝 Step 2: Parent deck — skill-deck.toml declares parent-skill"

PROJECT="$TMPDIR/project"
mkdir -p "$PROJECT/.claude/skills"

cat > "$PROJECT/skill-deck.toml" << 'DECKEOF'
[deck]
max_cards = 5
cold_pool = "./cold-pool"
working_set = ".claude/skills"

[tool.skills.parent-skill]
path = "github.com/test-org/parent-repo/skills/parent-skill"
DECKEOF

ln -s "$POOL" "$PROJECT/cold-pool"
pass "Parent deck created"

# ── Step 3: Link parent deck ─────────────────────────────────────────────
echo ""
echo "🔗 Step 3: deck link — establish standing working set"

(cd "$PROJECT" && bun "$DECK_CLI" link) >/dev/null 2>&1

if [ -L "$PROJECT/.claude/skills/parent-skill" ]; then
  pass "parent-skill linked"
else
  fail "parent-skill symlink missing"
fi

# ── Step 4: A QA task arrives with its own side deck ─────────────────────
echo ""
echo "📨 Step 4: Side deck arrives (any path, any origin — file or URL)"

SIDE="$TMPDIR/qa-sweep.toml"
cat > "$SIDE" << 'DECKEOF'
# Side deck — task-scoped. Lives OUTSIDE the project; linked per task.
# Real-world shape: examples/decks/qa-sweep.toml (committed) or a URL.
[deck]
max_cards = 5
cold_pool = "./cold-pool"
working_set = ".claude/skills"

[tool.skills.sweep-reader]
path = "github.com/test-org/qa-repo/skills/sweep-reader"

[tool.skills.sweep-writer]
path = "github.com/test-org/qa-repo/skills/sweep-writer"
DECKEOF

pass "Side deck written outside project dir ($SIDE)"

# ── Step 5: deck link --deck <side> — the phase switch ───────────────────
echo ""
echo "🔀 Step 5: deck link --deck <side> — task-scoped switch"

(cd "$PROJECT" && bun "$DECK_CLI" link --deck "$SIDE") >/dev/null 2>&1

if [ -L "$PROJECT/.claude/skills/sweep-reader" ] && [ -L "$PROJECT/.claude/skills/sweep-writer" ]; then
  pass "Side deck skills linked (sweep-reader, sweep-writer)"
else
  fail "Side deck skills missing from working set"
fi

if [ ! -e "$PROJECT/.claude/skills/parent-skill" ]; then
  pass "parent-skill absent — deny-by-default hides non-declared skills"
else
  fail "parent-skill still visible after side-deck switch"
fi

# ── Step 6: Lock tracks the ACTIVE deck, not the filename ────────────────
echo ""
echo "🔒 Step 6: skill-deck.lock points at the side deck while active"

if grep -q "qa-sweep.toml" "$PROJECT/skill-deck.lock"; then
  pass "Lock records side deck as deck_source"
else
  fail "Lock does not record side deck as deck_source"
fi

# ── Step 7: Task done — restore parent deck ──────────────────────────────
echo ""
echo "↩️  Step 7: deck link (no --deck) — restore standing working set"

(cd "$PROJECT" && bun "$DECK_CLI" link) >/dev/null 2>&1

if [ -L "$PROJECT/.claude/skills/parent-skill" ]; then
  pass "parent-skill restored"
else
  fail "parent-skill not restored"
fi

if [ ! -e "$PROJECT/.claude/skills/sweep-reader" ] && [ ! -e "$PROJECT/.claude/skills/sweep-writer" ]; then
  pass "Side deck skills fully removed — zero state pollution"
else
  fail "Side deck skills leaked into restored working set"
fi

# ── Step 8: Cold pool untouched throughout ───────────────────────────────
echo ""
echo "🧊 Step 8: Cold pool integrity"

INTACT=0
for f in \
  "$POOL/github.com/test-org/parent-repo/skills/parent-skill/SKILL.md" \
  "$POOL/github.com/test-org/qa-repo/skills/sweep-reader/SKILL.md" \
  "$POOL/github.com/test-org/qa-repo/skills/sweep-writer/SKILL.md"; do
  [ -f "$f" ] && INTACT=$((INTACT + 1))
done

if [ "$INTACT" -eq 3 ]; then
  pass "All 3 cold pool sources intact"
else
  fail "Cold pool damaged ($INTACT/3 intact)"
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
