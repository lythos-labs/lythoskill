# TASK-20260828194647623: test deck add advisory probe branch (probe failure does not hard-exit)

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-08-28 | Created |
| in-progress | 2026-08-28 | Started |

## Background & Goals
<!-- ⚠️ REQUIRED: Why is this task needed? What problem does it solve? Empty = shell, blocked by probe. -->

ZK skeptic review of TASK-20260828111354804 (mirror probe fix, commit `6ff09d89`) found a P2: the advisory-probe behavior in `add.ts` has **no automated test**. `packages/lythoskill-deck/src/add.test.ts` only covers pure functions (findSkillDir, buildSkillDirCandidates, normalizeSkillsSh); `addSkill` calls `probeConnectivity` and `process.exit` directly (add.ts:285-329), so if someone reintroduces `process.exit(1)` on probe failure, nothing fails. The clone-self-proves semantics of ADR-...54804 is enforced by code review only.

## Requirements
<!-- ⚠️ REQUIRED: List specific requirements. Keeping placeholders = shell. -->
- [ ] R1 (必达) A test proving: probe fails on all URLs → `addSkill` still attempts the clone (does not exit before fetch). Will need a seam: either inject probe/fetch/exit via an IO object (repo convention — Intent/Plan/Execute, see `packages/lythoskill-deck/skill/references/intent-plan-execute.md`), or extract the probe-advisory block into a pure-ish function that is tested directly
- [ ] R2 (必达) A test proving: probe fails + clone fails → error output includes the probe `failures` detail (add.ts:319-328)
- **不做**: no refactor of addSkill beyond the minimal seam; no change to the advisory semantics themselves

## Technical Approach
<!-- ⚠️ REQUIRED: Implementation plan, key decisions, references. Empty = shell, blocked by probe. -->
- `packages/lythoskill-deck/src/add.ts` — `addSkill` at line 206; probe block 285-302; clone-failure detail branch 319-328.
- `process.exit` is called directly in several places (203, 223, 234, 240, 329, 352, 382) — the seam design should follow how other deck modules inject io (see link.ts / refresh.ts tests for precedent).
- mirror.ts `ProbeDeps` injection (fetch + execFileSync) is the model for the probe side; the missing piece is add.ts's own seam.

## Acceptance Criteria
<!-- ⚠️ REQUIRED: Testable acceptance criteria. Keeping placeholders = shell. -->
- [ ] New test fails if `process.exit(1)` is reintroduced before the clone attempt on probe failure → Verify: temp-patch the exit back in, watch the test fail, revert
- [ ] `bun --filter='@lythos/skill-deck' run test` green → Verify: run it

## Progress Log
<!-- Update during execution, with timestamps -->

- 2026-08-28: Registered from ZK skeptic review of TASK-20260828111354804 (P2 finding: advisory branch untested).
- 2026-08-28: Implemented. Seam = optional `AddSkillIO { probe, fetchPlan, exit }` param on addSkill (mirror.ts ProbeDeps precedent); all six in-function `process.exit` calls routed through the seam (exitInvalidLocator module helper left as-is — outside the probe branch, pre-probe validation only). Three tests added: (1) probe undefined + fetch succeeds → calls = [probe, fetch], exit never reached, deck.toml written; (2) probe with failures + fetch failed → exit(1) via seam + stderr contains 'Probe detail' + the simulated 403; (3) probe undefined + fetch failed → 'Network probe was inconclusive' line. Negative test per acceptance: temp-patched `exit(1)` into the probe block → test 1 failed with HARD_EXIT_1 → reverted. `bun --filter='@lythos/skill-deck' run test` → 164 pass, 0 fail.

## Related Files
- Modified: packages/lythoskill-deck/src/add.ts, add.test.ts (pending)
- Added: (none)

## Git Commit Message
```
test(deck): cover advisory probe branch in addSkill (TASK-20260828194647623)

- probe failure no longer exits before clone; clone failure prints probe detail
```

## Notes
