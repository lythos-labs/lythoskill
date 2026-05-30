# Judge Criteria — Arena Runner IO Injection BDD

> Task agent never sees this file. Only the judge agent reads it.
> Task: TASK-20260530135730555

## Task Context

Verify arena runner (`packages/lythoskill-arena/src/runner.ts`) has IO injection
so that dry-run mode produces plan output without real fs/spawn/agent calls.

## Criteria

| ID | Criterion | Weight | How to Verify |
|----|-----------|--------|---------------|
| `dry_run_plan` | `runArenaFromToml({ toml, taskPath }, { dryRun: true, log })` returns `{ plan }` | 1 | Read runner.ts dry-run path |
| `no_real_spawn` | Dry-run path does NOT call `Bun.spawn`, `useAgent`, or `agent.spawn` | 1 | Grep runner.ts dry-run path |
| `mock_log` | Mock log function captures plan output (side names, run counts, decks) | 1 | Test in reproduce output |
| `no_spyon` | Test uses mock log injection, NOT `spyOn(Bun)` or `spyOn(console)` | 1 | Grep test file |
| `toml_valid` | Minimal arena.toml has ≥2 sides with different decks | 0.5 | Read test file |
| `test_pass` | `bun test $WORKDIR/arena-runner-io.test.ts` passes | 1 | Run test |
| `decision_log` | `decision-log.jsonl` ≥ 5 entries | 0.5 | Check file |

## Verdict

- **PASS**: all 1-weight criteria met + test_pass green
- **PARTIAL**: 5+ criteria met but test_pass failed
- **FAIL**: <5 criteria met
