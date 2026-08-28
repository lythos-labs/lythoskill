# TASK-20260828212204402: harden kimi adapter probe follow-ups from TASK-777 reviews

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-08-28 | Created |

## Background & Goals
<!-- ⚠️ REQUIRED: Why is this task needed? What problem does it solve? Empty = shell, blocked by probe. -->

ZK skeptic + user-sim reviews of TASK-20260828141622777 (commits 77f59829, 6ba54d2b + condition fixes) both returned no-P1 verdicts but surfaced a pack of P3 hardening items in the new probe/spawn path of `packages/lythoskill-agent-adapter/src/adapters/kimi.ts`. None block 777's review; together they are the difference between "fail-loud" and "fail-loud with the right diagnosis". Registered per the review gate's fix-or-register rule.

## Requirements
<!-- ⚠️ REQUIRED: List specific requirements. Keeping placeholders = shell. -->
- [ ] R1 (必达) Probe robustness: `probeKimiUpstream` gets a timeout (a hung `--version` currently blocks forever — `Bun.spawnSync` has no timeout) and checks the probe process's exit code (a shim printing a valid version string while exiting non-zero currently passes)
- [ ] R2 (必达) Timeout-kill diagnosis: when the main spawn is killed by `timeoutMs` (kimi.ts: `proc.kill()` → `exitCode` null → `code = 1`), the error must say "timed out after N ms", not "Likely cause: flag/protocol mismatch" (wrong-fix misdirection)
- [ ] R3 (可选) Comment at the kimi-code `--prompt` argv call site: brief is visible via `ps` and bounded by OS argv limits, unlike the kimi-cli temp-file stdin path (inherent to kimi-code having no stdin prompt mode — document, don't fix)
- [ ] R4 (可选) Live acceptance runs persist raw artifacts under `runs/` (or a dated dir) instead of `/tmp`, so card evidence stays independently re-checkable
- **不做**: no changes to fail-closed semantics, version ranges, or the alias layer; no spawn-injection refactor (still no precedent)

## Technical Approach
<!-- ⚠️ REQUIRED: Implementation plan, key decisions, references. Empty = shell, blocked by probe. -->
- All items live in `packages/lythoskill-agent-adapter/src/adapters/kimi.ts` (`probeKimiUpstream`, `spawnKimi`) except R4 (arena e2e habit / card convention).
- R1: `Bun.spawnSync` accepts `{ timeout }`? Verify against Bun version in repo; if unsupported, wrap with a watchdog or use `Bun.spawn` + timeout race. Exit-code check: `probe.exitCode !== 0` → treat as probe failure even if output parses.
- R2: track `timedOut` flag around `proc.kill()`; pass into `detectKimiProtocolMismatch` (extend its input, keep pure-function testability) or short-circuit with a dedicated timeout error before the mismatch check. Fixture-test both.
- Tests extend the existing fixture matrix in `kimi.test.ts` (pure functions only, per repo convention).

## Acceptance Criteria
<!-- ⚠️ REQUIRED: Testable acceptance criteria. Keeping placeholders = shell. -->
- [ ] New fixture tests: probe exit≠0 with valid-looking output → probe failure; timeout path → error message contains "timed out" and the timeout value → Verify: `bun --filter='@lythos/agent-adapter' run test` green with the new cases
- [ ] Live: stub `kimi` that sleeps forever on `--version` → probe aborts within the configured timeout with a loud error, does not hang → Verify: run it with `timeout 30` wrapper, expect non-zero exit well under 30s
- [ ] `bun --filter='*' run test` green → Verify: run it (canonical)

## Progress Log
<!-- Update during execution, with timestamps -->

- 2026-08-28: Created from ZK skeptic (P3 pack: probe exit code, timeout kill misdiagnosis, argv exposure) + user-sim (P3: probe timeout; P2-3: live raw artifacts) reviews of TASK-20260828141622777.

## Related Files
- Modified: packages/lythoskill-agent-adapter/src/adapters/kimi.ts, kimi.test.ts (pending)
- Added: none

## Git Commit Message
```
fix(agent-adapter): probe hardening — timeout, exit-code check, timeout diagnosis (TASK-20260828212204402)

- probe gets timeout + exit-code check; timeout-kill no longer misdiagnosed as protocol mismatch
```

## Notes
