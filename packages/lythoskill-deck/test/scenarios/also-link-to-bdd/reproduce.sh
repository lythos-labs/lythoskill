#!/bin/bash
# BDD: also_link_to multi-target POSSE fan-out — reproduce.sh IoC pattern
# Date: 2026-05-19
# Package: lythoskill-deck
# ═══════════════════════════════════════════════════════════════════════════
# AGENT-ONLY REPLAY — Step 3 is IoC handoff, not executable shell.
#   bash reproduce.sh
# ═══════════════════════════════════════════════════════════════════════════
set -e

TEST_DIR="/tmp/also-link-to-bdd-$(date +%Y%m%d-%H%M%S)"
COLD_POOL="$TEST_DIR/cold-pool"
PROJECT="$TEST_DIR/project"
SKILL_A="$COLD_POOL/localhost/me/skill-a"
SKILL_B="$COLD_POOL/localhost/me/skill-b"

echo "=== Step 1: Create directory structure ==="
mkdir -p "$SKILL_A" "$SKILL_B" "$PROJECT"
echo "# skill-a" > "$SKILL_A/SKILL.md"
echo "# skill-b" > "$SKILL_B/SKILL.md"

cat > "$PROJECT/skill-deck.toml" << 'DECKEOF'
[deck]
max_cards = 10
cold_pool = "../cold-pool"
working_set = ".claude/skills"
also_link_to = [".agents/skills", ".kimi/skills"]

[tool.skills.skill-a]
path = "localhost/me/skill-a"

[tool.skills.skill-b]
path = "localhost/me/skill-b"
DECKEOF

echo "=== Step 2: deck link (establish 3-target working set) ==="
bun packages/lythoskill-deck/src/cli.ts link --deck "$PROJECT/skill-deck.toml" --workdir "$PROJECT"

echo ""
echo "=== Step 3: Agent verifies multi-target POSSE fan-out (IoC handoff) ==="
echo "  cd $PROJECT"
echo "  <spawn subagent>"
echo ""
echo "  IoContract: all commands idempotent. Exit 0 = success."
echo ""
echo "  PHASE 1 — Verify initial fan-out (3 targets x 2 skills = 6 symlinks):"
echo "    1. .claude/skills/skill-a is a symlink"
echo "    2. .claude/skills/skill-b is a symlink"
echo "    3. .agents/skills/skill-a is a symlink"
echo "    4. .agents/skills/skill-b is a symlink"
echo "    5. .kimi/skills/skill-a is a symlink"
echo "    6. .kimi/skills/skill-b is a symlink"
echo ""
echo "  PHASE 2 — Remove skill-a, verify deny-by-default across ALL targets:"
echo "    bun packages/lythoskill-deck/src/cli.ts remove skill-a --deck $PROJECT/skill-deck.toml --workdir $PROJECT"
echo "    7. skill-deck.toml does NOT contain [tool.skills.skill-a]"
echo "    8. skill-deck.toml still contains [tool.skills.skill-b]"
echo "    9. .claude/skills/skill-a does NOT exist"
echo "   10. .agents/skills/skill-a does NOT exist"
echo "   11. .kimi/skills/skill-a does NOT exist"
echo "   12. .claude/skills/skill-b still exists (symlink, untouched)"
echo "   13. .agents/skills/skill-b still exists (symlink, untouched)"
echo "   14. .kimi/skills/skill-b still exists (symlink, untouched)"
echo ""
echo "  PHASE 3 — Re-add skill-a, verify all 3 targets restore:"
echo "    Add [tool.skills.skill-a] back to skill-deck.toml:"
echo "      path = 'localhost/me/skill-a'"
echo "    bun packages/lythoskill-deck/src/cli.ts link --deck $PROJECT/skill-deck.toml --workdir $PROJECT"
echo "   15. .claude/skills/skill-a is a symlink again"
echo "   16. .agents/skills/skill-a is a symlink again"
echo "   17. .kimi/skills/skill-a is a symlink again"
echo ""
echo "  PHASE 4 — Cold pool integrity:"
echo "   18. cold-pool/localhost/me/skill-a/SKILL.md still exists"
echo "   19. cold-pool/localhost/me/skill-b/SKILL.md still exists"
echo ""
echo "  PHASE 5 — Ownership boundary INSIDE a fan-out target (TASK-20260910111600389):"
echo "    deck removes only what it can prove it created. Put two things in .agents/skills"
echo "    that deck did not create, then re-link:"
echo "      mkdir -p $PROJECT/.agents/skills/foreign-skill && echo '# theirs' > $PROJECT/.agents/skills/foreign-skill/SKILL.md"
echo "      ln -s /tmp/other-project/skill-x $PROJECT/.agents/skills/other-link"
echo "      bun packages/lythoskill-deck/src/cli.ts link --deck $PROJECT/skill-deck.toml --workdir $PROJECT"
echo "   20. .agents/skills/foreign-skill STILL EXISTS (a real dir deck never created)"
echo "   21. .agents/skills/other-link STILL EXISTS (symlink into another project)"
echo "   22. stderr says \"2 entries in .agents/skills left untouched\" + why + a precise 'rm -r' suggestion"
echo "   23. no other target lost an entry it should have kept (re-check 12-14)"
echo ""
echo "  NOTE on PHASE 2 assertions 9-11: they hold UNCHANGED under the ownership boundary."
echo "    Those entries are symlinks into THIS deck's cold pool, i.e. deck created them,"
echo "    so deck may remove them. Verified by a full shell replay 2026-09-10 (all of"
echo "    1-19 held; 20-23 verified separately) — the earlier reading that PHASE 2"
echo "    conflicts with ownership semantics was wrong."
echo ""
echo "  MANDATORY: write decision-log.jsonl to CWD ($PROJECT)"
echo "  Each line: {\"step\":\"...\",\"decision\":\"...\",\"reason\":\"...\",\"ts\":\"...\"}"
echo "  NOTE: ts is provenance, not a clock — do not build a timeline from it (reproduce-sh-bdd-contract.md)"

echo ""
echo "=== Step 4: Judge verification (criteria in judge.md) ==="
echo "  Verify against $(dirname "$0")/judge.md"
echo "  Write judge-verdict.json to $PROJECT"

echo ""
echo "=== Done ==="
echo "  Workdir: $PROJECT"
echo "  Judge criteria: $(dirname "$0")/judge.md"
