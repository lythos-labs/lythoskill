# TASK-20260717161516624: deck refresh self healing and boot drift detection

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-07-17 | Created |
| in-progress | 2026-07-18 | Started |
| review | 2026-07-18 | Deliverables committed |

## Background & Goals
<!-- ⚠️ REQUIRED: Why is this task needed? What problem does it solve? Empty = shell, blocked by probe. -->

2026-07-17 incident (full root-cause chain in ADR-20260717161516538): cold pool stuck at `1c61ec0` (06-15) for a month while origin was at `89e13352`; agents were served pre-fix onboarding text ("read the **last** one") although source and built output already said "first". Contributing defects:

1. Boot runs `deck link` but nothing mechanically reports cold-pool drift; `deck refresh` (discovery) is opt-in and never runs in long-horizon sessions.
2. `deck refresh --exec` aborts pulls on a dirty cold pool (`cannot pull with rebase: You have unstaged changes`); the recovery is documented in AGENTS.md but manual — the dirty tree persisted 7 days.
3. The cold pool clone was left on feature branch `fix/curator-scan-output-consistency`.
4. A past agent hand-patched the cold-pool file directly, bypassing push → refresh → link.

Goal: drift becomes visible at a step boot already runs; refresh self-heals the cache; failures are unmissable.

Prerequisite knowledge for executor:
- Code: `packages/lythoskill-deck/src/` (refresh plan/exec + link output paths — start from `cli.ts` dispatch).
- Design pattern: Intent/Plan/Execute with IO injection — see `packages/lythoskill-deck/skill/references/intent-plan-execute.md` (spawn/delete/log injection table).
- Documented recovery being automated: AGENTS.md § Session Close — "If `deck refresh` fails with unstaged changes in cold pool, run `git checkout -- . && git clean -fd`".

## Requirements
<!-- ⚠️ REQUIRED: List specific requirements. Keeping placeholders = shell. -->
- [ ] R1 (必达) `deck link` output includes per-repo drift warnings: behind-origin commit count and dirty-working-tree status for cold-pool repos (read-only; whether to allow a `git fetch` is a documented design decision in this card's Progress Log).
- [ ] R2 (必达) `deck refresh --exec` self-heals: on "cannot pull with rebase: You have unstaged changes", perform the AGENTS.md-documented recovery (`git checkout -- . && git clean -fd`) with a loud per-repo log line, then retry pull once.
- [ ] R3 (必达) Failure surface is unmissable: non-zero exit code when any repo fails, plus a final `⚠️ N repo(s) failed` line as the LAST line of output (today the report prints failures mid-output and the trailing link output pushes them out of tail view).
- [ ] R4 (可选) Cold-pool branch sanity: warn when a cold-pool repo is not on its default branch (incident: clone sat on `fix/curator-scan-output-consistency`).
- [ ] 不做: no auto-push; no npm involvement; no locator-policy change; no discarding cold-pool modifications anywhere outside the R2 self-heal path; no change to `deck add` parsing.

## Technical Approach
<!-- ⚠️ REQUIRED: Implementation plan, key decisions, references. Empty = shell, blocked by probe. -->
- Code: `packages/lythoskill-deck/src/refresh*.ts` and link output module; pure plan functions + injected `spawn` per Intent/Plan/Execute.
- Tests: co-located `*.test.ts` with fixture git repos (behind-origin, dirty-tree, wrong-branch); negative tests prove the warnings actually fire (per [GUARD-SENSITIVE] gotcha — a guard that never fires is worse than none).
- Docs: if output surface changes, sync `packages/lythoskill-deck/skill/SKILL.md` and the AGENTS.md boot section (replace the conditional exhortation "if upstream changed, run refresh" with a reference to the mechanical signal), then `creator build` + `deck link`.
- Version: new user-facing output/behavior = minor bump per [SEMVER] gotcha — only when the user explicitly releases.

## Acceptance Criteria
<!-- ⚠️ REQUIRED: Testable acceptance criteria. Keeping placeholders = shell. -->
- [ ] All deck tests pass incl. new fixture tests → Verify: `bun --filter='*' run test` — 0 fail
- [ ] Manual replay: hand-dirty a cold-pool clone → `deck refresh --exec` recovers and pulls → Verify: `git -C <repo> log -1` equals origin tip; output shows the recovery line
- [ ] Manual replay: cold pool 1 commit behind origin → `deck link` prints a drift warning → Verify: warning line present in stdout
- [ ] Failure visibility: force a pull failure → non-zero exit and `⚠️` summary is the last line → Verify: run, then `echo $?`
- [ ] AGENTS.md / SKILL.md boot text updated and built → Verify: `grep` new wording in `skills/lythoskill-deck/SKILL.md`

## Progress Log
<!-- Update during execution, with timestamps -->
- 2026-07-17 — Registered after incident replay; incident manually fixed same day (checkout + pull + link; served text verified "first").

## Related Files
- Modified: `packages/lythoskill-deck/src/*.ts`, `packages/lythoskill-deck/skill/SKILL.md`, `AGENTS.md`
- Added: `packages/lythoskill-deck/src/*.test.ts` (fixture tests)

## Git Commit Message
```
feat(deck): refresh self-healing + boot drift detection (TASK-20260717161516624)

- link warns on behind-origin / dirty cold pool
- refresh --exec self-heals dirty cache per documented recovery
- non-zero exit + trailing failure summary
```

## Notes
Epic: EPIC-20260717161516583. ADR: ADR-20260717161516538.
