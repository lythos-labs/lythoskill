#!/bin/bash
# BDD: curator find — repo URL exploration — reproduce.sh IoC pattern
# Scenario: "I know the repo URL, what's inside?"
# Date: 2026-05-20
# Package: lythoskill-curator
# ═══════════════════════════════════════════════════════════════════════════
# AGENT-ONLY REPLAY — Step 3 is IoC handoff, not executable shell.
#   bash reproduce.sh
# ═══════════════════════════════════════════════════════════════════════════
set -e

TEST_DIR="/tmp/curator-find-repo-bdd-$(date +%Y%m%d-%H%M%S)"
PROJECT="/Users/chariots/Downloads/lythoskill-main"

echo "=== Step 1-2: No setup needed (uses real GitHub API) ==="
echo "  Test dir: $TEST_DIR"

echo ""
echo "=== Step 3: Agent verifies repo URL exploration (IoC handoff) ==="
echo "  <spawn subagent>"
echo ""
echo "  IoContract: all commands idempotent. Exit 0 = success."
echo ""
echo "  SCENARIO: Someone shared a GitHub repo on social media:"
echo "    https://github.com/lijigang/ljg-skills"
echo "  You do NOT know what skills are inside this repo."
echo ""
echo "  Follow the Repo Exploration pattern:"
echo ""
echo "  PHASE 1 — Peek into the repo without cloning:"
echo "    1. gh api repos/lijigang/ljg-skills/contents --jq '.[].name'"
echo "    2. Find the skills directory (should show 'skills/')"
echo "    3. gh api repos/lijigang/ljg-skills/contents/skills --jq '.[].name'"
echo "    4. Count and list all skill names"
echo ""
echo "  PHASE 2 — Sample frontmatter from a few skills:"
echo "    5. Pick 2-3 interesting skill names"
echo "    6. gh api repos/lijigang/ljg-skills/contents/skills/<name>/SKILL.md \\
          --jq '.content' | base64 -d | head -8"
echo "    7. Report name + description for each"
echo ""
echo "  PHASE 3 — Summarize:"
echo "    8. Total skill count"
echo "    9. Recommended entry points (most interesting skills)"
echo "   10. curator add command to add the entire repo"
echo ""
echo "  gh is already authed (token at $PROJECT/.github-token):"
echo "    export GH_TOKEN=\$(cat $PROJECT/.github-token)"
echo ""
echo "  MANDATORY: write decision-log.jsonl to CWD ($TEST_DIR)"
echo "  Each line: {\"step\":\"...\",\"decision\":\"...\",\"reason\":\"...\",\"ts\":\"...\"}"
echo "  Minimum 3 entries: peek, list, sample frontmatter"

echo ""
echo "=== Step 4: Judge verification (criteria in judge.md) ==="
echo "  Verify against $(dirname "$0")/judge.md"

echo ""
echo "=== Done ==="
