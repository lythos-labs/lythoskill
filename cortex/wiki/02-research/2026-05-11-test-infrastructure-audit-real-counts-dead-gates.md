---
created: 2026-05-11
updated: 2026-05-11
category: research
---

# Test Infrastructure Audit — Real Counts, Dead Gates, SSOT Gap

> Systematic per-package traversal to establish ground truth on test counts,
> verify tooling correctness, and close the gap between what scripts report
> and what actually runs.

## Methodology

Rather than trusting any single script's output, each package was tested
independently via `bun test src/`, with pass/fail/test/file counts extracted
from raw bun output. CLI BDD runners were also exercised separately. The
result was compared against CI logs, `test-report.ts` output, and the
README badge.

## Real Test Landscape (2026-05-11)

### Unit Tests (`bun test src/` per package)

| Package | Tests | Files | Notes |
|---------|-------|-------|-------|
| agent-adapter | 15 | 2 | |
| agent-adapter-claude-sdk | 3 | 1 | |
| agent-adapter-codex | 8 | 1 | |
| agent-adapter-deepseek-serve | 27 | 1 | |
| arena | 106 | 5 | |
| cold-pool | 131 | 10 | |
| creator | 0 | — | no `.test.ts` files |
| curator | 49 | 2 | |
| deck | 88 | 8 | |
| hello-world | 0 | — | no `.test.ts` files |
| infra | 0 | — | no `.test.ts` files |
| project-cortex | 49 | 3 | |
| test-utils | 113 | 6 | includes bdd-runner unit tests |
| **Total** | **589** | **36** | |

### CLI BDD (`test/runner.ts`, CI-runnable)

| Package | Scenarios | Runner |
|---------|-----------|--------|
| project-cortex | 13 | `test/runner.ts` |
| deck | 20 | `test/runner.ts` |
| **Total** | **33** | |

### Agent BDD (`test/scenarios/*.agent.md`, LLM-required, not in CI)

| Package | Files | Notes |
|---------|-------|-------|
| curator | 1 | `graduation-exam.agent.md` |
| test-utils | 1 | `bdd-runner.agent.md` (tracer bullet) |

Arena has no BDD at all (never had a runner — confirmed via git log).

### Grand Total

- Unit: 589
- CLI BDD: 33
- Agent BDD: 2 (manual only)
- **Total CI-runnable: 622**

## Bugs Found

### 1. test-report.ts: always "0 pass, 0 fail"

**Root cause**: two interacting bugs:
- `|| true` in shell command suppressed `bun test` exit code (always 0)
- Pass/fail counting only happened inside `if (exitCode !== 0)` block

Net effect: the summary line always reported `0 pass(es), 0 fail` regardless
of actual results. Agents reading the report would conclude no tests ran.

**Fix**: removed `|| true`, moved pass/fail parsing outside exitCode check.

### 2. pre-commit-test.ts: dead exit gate

**Root cause provenance**: `|| true` was introduced in `56260eb` (2026-05-07),
commit: `fix: CodeQL high-severity alerts + pre-commit-test no-test-files edge case`.

The diff was:
```diff
-  const result = await $`sh -c "cd packages/${pkg} && bun test"`.cwd(ROOT).nothrow().quiet();
+  const result = await $`sh -c "cd packages/${pkg} && bun test 2>&1 || true"`.cwd(ROOT).nothrow().quiet();
```

**Intent was legitimate**: the `creator` package has no `.test.ts` files. Bun test
exits 1 in that case, which the pre-commit gate treated as a test failure. The
agent correctly identified the edge case but used an over-broad tool (`|| true`)
that silenced *all* non-zero exits — not just the "no test files" case.

**Impact**: from 2026-05-07 to 2026-05-11 (4 days), the pre-commit test gate
never actually blocked any commit. Any test failure committed during that window
would have passed the gate silently.

This is the classic "locally correct, globally wrong" fix — solves the
immediate edge case but with a tool too blunt for the job. The correct fix
(in `9583e44`) parses `N fail` from stdout directly, distinguishing "no test
files" (0 fail) from "real failure" (N > 0 fail) without needing exit codes.

**Fix**: removed `|| true`, parsed fail count from stdout directly.

**Pattern**: when suppressing exit codes to handle a known non-error case,
always replace the exit-code gate with a content-based gate (parse stdout).
"Swallow all" (`|| true`) is never the right answer in a guard context.

### 3. README: stale "649 pass" badge

README claimed 649 tests (unit + CLI BDD). Real total: 622. The 27-test gap
likely came from feature removals and test adjustments over time without
badge updates.

**Fix**: replaced hardcoded static badge with dynamic CI workflow badge.
Exact counts rot; the CI badge is self-updating.

### 4. bump.ts: lockfile drift (separate lesson)

Documented in `2026-05-11-bump-must-regenerate-lockfile.md`.

## SSOT Gap

The epic `EPIC-20260508222319639` (Doc + test infra sweep) identified this:

- **T1** ("SSOT test infrastructure") was marked completed but the task body was empty
- **T2 deferred item**: "Scripts SSOT alignment (test-report.ts + validate-example-decks.ts -> root npm scripts)" — never addressed

The canonical test runner is `bun --filter='*' run test` in CI. The
`test-report.ts` script was a redundant re-run that produced wrong counts.
Pre-commit used yet another code path with dead error handling.

### Current State (post-fix)

- `package.json` `test` scripts: canonical per-package commands
- CI `bun --filter='*' run test`: canonical bulk runner
- `test-report.ts`: now produces accurate snapshot reports
- `pre-commit-test.ts`: now correctly gates on test failures
- README badge: dynamic (CI workflow status), not hardcoded

### Remaining

- test-report.ts still re-runs tests independently rather than parsing
  the CI's existing output — wasteful in CI but useful for local snapshots
- No single `bun run` command produces the aggregate count; it's computed
  by summing per-package output

## Verification

Both fix commits (`9d2834f` bump + lockfile, `9583e44` test infra) passed
all 4 CI jobs after push. The dynamic CI badge now reflects reality.

## Pattern: "Locally Correct, Globally Wrong" Gate Fix

The `|| true` bug exemplifies a recurring failure mode in agent-authored
guard code:

1. **Agent encounters a legitimate edge case** — `bun test` exits 1 when
   no test files found, which is not a failure
2. **Agent reaches for the most general suppression tool** — `|| true`
   swallows ALL non-zero exits, not just the "no test files" case
3. **The exit-code check becomes dead code** — since `|| true` always
   succeeds, `exitCode !== 0` never fires
4. **Real failures pass silently** — for days/weeks until someone notices

The fix principle: **when suppressing exit codes to handle a known non-error
case, replace the exit-code gate with a content-based gate.** Parse stdout
for the specific signal (`N fail`, `0 test files`, etc.) instead of relying
on the exit code after suppression.

This applies beyond test gates — any `|| true`, `try/catch` swallowing,
or `.nothrow()` on a subprocess in a guard/validation context should pair
with content-based validation of stdout.

### Detection Heuristic

A dormant `|| true` in a guard script can be detected by a negative
property test: run the guard with a deliberately broken test and verify
it blocks the commit. The current codebase lacks such meta-tests.

