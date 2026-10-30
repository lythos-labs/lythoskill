# TASK-20261026023249282: Deck BDD runner loads zero scenarios so test:bdd is vacuous for the deck half

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-10-26 | Created |

## Background & Goals
<!-- ⚠️ REQUIRED: Why is this task needed? What problem does it solve? Empty = shell, blocked by probe. -->

`bun run test:bdd` runs two runners: cortex (32/32, real) and deck. The deck
runner prints:

```
🧪 加载 0 个 CLI 场景，并发度 1
0/0 passed
```

and exits 0. Cause: `packages/lythoskill-deck/test/runner.ts:403` loads from

```ts
const scenarioDir = join(import.meta.dir, 'scenarios')
const tsFiles = readdirSync(scenarioDir).filter(f => f.endsWith('.ts'))
```

but `test/scenarios/` contains **only directories** (`also-link-to-bdd`,
`deck-remove-bdd`, `deepseek-smoke-bdd`, `skills-introspection-bdd`,
`to-symlink-snapshot-bdd`). The 20 `.ts` CLI scenarios — `basic-link.ts`,
`budget-rejection.ts`, `migrate-schema-*.ts`, … — live in
`packages/lythoskill-deck/test/integration-scenarios/` (all `git ls-files`'d).

So the deck half of CI's BDD step has been green while testing nothing, and
`packages/lythoskill-test-utils/SCENARIOS.md` ("20 deck scenarios in CI" and a
"CLI integration scenarios in CI" total that includes them) describes coverage
that does not run.

Found on encounter while expanding cortex's BDD suite for
`TASK-20261026022014248` (the 32/32 cortex half is real and was verified).

## Requirements
<!-- ⚠️ REQUIRED: List specific requirements. Keeping placeholders = shell. -->
- [ ] Decide and record which scenario set is canonical: the 20 `.ts` files in `test/integration-scenarios/`, or the five newer `test/scenarios/*-bdd` directories.
- [ ] `bun run test:bdd` actually loads the deck scenarios and reports a non-zero count.
- [ ] The suite's exit code is non-zero when a deck scenario fails (verify by mutation, not by reading).
- [ ] `SCENARIOS.md` counts match what actually runs.
- [ ] If stale scenarios are retired instead of fixed, their deletion is stated in the commit that does it (a silent `0/0` is not a retirement).

## Technical Approach
<!-- ⚠️ REQUIRED: Implementation plan, key decisions, references. Empty = shell, blocked by probe. -->

**The fix is one path — the decision is which path.** Two candidate sets exist
and they are not the same generation: `integration-scenarios/*.ts` (the
`deck link` reconciler + schema-migrate + 3-axis CRUD contracts listed in
`SCENARIOS.md`) and `test/scenarios/*-bdd` (directory-shaped, newer, tied to
the Agent BDD / unified-runner work — `c6517001`, `aec45e95`).

1. Point `runner.ts` at whichever set is canonical (expected:
   `integration-scenarios`, since `SCENARIOS.md`'s table names exactly those
   files).
2. Run it; budget for reds. The first honest run may surface real regressions
   (the deck package has been refactored repeatedly since those scenarios
   last ran), and each red is either a scenario update or a code fix — not
   silently skipped.
3. Add a guard so this cannot recur: the runner exits non-zero when it loads
   zero scenarios. A test suite that runs nothing must not pass. (Same class
   as the cortex change in `TASK-20261026022014248`: a success signal that
   cannot be distinguished from "did nothing" is the bug.)
4. Correct `SCENARIOS.md` counts.

No ADR expected: pointing a runner at its own scenarios and refusing to pass
on zero discoveries is not an abstraction/boundary/named-concept change. If
step 1 ends up *retiring* the old scenario set in favour of the `*-bdd` set,
that is a coverage-policy decision and does need an ADR.

## Acceptance Criteria
<!-- ⚠️ REQUIRED: Testable acceptance criteria. Keeping placeholders = shell. -->
- [ ] **AC1** `bun run test:bdd` reports a non-zero deck scenario count.
  → Verify: the runner's summary line no longer says `0/0 passed`.
- [ ] **AC2** A failing deck scenario fails the command.
  → Verify: break one assertion → `bun run test:bdd` exits non-zero; restore.
- [ ] **AC3** Loading zero scenarios is itself a failure.
  → Verify: point the runner at an empty dir → non-zero exit with a message.
- [ ] **AC4** `SCENARIOS.md` totals equal the counts the runners print.

## Progress Log
<!-- Update during execution, with timestamps -->

- 2026-10-26 — Card created from evidence gathered during
  `TASK-20261026022014248` (the cortex BDD half was being extended 26 → 32;
  running `bun run test:bdd` exposed the deck half at `0/0`).

## Related Files
- Modified: `packages/lythoskill-deck/test/runner.ts`;
  `packages/lythoskill-test-utils/SCENARIOS.md`
- Added: —

## Git Commit Message
```
test(deck-bdd): load the real scenario set and fail on zero discoveries (TASK-20261026023249282)

- runner read test/scenarios/ (dirs only) instead of the .ts scenarios in
  test/integration-scenarios/ -> test:bdd reported "0/0 passed" and exited 0
- a runner that discovers no scenarios now exits non-zero
- SCENARIOS.md counts corrected to what actually runs
```

## Notes

- Evidence, verbatim: `🧪 加载 0 个 CLI 场景，并发度 1` / `0/0 passed`, exit 0
  (`bun run test:bdd` and `bun test/runner.ts` from the package dir both).
- Not fixed in `TASK-20261026022014248` on purpose: the correction may expose
  red scenarios requiring their own triage, and the cortex change should not
  land with an unverified deck suite attached.
