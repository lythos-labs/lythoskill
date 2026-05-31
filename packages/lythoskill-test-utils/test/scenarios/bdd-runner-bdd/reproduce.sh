#!/usr/bin/env bash
set -euo pipefail

WORKDIR=$(mktemp -d /tmp/bdd-runner-XXXXXXXX)
trap "rm -rf $WORKDIR" EXIT

cd "$WORKDIR"

echo "📋 BDD runner tracer bullet"
echo "Task: Verify BDD runner can execute a simple scenario"

echo ""
echo "<spawn subagent to execute>"
echo "Run a minimal BDD scenario and verify output"
echo "Write decision-log.jsonl to $WORKDIR/"
