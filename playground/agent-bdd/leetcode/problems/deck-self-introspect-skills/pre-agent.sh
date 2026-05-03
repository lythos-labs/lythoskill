#!/usr/bin/env bash
# pre-agent.sh — runs in work/ before the agent receives the sandbox.
# For introspection problem: pre-link the deck so .claude/skills/ is
# already populated. The agent's job is to *enumerate*, not install.
set -euo pipefail

# `deck` is on PATH because init-run.sh prepends $HARNESS_BIN.
deck link
echo "Pre-linked .claude/skills/:"
ls -la .claude/skills/
