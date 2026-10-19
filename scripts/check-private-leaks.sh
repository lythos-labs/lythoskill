#!/usr/bin/env bash
# check-private-leaks.sh — block commit if private material leaks into staged content.
#
# Two phases, one guard:
#   Phase 1 (values): secrets stored in .private/*.env must not appear in the
#     staged diff. (Original mechanism, unchanged except the pipefail fix.)
#   Phase 2 (patterns): a gitignore-style pattern list — listed = forbidden in
#     checked surfaces. Two pattern sources:
#       - Built-in baseline: live token shapes only (github_pat_/gh[pousr]_/npm_
#         with entropy suffix). These are unambiguous — a match is a match.
#       - .private/leak-patterns (one per line, '#' comments; absent = skipped
#         silently per the .private/ convention): YOUR machine's personal
#         markers — key names, YOUR home path (e.g. /Users/<you>). Machine
#         paths are deliberately NOT built in: this repo's test fixtures
#         legitimately use generic paths (/home/user, /Users/alice), and a
#         blunt /Users/ baseline would false-positive them into oblivion
#         (a check that misfires gets learned around — worse than no check).
#
# Scope rules:
#   - Default (staged) mode: scans staged content of added/copied/modified
#     files, exempting historical-record and fixture paths where quoting
#     literals is sanctioned (cortex/adr|tasks|wiki|INDEX.md, daily/, drafts/,
#     archived-patches/, showcase/, test-results/, *.bak*, *.test.ts, committed
#     run artifacts under packages/*/runs/ and */run-output/).
#   - --all (audit): scans committed surfaces in the working tree instead of
#     the staged diff, same exemptions + exit code. Deterministic repeatability
#     gate behind the positioning-leak sweep (TASK-20261019131118492).
#
# Caller: .husky/pre-commit section 0.8.
# Tests: scripts/check-private-leaks.test.ts (negative + positive fixtures).
# Env overrides (tests only): CHECK_PRIVATE_ROOT, CHECK_PRIVATE_PRIVATE_DIR.

set -euo pipefail

ROOT="${CHECK_PRIVATE_ROOT:-.}"
PRIVATE_DIR="${CHECK_PRIVATE_PRIVATE_DIR:-$ROOT/.private}"
AUDIT_ALL=0
if [ "${1:-}" = "--all" ]; then
  AUDIT_ALL=1
fi

# ── Exemptions: historical records, generated indexes, fixtures, run artifacts ──
is_exempt() {
  case "$1" in
    cortex/adr/*|cortex/tasks/*|cortex/wiki/*|cortex/INDEX.md|cortex/epics/*|cortex/adr.md \
      |daily/*|drafts/*|archived-patches/*|showcase/*|test-results/* \
      |*.bak|*.bak.*|*.test.ts \
      |packages/*/runs/*|*/run-output/* \
      |scripts/check-private-leaks.sh)
      return 0 ;;
    *) return 1 ;;
  esac
}

PATTERNS_FILE="$PRIVATE_DIR/leak-patterns"
PATTERN_HITS=()

scan_content() { # $1 = label, $2 = file to grep
  local label="$1" src="$2" line pattern
  # Built-in baseline: live token shapes (unambiguous).
  while IFS= read -r line; do
    PATTERN_HITS+=("$label: $line   [builtin: token shape]")
  done < <(grep -nE 'github_pat_[A-Za-z0-9_]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|npm_[A-Za-z0-9]{20,}' "$src" 2>/dev/null || true)
  # Personal pattern list (gitignore-style: listed = forbidden).
  if [ -f "$PATTERNS_FILE" ]; then
    while IFS= read -r pattern; do
      case "$pattern" in ''|\#*) continue ;; esac
      while IFS= read -r line; do
        PATTERN_HITS+=("$label: $line   [pattern: $pattern]")
      done < <(grep -nF "$pattern" "$src" 2>/dev/null || true)
    done < "$PATTERNS_FILE"
  fi
}

TMPDIR_SCAN="$(mktemp -d)"
trap 'rm -rf "$TMPDIR_SCAN"' EXIT

# ── Phase 2: pattern scan ──
if [ "$AUDIT_ALL" = 1 ]; then
  while IFS= read -r f; do
    if is_exempt "$f"; then continue; fi
    case "$f" in node_modules/*|*.png|*.jpg|*.ico|.git/*) continue ;; esac
    [ -f "$ROOT/$f" ] || continue
    scan_content "$f" "$ROOT/$f"
  done < <(cd "$ROOT" && git ls-files 2>/dev/null || true)
else
  while IFS= read -r f; do
    if is_exempt "$f"; then continue; fi
    content="$TMPDIR_SCAN/content"
    if ! git -C "$ROOT" show ":$f" > "$content" 2>/dev/null; then
      [ -f "$ROOT/$f" ] && cp "$ROOT/$f" "$content" || continue
    fi
    scan_content "$f" "$content"
  done < <(git -C "$ROOT" diff --cached --name-only --diff-filter=ACM -- ':!.private/' 2>/dev/null || true)
fi

# ── Phase 1: secret values from .private/*.env (original mechanism) ──
FOUND_VALUE_LEAKS=()
if [ -d "$PRIVATE_DIR" ]; then
  # `|| true`: a .private/ with no *.env files makes grep exit 1 → pipefail
  # would kill the script before the report phase (latent in the original).
  SECRETS=$(find "$PRIVATE_DIR" -maxdepth 2 -name '*.env' -type f -exec cat {} \; 2>/dev/null \
    | grep -E '^[[:space:]]*(export[[:space:]]+)?[A-Za-z_][A-Za-z0-9_]*=' \
    | sed -E 's/^[[:space:]]*(export[[:space:]]+)?[A-Za-z_][A-Za-z0-9_]*=//' \
    | sed -E 's/^"(.*)"$/\1/' \
    | sed -E "s/^'(.*)'$/\1/" \
    | sort -u || true)

  if [ -n "$SECRETS" ]; then
    STAGED_DIFF=$(git -C "$ROOT" diff --cached --diff-filter=ACM -- ':!.private/' 2>/dev/null || true)
    if [ -n "$STAGED_DIFF" ]; then
      while IFS= read -r secret; do
        [ -z "$secret" ] && continue
        [ "${#secret}" -lt 5 ] && continue
        if echo "$secret" | grep -qE '^[A-Za-z]+$'; then continue; fi
        if echo "$STAGED_DIFF" | grep -qF "$secret"; then
          FOUND_VALUE_LEAKS+=("$secret")
        fi
      done <<< "$SECRETS"
    fi
  fi
fi

# ── Report ──
if [ "${#PATTERN_HITS[@]}" -eq 0 ] && [ "${#FOUND_VALUE_LEAKS[@]}" -eq 0 ]; then
  exit 0
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
if [ "${#PATTERN_HITS[@]}" -gt 0 ]; then
  echo "║  ❌ PRIVATE PATTERN LEAK IN COMMITTED CONTENT               ║"
  echo "╠══════════════════════════════════════════════════════════════╣"
  echo "║  A live token shape or a listed personal pattern appears in  ║"
  echo "║  content about to be committed.                             ║"
  echo "║  Personal patterns live in .private/leak-patterns           ║"
  echo "║  (gitignored, machine-local; seed YOUR home path there).    ║"
  echo "║  Quoting is only sanctioned in exempt paths: historical     ║"
  echo "║  records (cortex/adr|tasks|wiki|INDEX, daily/, drafts/,     ║"
  echo "║  archived-patches/, showcase/, *.bak*), test fixtures       ║"
  echo "║  (*.test.ts), and committed run artifacts.                  ║"
  echo "╠══════════════════════════════════════════════════════════════╣"
  for hit in "${PATTERN_HITS[@]}"; do
    printf "║    %s\n" "$hit"
  done
  echo "╠══════════════════════════════════════════════════════════════╣"
fi
if [ "${#FOUND_VALUE_LEAKS[@]}" -gt 0 ]; then
  echo "║  ❌ PRIVATE SECRET LEAK IN STAGED CONTENT                   ║"
  echo "╠══════════════════════════════════════════════════════════════╣"
  echo "║  One or more values from .private/*.env appear in your      ║"
  echo "║  staged diff. .private/ is gitignored for a reason.         ║"
  echo "╠══════════════════════════════════════════════════════════════╣"
  for leak in "${FOUND_VALUE_LEAKS[@]}"; do
    if [ "${#leak}" -gt 8 ]; then
      masked="${leak:0:2}...${leak: -2}"
    else
      masked="(redacted)"
    fi
    printf "║    leaked: %-50s ║\n" "$masked"
  done
  echo "╠══════════════════════════════════════════════════════════════╣"
fi
echo "║  Fix: remove the literal / move the binding to .private/     ║"
echo "║  (see ADR-20261019125409359), then re-stage and commit.     ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
exit 1
