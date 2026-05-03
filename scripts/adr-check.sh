#!/usr/bin/env bash
# ADR Compliance Check — Lint/normative governance rules enforced at commit time.
# Exits 0 if all checks pass, 1 if any fail.
# Run manually: bash scripts/adr-check.sh

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ERRORS=0
WARNINGS=0

error() {
  echo -e "${RED}  ❌ $1${NC}" >&2
  ERRORS=$((ERRORS + 1))
}

warn() {
  echo -e "${YELLOW}  ⚠️  $1${NC}" >&2
  WARNINGS=$((WARNINGS + 1))
}

ok() {
  echo -e "${GREEN}  ✅ $1${NC}"
}

echo "🔍 ADR Compliance Check"
echo ""

# ── ADR-20260423101950000: ESM-only ──────────────────────────────
echo "[ADR-20260423101950000] ESM-only: no require() in packages/**/*.ts"
ESM_VIOLATIONS=$(grep -rn "require(" packages/*/src/*.ts 2>/dev/null | grep -v "node_modules" || true)
if [ -n "$ESM_VIOLATIONS" ]; then
  error "Found require() in TypeScript source:"
  echo "$ESM_VIOLATIONS" | while read line; do
    echo "     $line"
  done
else
  ok "No require() found in packages/*/src/*.ts"
fi
echo ""

# ── ADR-20260423101950000: node: prefix for built-in modules ─────
echo "[ADR-20260423101950000] Built-in modules must use node: prefix"
NODE_PREFIX_VIOLATIONS=$(grep -rn "from ['\"]fs['\"]" packages/*/src/*.ts 2>/dev/null || true)
NODE_PREFIX_VIOLATIONS+=$(grep -rn "from ['\"]path['\"]" packages/*/src/*.ts 2>/dev/null || true)
NODE_PREFIX_VIOLATIONS+=$(grep -rn "from ['\"]os['\"]" packages/*/src/*.ts 2>/dev/null || true)
NODE_PREFIX_VIOLATIONS+=$(grep -rn "from ['\"]child_process['\"]" packages/*/src/*.ts 2>/dev/null || true)
if [ -n "$NODE_PREFIX_VIOLATIONS" ]; then
  error "Missing node: prefix for built-in module imports:"
  echo "$NODE_PREFIX_VIOLATIONS" | while read line; do
    echo "     $line"
  done
else
  ok "All built-in imports use node: prefix"
fi
echo ""

# ── ADR-20260423182606313: Template variables resolved in build ──
echo "[ADR-20260423182606313] No unresolved {{VAR}} in skills/**/*.md"
UNRESOLVED_VARS=$(grep -rn "{{[A-Z]" skills/ 2>/dev/null | grep -v "node_modules" || true)
if [ -n "$UNRESOLVED_VARS" ]; then
  error "Unresolved template variables in skills/ build output:"
  echo "$UNRESOLVED_VARS" | while read line; do
    echo "     $line"
  done
  warn "Run: bun packages/lythoskill-creator/src/cli.ts build --all"
else
  ok "No unresolved template variables in skills/"
fi
echo ""

# ── ADR-20260423124812645: packages/<name>/skill/ ↔ skills/<name>/ sync ──
echo "[ADR-20260423124812645] Every packages/<name>/skill/ has matching skills/<name>/"
MISSING_BUILDS=0
for skill_dir in packages/*/skill; do
  if [ ! -d "$skill_dir" ]; then continue; fi
  name=$(basename "$(dirname "$skill_dir")")
  built="skills/$name/SKILL.md"
  if [ ! -f "$built" ]; then
    error "Missing build output: $built (source: $skill_dir/SKILL.md)"
    MISSING_BUILDS=$((MISSING_BUILDS + 1))
  fi
done
if [ "$MISSING_BUILDS" -eq 0 ]; then
  ok "All skill sources have matching build outputs"
fi
echo ""

# ── ADR-20260423191001406: npm package naming ────────────────────
echo "[ADR-20260423191001406] packages/*/package.json name must start with @lythos/"
NAMING_ERRORS=0
for pkg_json in packages/*/package.json; do
  if [ ! -f "$pkg_json" ]; then continue; fi
  name=$(jq -r '.name // empty' "$pkg_json" 2>/dev/null || echo "")
  if [ -z "$name" ]; then
    error "$pkg_json: missing name field"
    NAMING_ERRORS=$((NAMING_ERRORS + 1))
  elif [[ ! "$name" =~ ^@lythos/ ]]; then
    error "$pkg_json: name '$name' must start with @lythos/"
    NAMING_ERRORS=$((NAMING_ERRORS + 1))
  fi
done
if [ "$NAMING_ERRORS" -eq 0 ]; then
  ok "All package names use @lythos/ scope"
fi
echo ""

# ── ADR-20260424125637347: Handoff format (daily-first) ──────────
echo "[ADR-20260424125637347] No daily/HANDOFF.md (use daily/YYYY-MM-DD.md)"
if [ -f "daily/HANDOFF.md" ]; then
  error "daily/HANDOFF.md exists — migrate to daily/YYYY-MM-DD.md format"
else
  ok "No stale daily/HANDOFF.md"
fi
echo ""

# ── SKILL.md type validation ─────────────────────────────────────
echo "[SKILL.md type] All packages/*/skill/SKILL.md type must be standard or flow"
TYPE_ERRORS=0
for skill_md in packages/*/skill/SKILL.md; do
  if [ ! -f "$skill_md" ]; then continue; fi
  type_val=$(grep -m1 "^type:" "$skill_md" 2>/dev/null | sed 's/type:[[:space:]]*//' | tr -d '[:space:]' || echo "")
  if [ -z "$type_val" ]; then
    warn "$skill_md: missing type frontmatter"
  elif [ "$type_val" != "standard" ] && [ "$type_val" != "flow" ]; then
    error "$skill_md: invalid type '$type_val' (must be standard or flow)"
    TYPE_ERRORS=$((TYPE_ERRORS + 1))
  fi
done
if [ "$TYPE_ERRORS" -eq 0 ]; then
  ok "All SKILL.md types are valid"
fi
echo ""

# ── ADR-20260503170000000: Bun-only toolchain ────────────────────
echo "[ADR-20260503170000000] Bun-only: no pnpm lockfile/workspace residuals"
if [ -f "pnpm-lock.yaml" ] || [ -f "pnpm-workspace.yaml" ]; then
  [ -f "pnpm-lock.yaml" ] && error "pnpm-lock.yaml exists — run 'rm pnpm-lock.yaml'"
  [ -f "pnpm-workspace.yaml" ] && error "pnpm-workspace.yaml exists — run 'rm pnpm-workspace.yaml'"
else
  ok "No pnpm residual files"
fi
echo ""

# ── ADR-20260503170000000: Root package.json conventions ─────────
echo "[ADR-20260503170000000] Root package.json must not have runtime dependencies"
ROOT_DEPS=$(jq -r '.dependencies // empty' package.json 2>/dev/null || echo "")
if [ -n "$ROOT_DEPS" ] && [ "$ROOT_DEPS" != "{}" ] && [ "$ROOT_DEPS" != "null" ]; then
  dep_names=$(echo "$ROOT_DEPS" | jq -r 'keys | join(", ")' 2>/dev/null || echo "(unknown)")
  error "Root package.json has runtime dependencies: $dep_names — move to leaf packages"
else
  ok "Root package.json has no runtime dependencies"
fi
echo ""

# ── ADR-20260502010100000: Backup strategy docs consistency ──────
echo "[ADR-20260502010100000] SKILL.md must not contradict backup strategy"
CONTRADICTORY_DOCS=$(grep -rn "Deck only manages symlinks" packages/*/skill/SKILL.md 2>/dev/null || true)
if [ -n "$CONTRADICTORY_DOCS" ]; then
  error "Found outdated 'Deck only manages symlinks' text (contradicts auto-backup behavior):"
  echo "$CONTRADICTORY_DOCS" | while read line; do
    echo "     $line"
  done
else
  ok "No contradictory backup strategy text in SKILL.md"
fi
echo ""

# ── Summary ──────────────────────────────────────────────────────
echo "────────────────────────────────────────"
if [ "$ERRORS" -eq 0 ] && [ "$WARNINGS" -eq 0 ]; then
  echo -e "${GREEN}All ADR compliance checks passed.${NC}"
  exit 0
elif [ "$ERRORS" -eq 0 ]; then
  echo -e "${YELLOW}$WARNINGS warning(s), 0 errors.${NC}"
  exit 0
else
  echo -e "${RED}$ERRORS error(s), $WARNINGS warning(s).${NC}"
  echo "Fix errors before committing, or bypass with --no-verify (not recommended)."
  exit 1
fi
