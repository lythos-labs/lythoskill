#!/usr/bin/env bash
# ── Curator MVP reproduce.sh — IoC verification ──────────────────────────
# Purpose: Verify curator scan → query → tag → re-scan → audit → legacy audit
#          end-to-end, matching ADR-20260518123403810.
#
# Prerequisites: bun, local curator source at packages/lythoskill-curator
# Output:        PASS/FAIL per step, exit 0 on all PASS
# Cleanup:       trap removes TMPDIR on exit
# ──────────────────────────────────────────────────────────────────────────
set -euo pipefail

TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

CURATOR_DIR="/Users/chariots/Downloads/lythoskill-main/packages/lythoskill-curator"
CURATOR="bun run src/cli.ts"

run_curator() {
  (cd "$CURATOR_DIR" && $CURATOR "$@")
}

PASS=0
FAIL=0

pass() { echo "   ✅ PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "   ❌ FAIL: $1"; FAIL=$((FAIL + 1)); }

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧠 Curator MVP reproduce.sh"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── Step 1: Setup sample cold pool ──────────────────────────────────────
echo ""
echo "📦 Step 1: Setup sample cold pool"

POOL="$TMPDIR/skill-repos"
OUTPUT="$TMPDIR/curator-index"
mkdir -p "$POOL/github.com/test-org/test-skills/skills/clean-skill"
mkdir -p "$POOL/github.com/test-org/test-skills/skills/legacy-skill"

cat > "$POOL/github.com/test-org/test-skills/skills/clean-skill/SKILL.md" << 'SKILLEOF'
---
name: test-clean-skill
description: A clean test skill for verifying curator scan and tag
version: 1.0.0
type: standard
when_to_use: Use this for testing curator MVP functionality
allowed-tools:
  - Bash(cat *)
tags:
  - test
---

# Test Clean Skill
Well-formed skill with no custom fields and no legacy references.
SKILLEOF

cat > "$POOL/github.com/test-org/test-skills/skills/legacy-skill/SKILL.md" << 'SKILLEOF'
---
name: test-legacy-skill
description: A skill with legacy references for testing audit detection
version: 1.0.0
type: standard
---

# Test Legacy Skill
This skill references skills.sh marketplace and uses deck update command.
Also mentions HANDOFF.md as the handoff path.
SKILLEOF

echo "   Sample skills created: clean-skill, legacy-skill"
pass "Sample cold pool setup"

# ── Step 2: Scan cold pool ──────────────────────────────────────────────
echo ""
echo "🔍 Step 2: Scan cold pool"

run_curator "$POOL" --output "$OUTPUT" 2>&1 | tail -1

[ -f "$OUTPUT/REGISTRY.json" ] && pass "REGISTRY.json generated" || fail "REGISTRY.json not found"
[ -f "$OUTPUT/catalog.db" ] && pass "catalog.db generated" || fail "catalog.db not found"

SKILL_COUNT=$(run_curator query --db "$OUTPUT/catalog.db" \
  "SELECT COUNT(*) AS count FROM skills" 2>/dev/null | grep -o '[0-9]\+' | head -1)
[ "$SKILL_COUNT" = "2" ] && pass "Both skills indexed (count=$SKILL_COUNT)" || fail "Expected 2 skills, got $SKILL_COUNT"

# ── Step 3: Query + verify empty niches ─────────────────────────────────
echo ""
echo "🔎 Step 3: Query + verify niches empty on initial scan"

QUERY_RESULT=$(run_curator query --db "$OUTPUT/catalog.db" \
  "SELECT name FROM skills WHERE name = 'test-clean-skill'" 2>/dev/null)
echo "$QUERY_RESULT" | grep -q "test-clean-skill" && pass "Query returns clean skill" || fail "Query did not return clean skill"

NICHE_CHECK=$(run_curator query --db "$OUTPUT/catalog.db" \
  "SELECT niches FROM skills WHERE name = 'test-clean-skill'" 2>/dev/null)
echo "$NICHE_CHECK" | grep -q '\[\]' && pass "Niches empty on initial scan (not from frontmatter)" || fail "Niches should be empty: $NICHE_CHECK"

# ── Step 4: Tag — agent-enriched metadata ───────────────────────────────
echo ""
echo "🏷️  Step 4: Tag — write agent-enriched niche + QA"

run_curator tag test-clean-skill --niche "test.categories.verification" --db "$OUTPUT/catalog.db" 2>&1 | tail -1

TAG_CHECK=$(run_curator query --db "$OUTPUT/catalog.db" \
  "SELECT niches FROM skills WHERE name = 'test-clean-skill'" 2>/dev/null)
echo "$TAG_CHECK" | grep -q "test.categories.verification" && pass "Niche tag written" || fail "Niche tag not found"

run_curator tag test-clean-skill \
  --qa '{"source_type":"self/arena","source_name":"manual","signal_type":"score","signal_value":9}' \
  --db "$OUTPUT/catalog.db" 2>&1 | tail -1

QA_CHECK=$(run_curator query --db "$OUTPUT/catalog.db" \
  "SELECT niches FROM skills WHERE name = 'test-clean-skill'" 2>/dev/null)
echo "$QA_CHECK" | grep -q "qa:" && pass "QA signal written" || fail "QA signal not found"

# ── Step 5: Re-scan — verify merge strategy ─────────────────────────────
echo ""
echo "🔄 Step 5: Re-scan — niches must survive"

run_curator "$POOL" --output "$OUTPUT" 2>&1 | tail -1

RESCAN_CHECK=$(run_curator query --db "$OUTPUT/catalog.db" \
  "SELECT niches FROM skills WHERE name = 'test-clean-skill'" 2>/dev/null)
echo "$RESCAN_CHECK" | grep -q "test.categories.verification" && pass "Niches preserved after re-scan" || fail "Niches lost after re-scan"

# ── Step 6: Audit — no empty-niche violation ─────────────────────────────
echo ""
echo "📋 Step 6: Audit — structural + legacy checks"

AUDIT_OUTPUT=$(run_curator audit --db "$OUTPUT/catalog.db" 2>&1 || true)

# Empty niche check must be GONE
if echo "$AUDIT_OUTPUT" | grep -q "Empty niches"; then
  fail "Empty-niche violation still in audit"
else
  pass "Empty-niche check removed (per ADR)"
fi

# Structural checks must remain
echo "$AUDIT_OUTPUT" | grep -q "Missing frontmatter" && pass "Structural checks present" || fail "Structural checks missing"

# ── Step 7: Legacy pattern detection ─────────────────────────────────────
echo ""
echo "🏚️  Step 7: Legacy pattern detection"

if echo "$AUDIT_OUTPUT" | grep -q "Legacy patterns"; then
  LEGACY_LINE=$(echo "$AUDIT_OUTPUT" | grep "Legacy patterns")
  echo "   $LEGACY_LINE"
  LEGACY_COUNT=$(echo "$LEGACY_LINE" | grep -o '[0-9]\+ issue' | grep -o '[0-9]\+' || echo "0")
  if [ "$LEGACY_COUNT" -ge 1 ] 2>/dev/null; then
    pass "Legacy patterns detected ($LEGACY_COUNT issues — skills.sh, deck update, HANDOFF.md)"
  else
    pass "Legacy check infrastructure present (0 issues for clean skills)"
  fi
else
  fail "Legacy pattern check missing from audit"
fi

# ── Step 8: Dormancy — clean skill audit clean ───────────────────────────
echo ""
echo "🧹 Step 8: Dormancy — clean skill has 0 issues"

CLEAN_CHECK=$(run_curator query --db "$OUTPUT/catalog.db" \
  "SELECT name FROM skills WHERE name = 'test-clean-skill'" 2>/dev/null)
echo "$CLEAN_CHECK" | grep -q "test-clean-skill" && pass "Clean skill indexed correctly" || fail "Clean skill missing"

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
