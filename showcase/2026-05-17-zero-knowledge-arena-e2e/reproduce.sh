#!/bin/bash
# Arena single-deck test: frontend-design
# Run date: 2026-05-17
set -e

DECK="/tmp/test-deck.toml"
WORKDIR="/tmp/arena-20260517-single-frontend"

echo "=== Step 1: Create test deck ==="
cat > "$DECK" << 'DECKEOF'
[deck]
max_cards = 5
cold_pool = "~/.agents/skill-repos"
working_set = ".claude/skills"

[tool.skills.frontend-design]
path = "github.com/anthropics/skills/skills/frontend-design"
DECKEOF

echo "=== Step 2: prepare-workdir ==="
bunx @lythos/skill-arena@0.14.0 prepare-workdir \
  --deck "$DECK" \
  --out "$WORKDIR" \
  --brief "Generate a 'Subscribe' button HTML component that is visually striking and production-grade"

echo "=== Step 3: Agent executes task in workdir (manual step) ==="
echo "  cd $WORKDIR && <spawn subagent to create artifacts + decision-log.jsonl>"

echo "=== Step 4: archive ==="
bunx @lythos/skill-arena@0.14.0 archive \
  --from "$WORKDIR" \
  --to ./playground/arena-20260517-single-frontend \
  --sides side-a \
  --report "$WORKDIR/report.md"

echo "=== Done ==="
