#!/bin/bash
# BDD: curator find — fuzzy person/org search — reproduce.sh IoC pattern
# Scenario: "I know the person, not the skill name"
# Date: 2026-05-20
# Package: lythoskill-curator
# ═══════════════════════════════════════════════════════════════════════════
# AGENT-ONLY REPLAY — Step 3 is IoC handoff, not executable shell.
#   bash reproduce.sh
# ═══════════════════════════════════════════════════════════════════════════
set -e

TEST_DIR="/tmp/curator-find-fuzzy-bdd-$(date +%Y%m%d-%H%M%S)"
PROJECT="/Users/chariots/Downloads/lythoskill-main"

echo "=== Step 1-2: No setup needed (uses real GitHub search) ==="
echo "  Test dir: $TEST_DIR"

echo ""
echo "=== Step 3: Agent verifies fuzzy person/org search (IoC handoff) ==="
echo "  <spawn subagent>"
echo ""
echo "  IoContract: all commands idempotent. Exit 0 = success."
echo ""
echo "  SCENARIO: You only know a person's name '归藏师傅' (Master Guizang)."
echo "  You do NOT know their exact skill names or GitHub repos."
echo ""
echo "  Follow the Discovery SOP for fuzzy search:"
echo ""
echo "  PHASE 1 — WebSearch for candidates:"
echo "    1. WebSearch for '归藏师傅 skill github' or similar"
echo "    2. Identify the GitHub username (should find op7418)"
echo "    3. Identify candidate repos"
echo ""
echo "  PHASE 2 — gh code search for precise paths:"
echo "    4. gh search code '归藏' --filename 'SKILL.md' OR"
echo "       gh search code 'guizang' --filename 'SKILL.md'"
echo "    5. Find SKILL.md files, extract exact repo + path"
echo ""
echo "  PHASE 3 — Report findings:"
echo "    6. List all skill repos found with star counts"
echo "    7. For each, report the full locator path"
echo "    8. Identify the flagship skill (guizang-ppt-skill, 10K+ stars)"
echo ""
echo "  The CLI path for curator is:"
echo "    bun $PROJECT/packages/lythoskill-curator/src/cli.ts"
echo "  gh is already authed (token at $PROJECT/.github-token):"
echo "    export GH_TOKEN=\$(cat $PROJECT/.github-token)"
echo ""
echo "  MANDATORY: write decision-log.jsonl to CWD ($TEST_DIR)"
echo "  Each line: {\"step\":\"...\",\"decision\":\"...\",\"reason\":\"...\",\"ts\":\"...\"}"
echo "  Minimum 3 entries: WebSearch, gh code search, path resolution"

echo ""
echo "=== Step 4: Judge verification (criteria in judge.md) ==="
echo "  Verify against $(dirname "$0")/judge.md"

echo ""
echo "=== Done ==="
