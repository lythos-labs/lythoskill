#!/usr/bin/env bash
set -euo pipefail

WORKDIR=$(mktemp -d /tmp/arena-docx-output-XXXXXXXX)
trap "rm -rf $WORKDIR" EXIT

cd "$WORKDIR"

# Step 1: deterministic scaffold
echo "📋 Arena docx output BDD"
echo "Task: Produce a .docx cookie recipe using documents deck"

# Step 2: IoC handoff
echo ""
echo "<spawn subagent to execute>"
echo "Run: bunx @lythos/skill-arena@latest single \\"
echo "  --brief 'Write a chocolate chip cookie recipe as a formatted .docx' \\"
echo "  --deck examples/decks/documents.toml \\"
echo "  --out ./output"
echo ""
echo "Verify: chocolate-chip-cookies.docx exists and is valid"
echo "Write decision-log.jsonl to $WORKDIR/"
