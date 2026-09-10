#!/usr/bin/env bash
set -euo pipefail

# Re-run the ZK re-trial's adversarial cases against the CURRENT tree.
#
# The committed adversarial.test.ts is preserved verbatim, and it imports the module
# names that were correct at c8ebcc76 (`adapter-policy.ts` / `adapter-registry.ts`)
# plus an absolute repo path. This script copies it to a temp dir and rewrites those
# three things there — the committed evidence is never mutated (ADR-20260910113730375,
# evidence hygiene: don't retro-edit the artifact you are reasoning about).
#
# Expected: 9 pass / 1 fail. The failure (ADV-7) is a known, measured red case that also
# fails against c8ebcc76 itself — see README.md.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SRC="$SCRIPT_DIR/adversarial.test.ts"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

if ! command -v bun >/dev/null 2>&1; then
  echo "Error: bun not found. Install Bun first: https://bun.sh" >&2
  exit 1
fi

# 1. absolute repo root → this working copy  2. pre-rename module names → current ones
sed -e "s|/Users/chariots/Downloads/lythoskill-main|$REPO_ROOT|g" \
    -e 's|adapter-policy\.ts|layout-policy.ts|g' \
    -e 's|adapter-registry\.ts|cli-layout.ts|g' \
    "$SRC" > "$TMP/adversarial.test.ts"

echo "=== ZK adversarial re-run (ADV-1…ADV-10) against $REPO_ROOT ==="
# The suite is expected to have one known-red case; report the count rather than
# swallowing it, so a future change that fixes or breaks another case is visible.
set +e
bun test "$TMP/adversarial.test.ts"
STATUS=$?
set -e

echo ""
echo "exit=$STATUS (expected non-zero: ADV-7 is known-red, see README.md)"
