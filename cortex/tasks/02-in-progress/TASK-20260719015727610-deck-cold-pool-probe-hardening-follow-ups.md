# TASK-20260719015727610: deck cold pool probe hardening follow ups

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-07-17 | Created |
| in-progress | 2026-07-20 | Started |

## Background & Goals
<!-- ⚠️ REQUIRED: Why is this task needed? What problem does it solve? Empty = shell, blocked by probe. -->

ZK review of TASK-20260717161516624 (verdict: APPROVE for done) surfaced follow-ups that are real but non-blocking. Code locations: `packages/lythoskill-deck/src/cold-pool-health.ts`, `refresh-plan.ts`, `refresh.ts`, `link.ts`.

Goal: harden the probe/self-heal delivered in 624 without regressing boot speed.

## Requirements
<!-- ⚠️ REQUIRED: List specific requirements. Keeping placeholders = shell. -->
- [x] R1 (P2) Probe side-effect decision: `git fetch --depth=1` in the link-time probe converts full clones to shallow (`.git/shallow` appears) — a nominally read-only boot step mutates state. Decide: keep shallow fetch + document the side effect (fast; behind-count already under-reports), or switch to a non-mutating probe (plain `git fetch` with timeout, or ref-only `ls-remote` compare). Document the decision + rationale in this card, then implement.
- [x] R2 (P2) Boot-time budget: every `deck link` runs 5 sequential `execSync` git calls per unique git root (incl. a network fetch up to 4s), and `refresh --exec` runs the probe twice (nested linkDeck). Add parallelism across roots (`Promise.all`) and/or a global time budget with skip-on-slow; consider caching probe results for the nested case.
- [x] R3 (P2) Self-heal coverage: (a) `isDirtyPullFailure` misses untracked-file conflicts ("The following untracked working tree files would be overwritten by merge" / "Please move or remove") — extend the pattern + test; (b) staged-only changes match the pattern but `git checkout -- .` doesn't unstage → heal is a no-op; recovery should be `git reset --hard HEAD` + `git clean -fd` (cache semantics make discarding safe). Update `gitRecover` + tests for both.
- [x] R4 (P3) Guard-death visibility: `link.ts` health block swallows all exceptions silently — add a debug-gated whisper (e.g. `LYTHOS_DEBUG=1` prints the caught error) so a broken probe is discoverable on demand.
- [x] R5 (P3) `productionHealthIO` coverage: add at least one fixture-git test exercising the real git invocation strings (fetch/behind/porcelain/branch), or document why mock-level coverage suffices.
- **不做**: no behavior change to non-dirty failure reporting; no retry-loop semantics (single retry stays); no new config files.

## Technical Approach
<!-- ⚠️ REQUIRED: Implementation plan, key decisions, references. Empty = shell, blocked by probe. -->
- Same Intent/Plan/Execute + IO injection style as 624; tests co-located.
- R1 decision first — it shapes R2's timeout strategy.
- If output wording changes, re-sync `packages/lythoskill-deck/skill/SKILL.md` + build.

## Acceptance Criteria
<!-- ⚠️ REQUIRED: Testable acceptance criteria. Keeping placeholders = shell. -->
- [x] R1 decision recorded in Progress Log + implemented → Verify: `grep -n "depth=1" packages/lythoskill-deck/src/cold-pool-health.ts` → design note (line 12) + `fetch --depth=1 origin` (line 66)
- [x] Parallel/budgeted probe — budget stated: **≤6s online / ~9s worst-case offline** (one parallel batch: max fetch-timeout 4s + max probe-timeout 5s, independent of root count) → Verify: `time bun packages/lythoskill-deck/src/cli.ts link` → 4.78s online, incl. live drift warning (mattpocock/skills ≥1 behind)
- [x] New failure classes covered by tests (untracked-conflict, staged-only) → Verify: `bun test packages/lythoskill-deck` — 155 pass + 1 guarded skip (direct invocation), 156 pass under the canonical per-package gate (fixture runs green there); 6 new tests in refresh-plan.test.ts
- [x] Debug whisper works → Verify: forced `throw` in health block — `LYTHOS_DEBUG=1` prints `🔍 cold-pool health probe error: ...`, without it silent, link succeeds both ways (perturbation reverted after verification)
- [x] Full gate green → Verify: `bun --filter='*' run test` — EXIT=0, 0 fail across all 11 test suites (deck 156 pass)

## Progress Log
<!-- Update during execution, with timestamps -->
- 2026-07-17 — Registered from ZK review findings P2-1, P2-2, P2-3, P3-2, P3-1 (review verdict: APPROVE with follow-ups as new tasks, not blockers).
- 2026-07-20 — (session interrupted: API quota exhausted) R1 decided + R2/R5 drafted, left uncommitted in working tree.
- 2026-07-27 — Resumed. **Found a real bug in the draft**: `link.ts:811` called the asyncified `checkColdPoolHealth` without `await` → Promise hit `for...of`, TypeError swallowed by the catch → boot health warnings were silently dead; `skipFetch` had no caller. Fixed both.
- 2026-07-27 — **R1**: keep `git fetch --depth=1` (full rationale in cold-pool-health.ts header): counts are a lower bound ("≥N"); `.git/shallow` side effect only touches rare full clones; probe is a drift SIGNAL, `refresh --exec` is the truth. Chosen over `ls-remote` compare: no network-parity semantics to maintain, one code path with refresh.ts probeBehindCount precedent.
- 2026-07-27 — **R2**: probes parallel across roots (outer `Promise.all`) + per-root fetch-then-probes; `skipFetch` option wired into nested `refresh --exec → linkDeck` via `linkDeck(..., { skipHealthFetch: true })`. Budget: ≤6s online (measured 4.78s), ~9s worst-case offline — bounded by ONE parallel batch, not N×roots.
- 2026-07-27 — **R3**: `isDirtyPullFailure` extended with untracked-conflict class; `gitRecover` extracted to `createGitRecover` in refresh-plan.ts (IO-injectable), recovery = `git reset --hard HEAD && git clean -fd` (staged-only safe). 6 new tests.
- 2026-07-27 — **R4**: `LYTHOS_DEBUG` whisper in the link.ts health catch. Verified by temporary forced throw (reverted).
- 2026-07-27 — **R5**: fixture-git test added, guarded by a spawn-sanity probe (`describe.skip` + loud ⚠️ when broken). Quirk shape (ZK-verified): `bun test <path>` from repo root breaks spawned children's piped stdout for in-repo test files — commands execute (exit 0, side effects happen) but stdout reads "" (Bun 1.3.11/macOS); same file passes from /tmp, and the canonical gate `bun --filter='*' run test` (per-package scripts) runs the fixture GREEN (deck 156 pass). Mock-level coverage holds only on quirked invocations; the guard probe (`git --version` stdout check) is scoped to exactly the API flavor the fixture uses.
- 2026-07-27 — **ZK skeptic round 1: NEEDS REVISION** — P1 verified true: dirty-warning fix string dropped `-C` on `git clean -fd` (paste-from-project-root would clean the USER'S repo) → fixed + test now asserts both `-C`s. P3s fixed: `as any` → `ExecFileOptions`; epic table 556/610 backlog → in-progress. Reviewer independently re-ran all Verify commands and the full gate; regex adversarially tested against 11 git messages (no false pos/neg).

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
