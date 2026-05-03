#!/usr/bin/env bash
# judge.sh <run-dir>
# Verify the agent's introspection output matches the deck manifest.
set -euo pipefail

RUN_DIR="${1:?run-dir required}"
WORK="$RUN_DIR/work"
OUTPUT="$RUN_DIR/OUTPUT.json"
PROBLEM_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SEED_TOML="$PROBLEM_DIR/seed/skill-deck.toml"

fails=0
fail() { echo "  ✗ $1"; fails=$((fails + 1)); }
ok()   { echo "  ✓ $1"; }

echo "Checking acceptance criteria for deck-self-introspect-skills:"

# 1. OUTPUT.json must exist and be non-empty
if [[ -s "$OUTPUT" ]]; then
  ok "OUTPUT.json exists and is non-empty"
else
  fail "OUTPUT.json missing or empty"
  echo
  echo "$fails check(s) failed."
  exit 1
fi

# 2. OUTPUT.json parses + is an array of {alias, description} objects.
#    NOTE: bun -e swallows uncaught throws (exits 0), so JSON.parse must be
#    wrapped in try/catch with explicit process.exit(2). All structural
#    failures call process.exit(2); success prints sorted aliases on stdout.
REPORTED_ALIASES="$(
  bun -e '
    const fs = require("fs");
    let data;
    try {
      const raw = fs.readFileSync(process.argv[1], "utf-8");
      data = JSON.parse(raw);
    } catch (e) {
      console.error("parse failed: " + e.message);
      process.exit(2);
    }
    if (!Array.isArray(data)) { console.error("not an array"); process.exit(2); }
    for (const item of data) {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        console.error("element not an object"); process.exit(2);
      }
      if (typeof item.alias !== "string" || typeof item.description !== "string") {
        console.error("element missing alias/description string"); process.exit(2);
      }
    }
    console.log(data.map(x => x.alias).sort().join("\n"));
  ' "$OUTPUT" 2>&1
)" || {
  fail "OUTPUT.json invalid: $REPORTED_ALIASES"
  echo
  echo "$fails check(s) failed."
  exit 1
}
ok "OUTPUT.json is a valid array of {alias, description} objects"

# 3. Expected aliases come from skill-deck.toml [tool.skills.<alias>] keys
EXPECTED_ALIASES="$(grep -E '^\[tool\.skills\.[^]]+\][[:space:]]*$' "$SEED_TOML" \
  | sed -E 's/^\[tool\.skills\.(.+)\][[:space:]]*$/\1/' \
  | sort)"

if [[ "$REPORTED_ALIASES" == "$EXPECTED_ALIASES" ]]; then
  ok "alias set matches deck manifest ($(echo "$REPORTED_ALIASES" | tr '\n' ',' | sed 's/,$//'))"
else
  fail "alias set mismatch"
  echo "    expected:"
  echo "$EXPECTED_ALIASES" | sed 's/^/      /'
  echo "    reported:"
  echo "$REPORTED_ALIASES" | sed 's/^/      /'
fi

# 4. skill-deck.toml unchanged (agent must not edit the manifest)
SEED_HASH="$(shasum "$SEED_TOML" | awk '{print $1}')"
WORK_HASH="$(shasum "$WORK/skill-deck.toml" 2>/dev/null | awk '{print $1}' || echo "")"
if [[ -n "$WORK_HASH" && "$SEED_HASH" == "$WORK_HASH" ]]; then
  ok "skill-deck.toml unchanged"
else
  fail "skill-deck.toml was modified or missing"
fi

echo
if [[ $fails -eq 0 ]]; then
  echo "All checks passed."
  exit 0
else
  echo "$fails check(s) failed."
  exit 1
fi
