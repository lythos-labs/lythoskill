#!/usr/bin/env bash
set -euo pipefail

WORKDIR=$(mktemp -d /tmp/skills-introspection-XXXXXXXX)
trap "rm -rf $WORKDIR" EXIT

cd "$WORKDIR"

echo "📋 Skills introspection BDD"
echo "Task: Agent introspects deck skills via checkpoint"

echo ""
echo "<spawn subagent to execute>"
echo "Create deck with skills, link, and verify agent can list them"
echo "Write decision-log.jsonl to $WORKDIR/"
