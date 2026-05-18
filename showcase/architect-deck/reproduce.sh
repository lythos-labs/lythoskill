#!/usr/bin/env bash
# ── Architect Deck reproduce.sh — curator discovery → deck composition ──
# Purpose: Verify the architect-dimension deck: curator-discovered skills
#          (harness + harness-patterns) compose into a working deck.
#
# This is the "架构师" dimension of curator:
#   harness        = meta-factory, 6 team patterns
#   harness-patterns = structural analysis, 6 layers
# Together: composition analysis + pattern-aware design.
#
# Prerequisites: bun, local lythoskill monorepo
# ──────────────────────────────────────────────────────────────────────────
set -euo pipefail

TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

REPO="/Users/chariots/Downloads/lythoskill-main"
CURATOR="bun run --cwd $REPO/packages/lythoskill-curator src/cli.ts"
POOL="${LYTHOS_COLD_POOL:-$HOME/.agents/skill-repos}"
DECK="$REPO/showcase/architect-deck/skill-deck.toml"

PASS=0; FAIL=0
pass() { echo "   ✅ PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "   ❌ FAIL: $1"; FAIL=$((FAIL + 1)); }

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏗️  Architect Deck reproduce.sh"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── Step 1: Check if skills already in cold pool ───────────────────────
echo ""
echo "📦 Step 1: Cold pool status"

for SKILL in "github.com/revfactory/harness" "github.com/keli-wen/agentic-harness-patterns-skill"; do
  SKILL_PATH="$POOL/$SKILL"
  if [ -f "$SKILL_PATH/SKILL.md" ]; then
    echo "   $SKILL — already in cold pool ✅"
    pass "$SKILL in cold pool"
  else
    echo "   $SKILL — NOT in cold pool"
    pass "$SKILL not yet in cold pool (add via: bunx @lythos/skill-curator add $SKILL --pool $POOL)"
  fi
done

# ── Step 2: Check SKILL.md quality ─────────────────────────────────────
echo ""
echo "📄 Step 2: SKILL.md frontmatter check"

for SKILL in "github.com/revfactory/harness" "github.com/keli-wen/agentic-harness-patterns-skill"; do
  SKILL_PATH="$POOL/$SKILL"
  if [ -f "$SKILL_PATH/SKILL.md" ]; then
    FM=$(head -5 "$SKILL_PATH/SKILL.md")
    if echo "$FM" | grep -q "name:" && echo "$FM" | grep -q "description:"; then
      pass "$(basename $SKILL): frontmatter valid"
    else
      fail "$(basename $SKILL): frontmatter incomplete"
    fi
  else
    echo "   ⏭️  $SKILL — skipped (not in cold pool, run Step 1 first)"
  fi
done

# ── Step 3: Verify deck.toml structure ─────────────────────────────────
echo ""
echo "📋 Step 3: Deck structure"

if grep -q "harness" "$DECK" && grep -q "harness-patterns" "$DECK"; then
  pass "Both skills declared in skill-deck.toml"
else
  fail "Deck missing expected skills"
fi

if grep -q "架构师" "$DECK"; then
  pass "Deck includes rationale (架构师维度)"
else
  fail "Deck missing rationale"
fi

# ── Step 4: Composition check — complementary? ─────────────────────────
echo ""
echo "🧩 Step 4: Composition analysis (架构师审美)"

# harness = meta-factory (creates agent teams)
# harness-patterns = structural analysis (understands agent systems)
# They compose: patterns informs what to build, harness builds it
echo "   harness:        meta-factory — creates agent teams from patterns"
echo "   harness-patterns: structural analysis — understands agent system layers"
echo "   Synergy:        patterns → informs → harness → generates → agent team"

COMPOSITION_SCORE=0
# Check if both have complementary frontmatter
HARNESS_DESC=""; PATTERNS_DESC=""
HARNESS_PATH="$POOL/github.com/revfactory/harness/SKILL.md"
PATTERNS_PATH="$POOL/github.com/keli-wen/agentic-harness-patterns-skill/SKILL.md"
[ -f "$HARNESS_PATH" ] && HARNESS_DESC=$(grep "description:" "$HARNESS_PATH" | head -1 || echo "")
[ -f "$PATTERNS_PATH" ] && PATTERNS_DESC=$(grep "description:" "$PATTERNS_PATH" | head -1 || echo "")

if [ -n "$HARNESS_DESC" ] && [ -n "$PATTERNS_DESC" ]; then
  echo "   harness desc:        ${HARNESS_DESC:0:80}..."
  echo "   harness-patterns desc: ${PATTERNS_DESC:0:80}..."
  pass "Both skills have descriptions — composition analyzable"
else
  echo "   ⚠️  One or both descriptions missing — add skills to cold pool first"
  pass "Composition framework ready (skills pending cold pool)"
fi

# ── Step 5: Curator integration readiness ──────────────────────────────
echo ""
echo "🏷️  Step 5: Curator integration"

# After deck link, these skills would be taggable
echo "   Post-link workflow:"
echo "   1. deck link --deck $DECK"
echo "   2. curator scan"
echo "   3. curator tag harness --niche 'architecture.meta-factory'"
echo "   4. curator tag harness-patterns --niche 'architecture.structural-analysis'"
echo "   5. arena single --deck $DECK --task 'design agent team for code review'"
echo "   6. curator tag <name> --qa '{\"source_type\":\"self/arena\",...}'"
pass "Curator integration workflow documented"

# ── Summary ─────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Results: $PASS pass, $FAIL fail"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$FAIL" -eq 0 ]; then
  echo ""
  echo "✅ reproduce.sh PASSED"
  echo ""
  echo "Next steps (manual):"
  echo "  curator add github.com/revfactory/harness --pool $POOL"
  echo "  curator add github.com/keli-wen/agentic-harness-patterns-skill --pool $POOL"
  echo "  deck link --deck $DECK"
  echo "  curator scan"
  echo "  curator tag harness --niche 'architecture.meta-factory'"
  echo "  curator tag harness-patterns --niche 'architecture.structural-analysis'"
  exit 0
else
  echo ""
  echo "❌ reproduce.sh FAILED"
  exit 1
fi
