#!/usr/bin/env bash
# judge.sh <run-dir>
# Dispatch to the problem-specific judge, write verdict.txt, exit 0/1.
set -euo pipefail

HARNESS_BIN="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HARNESS_ROOT="$(cd "$HARNESS_BIN/.." && pwd)"

usage() {
  echo "Usage: $0 <run-dir>" >&2
  exit 64
}

[[ $# -eq 1 ]] || usage
RUN_DIR="$1"
[[ -d "$RUN_DIR" ]]                 || { echo "Error: run dir not found: $RUN_DIR" >&2; exit 65; }
[[ -f "$RUN_DIR/.problem-id" ]]     || { echo "Error: missing $RUN_DIR/.problem-id (use init-run.sh)" >&2; exit 65; }

PROBLEM_ID="$(cat "$RUN_DIR/.problem-id")"
JUDGE="$HARNESS_ROOT/problems/$PROBLEM_ID/judge.sh"
[[ -x "$JUDGE" ]]                   || { echo "Error: judge not found or not executable: $JUDGE" >&2; exit 65; }

VERDICT_FILE="$RUN_DIR/verdict.txt"

# Run judge, capture both stdout/stderr to verdict.txt and console
set +e
"$JUDGE" "$RUN_DIR" 2>&1 | tee "$VERDICT_FILE"
rc="${PIPESTATUS[0]}"
set -e

echo
if [[ "$rc" -eq 0 ]]; then
  echo "PASS — $RUN_DIR" | tee -a "$VERDICT_FILE"
else
  echo "FAIL — $RUN_DIR" | tee -a "$VERDICT_FILE"
fi
exit "$rc"
