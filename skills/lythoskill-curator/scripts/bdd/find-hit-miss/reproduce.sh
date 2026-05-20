#!/bin/bash
# BDD: curator find — HIT real skill + MISS real skill (discovery path)
# Date: 2026-05-20
# Package: lythoskill-curator
# ═══════════════════════════════════════════════════════════════════════════
# AGENT-ONLY REPLAY — Step 3 is IoC handoff, not executable shell.
#   bash reproduce.sh
# ═══════════════════════════════════════════════════════════════════════════
set -e

TEST_DIR="/tmp/curator-find-bdd-$(date +%Y%m%d-%H%M%S)"
COLD_POOL="$TEST_DIR/cold-pool"
INDEX_DIR="$TEST_DIR/curator-index"
REAL_POOL="${HOME}/.agents/skill-repos"
CLI="bun $(dirname "$0")/../../../src/cli.ts"

echo "=== Step 1: Copy real skills into temp cold pool ==="
mkdir -p "$COLD_POOL/localhost/me" "$INDEX_DIR"

# Copy 3 real skills from the real cold pool
cp -r "$REAL_POOL/github.com/lijigang/ljg-skills/skills/ljg-think" "$COLD_POOL/localhost/me/"
cp -r "$REAL_POOL/github.com/anthropics/skills/skills/pdf"            "$COLD_POOL/localhost/me/"
cp -r "$REAL_POOL/github.com/JimLiu/baoyu-skills/skills/baoyu-translate" "$COLD_POOL/localhost/me/"

echo "  Copied: ljg-think, pdf, baoyu-translate"

echo ""
echo "=== Step 2: Build curator index ==="
bun "$(dirname "$0")/../../../src/cli.ts" "$COLD_POOL" --output "$INDEX_DIR"

echo ""
echo "=== Step 3: Agent verifies curator find HIT + MISS (IoC handoff) ==="
echo "  <spawn subagent>"
echo ""
echo "  IoContract: all commands idempotent. Exit 0 = success."
echo ""
echo "  SKILL A — ljg-think (HIT: exists in subset):"
echo "    $CLI find ljg-think --db $INDEX_DIR/catalog.db"
echo "    Verify:"
echo "      1. Shows name: ljg-think"
echo "      2. Shows path containing ljg-think"
echo "      3. Shows deck add command (one-liner + TOML snippet)"
echo ""
echo "  SKILL B — fullstack-dev (MISS: real skill, not in this subset):"
echo "    $CLI find fullstack-dev --db $INDEX_DIR/catalog.db"
echo "    Verify:"
echo "      4. Shows 'not found' or similar"
echo "      5. Shows search guidance (gh search code / WebSearch)"
echo ""
echo "    Then DISCOVER the real skill:"
echo "      6. WebSearch for 'fullstack-dev skill SKILL.md github'"
echo "      7. Identify the repo: MiniMax-AI/skills"
echo "      8. Report: curator add command + deck add command for the discovered skill"
echo ""
echo "  MANDATORY: write decision-log.jsonl to $TEST_DIR"
echo "  Each line: {\"step\":\"...\",\"decision\":\"...\",\"reason\":\"...\",\"ts\":\"...\"}"
echo "  Minimum 5 entries: HIT check, MISS check, search guidance, WebSearch discovery, path resolution"
echo "  Then write judge-verdict.json to $TEST_DIR"

echo ""
echo "=== Step 4: Judge criteria ==="
echo "  See judge.md in this directory"

echo ""
echo "=== Done ==="
echo "  Test dir: $TEST_DIR"
echo "  Cold pool: $COLD_POOL"
echo "  Index: $INDEX_DIR/catalog.db"
