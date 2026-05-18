#!/bin/bash
# BDD: deck to-symlink / to-snapshot roundtrip — reproduce.sh IoC pattern
# Migrated from: deck-to-symlink-to-snapshot.agent.md
# Date: 2026-05-18
# Package: lythoskill-deck
#
# ═══════════════════════════════════════════════════════════════════════════
# AGENT-ONLY REPLAY — Step 3 is IoC handoff, not executable shell.
#   bash reproduce.sh
# ═══════════════════════════════════════════════════════════════════════════
set -e

TEST_DIR="/tmp/to-symlink-snapshot-bdd-$(date +%Y%m%d-%H%M%S)"
COLD_POOL="$TEST_DIR/cold-pool"
PROJECT="$TEST_DIR/project"
SKILL_DIR="$COLD_POOL/github.com/test-org/skill-x"

echo "=== Step 1: Create directory structure ==="
mkdir -p "$SKILL_DIR" "$PROJECT"

echo "# skill-x" > "$SKILL_DIR/SKILL.md"
echo "" >> "$SKILL_DIR/SKILL.md"
echo "Test skill." >> "$SKILL_DIR/SKILL.md"

cat > "$PROJECT/skill-deck.toml" << 'DECKEOF'
[deck]
max_cards = 10
cold_pool = "../cold-pool"
working_set = ".claude/skills"

[tool.skills.skill-x]
path = "localhost/skill-x"
DECKEOF

echo "=== Step 2: deck link (initial symlink state) ==="
bun packages/lythoskill-deck/src/cli.ts link \
  --deck "$PROJECT/skill-deck.toml" \
  --workdir "$PROJECT"

echo ""
echo "=== Step 3: Agent verifies roundtrip (IoC handoff) ==="
echo "  cd $PROJECT"
echo "  <spawn subagent>"
echo ""
echo "  Verify initial state:"
echo "    1. .claude/skills/skill-x IS a symlink (lstat → isSymbolicLink)"
echo "    2. skill-deck.lock has mode: 'symlink' for skill-x"
echo ""
echo "  Run to-snapshot:"
echo "    bun packages/lythoskill-deck/src/cli.ts to-snapshot skill-x --deck $PROJECT/skill-deck.toml --workdir $PROJECT"
echo "  Verify snapshot state:"
echo "    3. .claude/skills/skill-x is a REAL DIRECTORY (NOT symlink)"
echo "    4. .claude/skills/skill-x/SKILL.md contains 'Test skill' (content preserved)"
echo "    5. skill-deck.lock has mode: 'snapshot' for skill-x"
echo ""
echo "  Run to-symlink:"
echo "    bun packages/lythoskill-deck/src/cli.ts to-symlink skill-x --deck $PROJECT/skill-deck.toml --workdir $PROJECT"
echo "  Verify symlink state:"
echo "    6. .claude/skills/skill-x is a symlink again"
echo "    7. skill-deck.lock has mode: 'symlink' for skill-x"
echo ""
echo "  Idempotency:"
echo "    8. to-snapshot again → 'already in snapshot mode' (no-op)"
echo "    9. to-symlink again → 'already in symlink mode' (no-op)"
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
