# Judge Criteria — Curator CLI IO Injection BDD

> Task agent never sees this file. Only the judge agent reads it.
> Epic: EPIC-20260529214429614 / Task: TASK-20260529214622541

## Task Context (what the agent was asked to do)

Verify curator CLI has complete IO injection: all exported functions accept `CuratorIO`,
no direct `console`/`process` calls, correct git range syntax, and comprehensive tests.

## Criteria

| ID | Criterion | Weight | How to Verify |
|----|-----------|--------|---------------|
| `io_interface` | All 11 exported CLI functions accept `CuratorIO` parameter | 1 | Read cli.ts — verify signature of each function |
| `no_direct_io` | Zero direct console.log/console.error/process.exit in injected functions | 1 | Grep for `console.log`, `console.error`, `process.exit` inside function bodies — should only appear in `defaultCuratorIO` |
| `git_range` | runRefreshPlan/runRefreshExecute use two-dot `HEAD..@{upstream}` | 1 | Search cli.ts for `rev-list` calls — must be `HEAD..@{upstream}` |
| `test_coverage` | R1-R5 refresh tests exist and pass | 1 | cli.test.ts contains describe('runRefreshPlan') with R1-R3 and describe('runRefreshExecute') with R4-R5 |
| `test_pattern` | Tests use IO injection, not spyOn(console/process) | 1 | No `spyOn(console` or `spyOn(process` in cli.test.ts |
| `test_pass` | `bun test packages/lythoskill-curator/src/cli.test.ts` passes | 1 | Run test, verify 0 failures |
| `decision_log` | decision-log.jsonl has valid entries | 0.5 | JSONL with step/decision/reason/ts fields, ≥5 lines |

## Verdict

- **PASS**: all 1-weight criteria met + test_pass green
- **PARTIAL**: 4+ criteria met but test_pass failed or git_range wrong
- **FAIL**: <4 criteria met or io_interface incomplete
