#!/bin/bash
# BDD: curator find — bare name to full path lookup — reproduce.sh IoC pattern
# Date: 2026-05-20
# Package: lythoskill-curator
# ADR: ADR-20260519225831495
# ═══════════════════════════════════════════════════════════════════════════
# AGENT-ONLY REPLAY — Step 3 is IoC handoff, not executable shell.
#   bash reproduce.sh
# ═══════════════════════════════════════════════════════════════════════════
set -e

TEST_DIR="/tmp/curator-find-bdd-$(date +%Y%m%d-%H%M%S)"
COLD_POOL="$TEST_DIR/cold-pool"
INDEX_DIR="$TEST_DIR/curator-index"
PROJECT="/Users/chariots/Downloads/lythoskill-main"

echo "=== Step 1: Create directory structure ==="
mkdir -p "$COLD_POOL/localhost/me/test-skill" "$INDEX_DIR"

cat > "$COLD_POOL/localhost/me/test-skill/SKILL.md" << 'EOF'
---
name: test-skill
version: 1.0.0
type: standard
description: A test skill for curator find BDD verification.
---
# test-skill
A fixture skill used to verify curator find HIT path.
EOF

echo "=== Step 2: Build curator index ==="
bun "$PROJECT/packages/lythoskill-curator/src/cli.ts" "$COLD_POOL" --output "$INDEX_DIR"

echo ""
echo "=== Step 3: Agent verifies curator find HIT + MISS (IoC handoff) ==="
echo "  <spawn subagent>"
echo ""
echo "  IoContract: all commands idempotent. Exit 0 = success."
echo ""
echo "  You have two skill names to look up:"
echo ""
echo "  SKILL A — test-skill (should HIT):"
echo "    bun $PROJECT/packages/lythoskill-curator/src/cli.ts find test-skill --db $INDEX_DIR/catalog.db"
echo "    Verify the output contains:"
echo "      1. name: test-skill"
echo "      2. path: localhost/me/test-skill"
echo "      3. 'bunx @lythos/skill-deck add test-skill' or equivalent deck add command"
echo ""
echo "  SKILL B — fullstack-dev (will MISS):"
echo "    bun $PROJECT/packages/lythoskill-curator/src/cli.ts find fullstack-dev --db $INDEX_DIR/catalog.db"
echo "    Verify the output:"
echo "      4. Contains 'not found'"
echo "      5. Contains 'WebSearch' guidance"
echo ""
echo "    Then WebSearch for the real skill:"
echo "      6. WebSearch for 'fullstack-dev skill SKILL.md github'"
echo "      7. Identify the repo (e.g., MiniMax-AI/skills)"
echo "      8. Report the full path + curator add command + deck add command"
echo ""
echo "  MANDATORY: write decision-log.jsonl to CWD ($TEST_DIR)"
echo "  Each line: {\"step\":\"...\",\"decision\":\"...\",\"reason\":\"...\",\"ts\":\"...\"}"
echo "  Minimum 4 entries covering: HIT check, MISS check, WebSearch, path resolution"

echo ""
echo "=== Step 4: Judge verification (criteria in judge.md) ==="
echo "  Verify against $(dirname "$0")/judge.md"
echo "  Write judge-verdict.json to $TEST_DIR"

echo ""
echo "=== Done ==="
echo "  Test dir: $TEST_DIR"
echo "  Judge criteria: $(dirname "$0")/judge.md"
