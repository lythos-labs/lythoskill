#!/usr/bin/env bash
set -euo pipefail

WORKDIR=$(mktemp -d /tmp/deepseek-smoke-XXXXXXXX)
trap "rm -rf $WORKDIR" EXIT

cd "$WORKDIR"

echo "📋 DeepSeek smoke test BDD"
echo "Task: Verify DeepSeek agent can use deck skills"

echo ""
echo "<spawn subagent to execute>"
echo "Install a simple skill and verify agent can read it"
echo "Write decision-log.jsonl to $WORKDIR/"
