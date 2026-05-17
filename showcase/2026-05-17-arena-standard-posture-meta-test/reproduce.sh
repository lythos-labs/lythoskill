#!/bin/bash
# Arena Standard Posture Meta-Test
# A skill testing whether its own SOP produces correct agent behavior.
# Date: 2026-05-17
# Arena version: 0.14.1
#
# Run: bash reproduce.sh
# Step 3 is AGENT-ONLY — spawn subagent manually to execute the comprehension task.
# ═══════════════════════════════════════════════════════════════════════════
set -e

DECK="/tmp/test-arena-meta-deck.toml"
WORKDIR="/tmp/arena-20260517-meta"

echo "=== Step 1: Create minimal deck (governance + target skill) ==="
cat > "$DECK" << 'DECKEOF'
[deck]
max_cards = 10
cold_pool = "~/.agents/skill-repos"
working_set = ".claude/skills"

[innate.skills.lythoskill-deck]
path = "github.com/lythos-labs/lythoskill/skills/lythoskill-deck"

[innate.skills.lythoskill-arena]
path = "github.com/lythos-labs/lythoskill/skills/lythoskill-arena"
DECKEOF

echo "=== Step 2: prepare-workdir ==="
bunx @lythos/skill-arena@0.14.1 prepare-workdir \
  --deck "$DECK" \
  --out "$WORKDIR" \
  --brief "Verify that an agent can understand and apply the Standard Posture from lythoskill-arena SKILL.md"

echo "=== Step 3: Agent reads SKILL.md and demonstrates understanding ==="
echo "  cd $WORKDIR"
echo "  Read: /path/to/packages/lythoskill-arena/skill/SKILL.md (CURRENT version with Standard Posture)"
echo "  Find section: '## Standard Posture: Arena as Mindset Validator'"
echo "  Explain: purpose, minimal deck principle, 4 steps, why guessing-is-fail"
echo "  Apply: design 4-step test for a hypothetical skill with MUST FILL directive"
echo "  MANDATORY: write decision-log.jsonl to CWD"

echo "=== Done ==="
