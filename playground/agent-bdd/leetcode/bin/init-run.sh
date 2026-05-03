#!/usr/bin/env bash
# init-run.sh <problem-id>
# Initialize an isolated sandbox for an Agent BDD leetcode problem,
# print the path + the recommended `claude -p` command.
set -euo pipefail

HARNESS_BIN="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HARNESS_ROOT="$(cd "$HARNESS_BIN/.." && pwd)"
PROBLEMS_DIR="$HARNESS_ROOT/problems"
RUNS_DIR="$HARNESS_ROOT/runs"

usage() {
  echo "Usage: $0 <problem-id>" >&2
  echo >&2
  echo "Available problems:" >&2
  if [[ -d "$PROBLEMS_DIR" ]]; then
    ls "$PROBLEMS_DIR" 2>/dev/null | sed 's/^/  /' >&2
  else
    echo "  (none — $PROBLEMS_DIR missing)" >&2
  fi
  exit 64
}

[[ $# -eq 1 ]] || usage

PROBLEM_ID="$1"
PROBLEM_DIR="$PROBLEMS_DIR/$PROBLEM_ID"

[[ -d "$PROBLEM_DIR" ]]              || { echo "Error: problem '$PROBLEM_ID' not found at $PROBLEM_DIR" >&2; usage; }
[[ -f "$PROBLEM_DIR/brief.md" ]]     || { echo "Error: missing $PROBLEM_DIR/brief.md" >&2; exit 65; }
[[ -d "$PROBLEM_DIR/seed" ]]         || { echo "Error: missing $PROBLEM_DIR/seed/" >&2; exit 65; }
[[ -x "$PROBLEM_DIR/judge.sh" ]]     || { echo "Error: $PROBLEM_DIR/judge.sh missing or not executable" >&2; exit 65; }

TS="$(date +%Y%m%d-%H%M%S)"
RUN_ID="${PROBLEM_ID}-${TS}"
RUN_DIR="$RUNS_DIR/$RUN_ID"

mkdir -p "$RUN_DIR/work"
cp -R "$PROBLEM_DIR/seed/." "$RUN_DIR/work/"
cp "$PROBLEM_DIR/brief.md" "$RUN_DIR/brief.md"
echo "$PROBLEM_ID" > "$RUN_DIR/.problem-id"

# Optional pre-agent hook: runs inside work/ before the agent receives the
# sandbox. Use this to pre-install state (e.g., `deck link`) so the brief
# can focus on what the agent should *do*, not on setup.
PRE_HOOK="$PROBLEM_DIR/pre-agent.sh"
if [[ -x "$PRE_HOOK" ]]; then
  echo "Running pre-agent hook: $PRE_HOOK" >&2
  (cd "$RUN_DIR/work" && PATH="$HARNESS_BIN:$PATH" "$PRE_HOOK") >&2
  echo "Pre-agent hook done." >&2
  echo >&2
fi

cat <<EOF
Sandbox initialized.

  Problem:   $PROBLEM_ID
  Run ID:    $RUN_ID
  Run dir:   $RUN_DIR
  Work dir:  $RUN_DIR/work
  Brief:     $RUN_DIR/brief.md
  Outputs:
    $RUN_DIR/claude.log  (claude's stdout/stderr, via redirect)
    $RUN_DIR/<see brief> (agent's deliverable, written via Write tool)
  Verdict:   $RUN_DIR/verdict.txt (judge writes here)

Run the agent (non-interactive, copy-paste exactly):

  cd "$RUN_DIR/work"
  PATH="$HARNESS_BIN:\$PATH" claude -p \\
    --dangerously-skip-permissions \\
    --add-dir . \\
    "\$(cat ../brief.md)" \\
    > ../claude.log 2>&1

Then judge:

  "$HARNESS_BIN/judge.sh" "$RUN_DIR"
EOF
