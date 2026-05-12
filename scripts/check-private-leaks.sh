#!/usr/bin/env bash
# check-private-leaks.sh — block commit if values stored in .private/
# leak into staged content.
#
# Mechanism:
#   1. Walk .private/ for *.env files (shell-style KEY=VALUE).
#   2. Extract the VALUE side of each line.
#   3. Filter out short / generic values (≤4 chars, all-alpha, common words)
#      to avoid false positives.
#   4. Grep the staged diff for any remaining secret.
#   5. Exit 1 with a clear message if any match.
#
# Caller: .husky/pre-commit section 0.8.

set -euo pipefail

# No .private/ → nothing to guard.
if [ ! -d .private ]; then
  exit 0
fi

# Collect candidate secrets from .private/*.env files.
SECRETS=$(find .private -maxdepth 2 -name '*.env' -type f -exec cat {} \; 2>/dev/null \
  | grep -E '^[[:space:]]*(export[[:space:]]+)?[A-Za-z_][A-Za-z0-9_]*=' \
  | sed -E 's/^[[:space:]]*(export[[:space:]]+)?[A-Za-z_][A-Za-z0-9_]*=//' \
  | sed -E 's/^"(.*)"$/\1/' \
  | sed -E "s/^'(.*)'$/\1/" \
  | sort -u)

if [ -z "$SECRETS" ]; then
  exit 0
fi

# Get staged content (added/modified files only).
STAGED_DIFF=$(git diff --cached --diff-filter=ACM -- ':!.private/' 2>/dev/null || true)

if [ -z "$STAGED_DIFF" ]; then
  exit 0
fi

FOUND_LEAKS=()
while IFS= read -r secret; do
  # Skip empty / too short to be a meaningful secret.
  [ -z "$secret" ] && continue
  [ "${#secret}" -lt 5 ] && continue
  # Skip generic / wordlike values (alphabetic only).
  if echo "$secret" | grep -qE '^[A-Za-z]+$'; then continue; fi
  # Match in staged diff (fixed-string, suppress regex interpretation).
  if echo "$STAGED_DIFF" | grep -qF "$secret"; then
    FOUND_LEAKS+=("$secret")
  fi
done <<< "$SECRETS"

if [ "${#FOUND_LEAKS[@]}" -gt 0 ]; then
  echo ""
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║  ❌ PRIVATE SECRET LEAK IN STAGED CONTENT                   ║"
  echo "╠══════════════════════════════════════════════════════════════╣"
  echo "║  One or more values from .private/*.env appear in your      ║"
  echo "║  staged diff. .private/ is gitignored for a reason —        ║"
  echo "║  port numbers, tokens, and endpoints stay local.            ║"
  echo "╠══════════════════════════════════════════════════════════════╣"
  for leak in "${FOUND_LEAKS[@]}"; do
    # Print masked version: first 2 and last 2 chars only.
    if [ "${#leak}" -gt 8 ]; then
      masked="${leak:0:2}...${leak: -2}"
    else
      masked="(redacted)"
    fi
    printf "║    leaked: %-50s ║\n" "$masked"
  done
  echo "╠══════════════════════════════════════════════════════════════╣"
  echo "║  Fix: replace the literal value in your staged files with   ║"
  echo "║  a placeholder like \"<from .private/proxy.env>\" or with     ║"
  echo "║  a shell var reference \$LYTHOS_SOCKS_PROXY.                 ║"
  echo "║  Then re-stage and commit.                                  ║"
  echo "╚══════════════════════════════════════════════════════════════╝"
  echo ""
  exit 1
fi

exit 0
