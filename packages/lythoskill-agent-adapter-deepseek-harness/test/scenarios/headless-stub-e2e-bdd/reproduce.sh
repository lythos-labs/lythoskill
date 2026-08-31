#!/bin/bash
# DeepSeek Harness adapter — end-to-end BDD via stubbed upstream
# Date: 2026-08-31 (TASK-20260829090402490)
#
# ═══════════════════════════════════════════════════════════════════════════
# WHY A STUB: the real `dsh` binary is not installed on this machine (needs
# Node >= 22.19 + DEEPSEEK_API_KEY). The stub emulates the documented headless
# contract byte-for-byte at the level this adapter depends on:
#   dsh --version                     → "0.1.0-rc.7" on stdout, exit 0
#   dsh --profile headless "<task>"   → final text on stdout, reasoning on
#                                       stderr, exit 0
# Contract source (primary): apps/cli/reference/README.md in
# deepseek-ai/deepseek-harness. No LLM calls happen anywhere in this scenario.
#
# IoContract: idempotent. Exit 0 = success (including no-op re-run),
# exit 1 = assertion failed, exit 2 = SKIP (environment not applicable).
# ═══════════════════════════════════════════════════════════════════════════
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../../.." && pwd)"
DECK="$REPO_ROOT/examples/decks/scout.toml"
E2E_ROOT="$(mktemp -d /tmp/dsh-adapter-e2e-XXXXXXXX)"
ARCHIVE="$SCRIPT_DIR/run-output"

command -v bun >/dev/null 2>&1 || { echo "SKIP: bun not found"; exit 2; }

mkdir -p "$E2E_ROOT/bin-ok" "$E2E_ROOT/bin-new" "$ARCHIVE"

# ── Stub honoring the headless contract, version 0.1.0-rc.7 (in range) ──────
cat > "$E2E_ROOT/bin-ok/dsh" << 'STUB'
#!/bin/bash
if [[ "$1" == "--version" || "$1" == "-V" ]]; then echo "0.1.0-rc.7"; exit 0; fi
if [[ "$1" == "--profile" && "$2" == "headless" ]]; then
  echo "dsh: reasoning: stub reasoning for: $3" >&2
  echo "STUB-HEADLESS-OUTPUT: $3"
  exit 0
fi
echo "stub dsh: unknown args: $*" >&2; exit 2
STUB

# ── Same stub but version 1.0.0 (out of declared range) ─────────────────────
sed 's/0\.1\.0-rc\.7/1.0.0/' "$E2E_ROOT/bin-ok/dsh" > "$E2E_ROOT/bin-new/dsh"
chmod +x "$E2E_ROOT/bin-ok/dsh" "$E2E_ROOT/bin-new/dsh"

FAILED=0

echo "=== Scenario A: happy path — --player deepseek-harness through full arena CLI ==="
OUT_A="$E2E_ROOT/out-happy"
PATH="$E2E_ROOT/bin-ok:$PATH" bun "$REPO_ROOT/packages/lythoskill-arena/src/cli.ts" single \
  --deck "$DECK" \
  --brief "e2e stub task" \
  --player deepseek-harness \
  --timeout 60000 \
  --out "$OUT_A" 2>&1 | tee "$E2E_ROOT/scenario-a.log"
if grep -rq "STUB-HEADLESS-OUTPUT" "$OUT_A" 2>/dev/null && grep -rq "e2e stub task" "$OUT_A" 2>/dev/null; then
  echo "✅ A: final headless text reached arena artifacts"
else
  echo "❌ A: STUB-HEADLESS-OUTPUT not found in $OUT_A"; FAILED=1
fi

echo ""
echo "=== Scenario B: fail-closed — out-of-range upstream (1.0.0) must error loudly ==="
OUT_B="$E2E_ROOT/out-new"
PATH="$E2E_ROOT/bin-new:$PATH" bun "$REPO_ROOT/packages/lythoskill-arena/src/cli.ts" single \
  --deck "$DECK" \
  --brief "e2e stub task" \
  --player deepseek-harness \
  --timeout 60000 \
  --out "$OUT_B" > "$E2E_ROOT/scenario-b.log" 2>&1
B_EXIT=$?
cat "$E2E_ROOT/scenario-b.log"
if [[ $B_EXIT -ne 0 ]] && grep -q "dsh upstream probe failed" "$E2E_ROOT/scenario-b.log"; then
  echo "✅ B: out-of-range upstream rejected with HATEOAS error (exit $B_EXIT)"
else
  echo "❌ B: expected loud probe failure, got exit=$B_EXIT"; FAILED=1
fi

echo ""
echo "=== Scenario C: alias — --player dsh resolves to deepseek-harness ==="
OUT_C="$E2E_ROOT/out-alias"
PATH="$E2E_ROOT/bin-ok:$PATH" bun "$REPO_ROOT/packages/lythoskill-arena/src/cli.ts" single \
  --deck "$DECK" \
  --brief "e2e stub task" \
  --player dsh \
  --timeout 60000 \
  --out "$OUT_C" 2>&1 | tee "$E2E_ROOT/scenario-c.log"
C_OK=1
grep -q "player 'dsh' = 'deepseek-harness' (built-in alias)" "$E2E_ROOT/scenario-c.log" || C_OK=0
grep -rq "STUB-HEADLESS-OUTPUT" "$OUT_C" 2>/dev/null || C_OK=0
if [[ $C_OK -eq 1 ]]; then
  echo "✅ C: alias resolved (note printed) and run succeeded"
else
  echo "❌ C: alias resolution or run failed"; FAILED=1
fi

# ── Archive (留档): transcript + scenario A artifacts into the scenario dir ──
RUN_STAMP="$(date +%Y%m%d-%H%M%S)"
{
  echo "# dsh adapter stub e2e — run $RUN_STAMP"
  echo "# workdir: $E2E_ROOT (ephemeral)"
  echo ""
  cat "$E2E_ROOT/scenario-a.log"
  echo ""
  cat "$E2E_ROOT/scenario-b.log"
  echo ""
  cat "$E2E_ROOT/scenario-c.log"
} > "$ARCHIVE/run-$RUN_STAMP.log"
cp -R "$OUT_A" "$ARCHIVE/artifacts-happy-$RUN_STAMP" 2>/dev/null || true
echo ""
echo "📦 Archived: $ARCHIVE/run-$RUN_STAMP.log"

if [[ $FAILED -eq 0 ]]; then
  echo "🎉 ALL SCENARIOS PASS"
  exit 0
else
  echo "💥 FAILURES — see above"
  exit 1
fi
