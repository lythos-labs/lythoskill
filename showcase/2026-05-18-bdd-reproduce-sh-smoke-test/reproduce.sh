#!/bin/bash
# Arena single-task smoke test — reproduce.sh IoC pattern
# Migrated from: arena-single-task.agent.md
# Date: 2026-05-18
#
# ═══════════════════════════════════════════════════════════════════════════
# AGENT-ONLY REPLAY — human execution is intentionally incomplete.
#
#   bash reproduce.sh
#
# Step 3 is NOT a shell command. It prints a contextual instruction to stdout.
# When a HUMAN runs this, Step 3 is useless — they see an echo and nothing.
# When an AGENT runs this, Step 3 acts as IoC prompt injection:
#   the agent reads stdout, recognizes <spawn subagent> as its role, takes over.
#
# Pattern: Shell stdout as Agent Prompt Injection
#   → wiki: shell-stdout-as-agent-prompt-injection.md
#   → wiki: control-transfer-protocol-cli-agent-boundary-as-interrupt-vector-table.md
#
# Judge criteria are in judge.md — NOT embedded in the task prompt.
# The task agent never sees the scoring rubric.
# ═══════════════════════════════════════════════════════════════════════════
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKDIR="/tmp/reproduce-bdd-demo-$(date +%Y%m%d-%H%M%S)"
DECK="$SCRIPT_DIR/test-deck.toml"

echo "=== Step 1: Create minimal test deck ==="
cat > "$DECK" << 'DECKEOF'
[deck]
max_cards = 3
cold_pool = "~/.agents/skill-repos"
working_set = ".claude/skills"
# Minimal deck — no extra skills to isolate the agent's native TypeScript ability.
DECKEOF

echo "=== Step 2: prepare-workdir (arena scaffold) ==="
bunx @lythos/skill-arena@0.14.3 prepare-workdir \
  --deck "$DECK" \
  --out "$WORKDIR" \
  --brief "Create greet.ts + greet.test.ts + run bun test → write result.txt"

echo ""
echo "=== Step 3: Agent executes task in workdir (IoC handoff) ==="
echo "  cd $WORKDIR"
echo "  <spawn subagent>"
echo ""
echo "  Task:"
echo "    1. Create greet.ts exporting function greet(name: string): string"
echo '       → returns `Hello, ${name}!`'
echo "    2. Create greet.test.ts with 2 bun:test cases:"
echo "       - greet('World') → 'Hello, World!'"
echo "       - greet('') → 'Hello, !'"
echo "    3. Run 'bun test' and write pass/fail summary to result.txt"
echo "    4. MANDATORY: write decision-log.jsonl to CWD"
echo "       Each line: {\"step\":\"...\",\"decision\":\"...\",\"reason\":\"...\",\"ts\":\"...\"}"
echo ""

echo "=== Step 4: Judge verification (criteria in judge.md) ==="
echo "  After agent completes, verify against $SCRIPT_DIR/judge.md"
echo "  Write judge-verdict.json to $WORKDIR"

echo ""
echo "=== Step 5: archive ==="
bunx @lythos/skill-arena@0.14.3 archive \
  --from "$WORKDIR" \
  --to "$SCRIPT_DIR/run-output" \
  --sides side-a \
  --report "$WORKDIR/report.md" 2>/dev/null || echo "  (archive skipped — run after agent completes)"

echo ""
echo "=== Done ==="
echo "  Agent output: $WORKDIR"
echo "  Judge criteria: $SCRIPT_DIR/judge.md"
