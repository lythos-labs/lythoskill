# TASK-20260719015727610: deck cold pool probe hardening follow ups

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-07-17 | Created |

## Background & Goals
<!-- ⚠️ REQUIRED: Why is this task needed? What problem does it solve? Empty = shell, blocked by probe. -->

ZK review of TASK-20260717161516624 (verdict: APPROVE for done) surfaced follow-ups that are real but non-blocking. Code locations: `packages/lythoskill-deck/src/cold-pool-health.ts`, `refresh-plan.ts`, `refresh.ts`, `link.ts`.

Goal: harden the probe/self-heal delivered in 624 without regressing boot speed.

## Requirements
<!-- ⚠️ REQUIRED: List specific requirements. Keeping placeholders = shell. -->
- [ ] R1 (P2) Probe side-effect decision: `git fetch --depth=1` in the link-time probe converts full clones to shallow (`.git/shallow` appears) — a nominally read-only boot step mutates state. Decide: keep shallow fetch + document the side effect (fast; behind-count already under-reports), or switch to a non-mutating probe (plain `git fetch` with timeout, or ref-only `ls-remote` compare). Document the decision + rationale in this card, then implement.
- [ ] R2 (P2) Boot-time budget: every `deck link` runs 5 sequential `execSync` git calls per unique git root (incl. a network fetch up to 4s), and `refresh --exec` runs the probe twice (nested linkDeck). Add parallelism across roots (`Promise.all`) and/or a global time budget with skip-on-slow; consider caching probe results for the nested case.
- [ ] R3 (P2) Self-heal coverage: (a) `isDirtyPullFailure` misses untracked-file conflicts ("The following untracked working tree files would be overwritten by merge" / "Please move or remove") — extend the pattern + test; (b) staged-only changes match the pattern but `git checkout -- .` doesn't unstage → heal is a no-op; recovery should be `git reset --hard HEAD` + `git clean -fd` (cache semantics make discarding safe). Update `gitRecover` + tests for both.
- [ ] R4 (P3) Guard-death visibility: `link.ts` health block swallows all exceptions silently — add a debug-gated whisper (e.g. `LYTHOS_DEBUG=1` prints the caught error) so a broken probe is discoverable on demand.
- [ ] R5 (P3) `productionHealthIO` coverage: add at least one fixture-git test exercising the real git invocation strings (fetch/behind/porcelain/branch), or document why mock-level coverage suffices.
- **不做**: no behavior change to non-dirty failure reporting; no retry-loop semantics (single retry stays); no new config files.

## Technical Approach
<!-- ⚠️ REQUIRED: Implementation plan, key decisions, references. Empty = shell, blocked by probe. -->
- Same Intent/Plan/Execute + IO injection style as 624; tests co-located.
- R1 decision first — it shapes R2's timeout strategy.
- If output wording changes, re-sync `packages/lythoskill-deck/skill/SKILL.md` + build.

## Acceptance Criteria
<!-- ⚠️ REQUIRED: Testable acceptance criteria. Keeping placeholders = shell. -->
- [ ] R1 decision recorded in Progress Log + implemented → Verify: grep the chosen probe in cold-pool-health.ts
- [ ] Parallel/budgeted probe: link on this repo completes health block under an agreed budget (state the number) → Verify: `time bun packages/lythoskill-deck/src/cli.ts link`
- [ ] New failure classes covered by tests (untracked-conflict, staged-only) → Verify: `bun test packages/lythoskill-deck`
- [ ] Debug whisper works → Verify: `LYTHOS_DEBUG=1` run prints probe errors when forced
- [ ] Full gate green → Verify: `bun --filter='*' run test` — 0 fail

## Progress Log
<!-- Update during execution, with timestamps -->
- 2026-07-17 — Registered from ZK review findings P2-1, P2-2, P2-3, P3-2, P3-1 (review verdict: APPROVE with follow-ups as new tasks, not blockers).

## Related Files
- Modified: `packages/lythoskill-deck/src/cold-pool-health.ts`, `refresh-plan.ts`, `refresh.ts`, `link.ts`, tests

## Git Commit Message
```
feat(deck): cold-pool probe hardening (TASK-20260719015727610)

- probe side-effect decision + boot-time budget
- self-heal: untracked-conflict + staged-only classes
- LYTHOS_DEBUG guard-death whisper
```

## Notes
Parent: TASK-20260717161516624. Epic: EPIC-20260717161516583 (theme A hardening).
