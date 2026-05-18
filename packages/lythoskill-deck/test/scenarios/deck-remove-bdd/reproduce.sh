#!/bin/bash
# BDD: deck remove — reproduce.sh IoC pattern
# Migrated from: deck-remove.agent.md
# Date: 2026-05-18
# Package: lythoskill-deck
# ═══════════════════════════════════════════════════════════════════════════
set -e

TEST_DIR="/tmp/deck-remove-bdd-$(date +%Y%m%d-%H%M%S)"
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

[tool.skills.skill-a]
path = "localhost/me/skill-a"

[tool.skills.skill-b]
path = "localhost/me/skill-b"
DECKEOF

echo "=== Step 2: deck link (establish working set) ==="
bun packages/lythoskill-deck/src/cli.ts link --deck "$PROJECT/skill-deck.toml" --workdir "$PROJECT"

echo ""
echo "=== Step 3: Agent verifies remove (IoC handoff) ==="
echo "  cd $PROJECT"
echo "  <spawn subagent>"
echo ""
echo "  IoContract: all commands idempotent. Exit 0 = success."
echo ""
echo "  Run deck remove:"
echo "    bun packages/lythoskill-deck/src/cli.ts remove skill-a --deck $PROJECT/skill-deck.toml --workdir $PROJECT"
echo ""
echo "  Verify:"
echo "    1. skill-deck.toml does NOT contain [tool.skills.skill-a]"
echo "    2. skill-deck.toml still contains [tool.skills.skill-b]"
echo "    3. .claude/skills/skill-a does NOT exist"
echo "    4. .claude/skills/skill-b is still a symlink"
echo "    5. cold-pool/localhost/me/skill-a still exists (cold pool untouched)"
echo "    6. Run deck link again → working set syncs, skill-a stays gone"
echo ""
echo "  MANDATORY: write decision-log.jsonl to CWD"

echo ""
echo "=== Step 4: Judge verification (criteria in judge.md) ==="
echo "  Verify against $(dirname "$0")/judge.md"
echo "  Write judge-verdict.json to $PROJECT"

echo ""
echo "=== Done ==="
echo "  Workdir: $PROJECT"
echo "  Judge criteria: $(dirname "$0")/judge.md"
