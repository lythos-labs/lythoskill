# Judge Criteria — Arena CLI IO Injection BDD

> Task agent never sees this file. Only the judge agent reads it.
> Task: TASK-20260530135730555

## Task Context

Verify arena CLI (`packages/lythoskill-arena/src/cli.ts`) has IO injection
so that tests can capture output and exit codes without `spyOn`.

## Criteria

| ID | Criterion | Weight | How to Verify |
|----|-----------|--------|---------------|
| `signature` | `main(args?, io?: ArenaIO)` exists with optional io parameter | 1 | Read cli.ts |
| `help_log` | `main(['--help'], mockIO)` captures help text in `mockIO.logs` | 1 | Test in reproduce output |
| `help_no_spy` | Help test uses mock IO, NOT `spyOn(console)` or `spyOn(process)` | 1 | Grep test file |
| `unknown_error` | `main(['unknown-cmd'], mockIO)` captures error in `mockIO.errors` | 1 | Test in reproduce output |
| `unknown_exit` | `main(['unknown-cmd'], mockIO)` sets exit code in `mockIO.exitCode` | 1 | Test in reproduce output |
| `unknown_no_spy` | Unknown-cmd test uses mock IO, NOT `spyOn` | 1 | Grep test file |
| `no_direct_io` | Zero direct `console.log` / `console.error` / `process.exit` inside `main`/`cli` when `io` is provided | 1 | Grep cli.ts function bodies |
| `test_pass` | `bun test $WORKDIR/arena-cli-io.test.ts` passes | 1 | Run test |
| `decision_log` | `decision-log.jsonl` ≥ 5 entries | 0.5 | Check file |

## Verdict

- **PASS**: all 1-weight criteria met + test_pass green
- **PARTIAL**: 7+ criteria met but test_pass failed
- **FAIL**: <7 criteria met
