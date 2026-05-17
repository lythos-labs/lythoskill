#!/bin/bash
# Arena single-deck test: frontend-design
# Run date: 2026-05-17
#
# ═══════════════════════════════════════════════════════════════════════════
# AGENT-ONLY REPLAY — human execution is intentionally incomplete.
#
#   bash reproduce.sh
#
# Step 3 is NOT a shell command. It prints a contextual instruction to stdout.
# When a HUMAN runs this, Step 3 is useless — they see an echo line and nothing.
# When an AGENT runs this, Step 3 acts as IoC prompt injection:
#   the agent reads stdout, recognizes <spawn subagent> as its role, takes over.
#
# This pattern was NOT pre-designed. The first subagent wrote echo as a prompt
# channel without being told. The replay subagent understood without a schema.
#   Pattern: Shell stdout as Agent Prompt Injection (see cortex/wiki for details)
#   Verified: 2026-05-17 — independent replay agent PASS, same output structure.
#
# Run this as: bash reproduce.sh
# (agent must execute Step 3 manually — use frontend-design skill in $WORKDIR)
# ═══════════════════════════════════════════════════════════════════════════
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
