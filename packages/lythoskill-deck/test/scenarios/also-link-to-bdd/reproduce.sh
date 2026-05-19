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
echo "  MANDATORY: write decision-log.jsonl to CWD ($PROJECT)"
echo "  Each line: {\"step\":\"...\",\"decision\":\"...\",\"reason\":\"...\",\"ts\":\"...\"}"

echo ""
echo "=== Step 4: Judge verification (criteria in judge.md) ==="
echo "  Verify against $(dirname "$0")/judge.md"
echo "  Write judge-verdict.json to $PROJECT"

echo ""
echo "=== Done ==="
echo "  Workdir: $PROJECT"
echo "  Judge criteria: $(dirname "$0")/judge.md"
