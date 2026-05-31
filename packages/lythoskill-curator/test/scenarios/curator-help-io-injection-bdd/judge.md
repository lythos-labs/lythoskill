# T6 Judge — --help entry IO Injection

## Criteria

| ID | Criterion | Weight | Verify |
|----|-----------|--------|--------|
| `routing` | `--help` routes to `printHelp(defaultCuratorIO)` | 1 | Read main block in cli.ts |
| `signature` | `printHelp(io?: CuratorIO)` exists | 1 | Read cli.ts |
| `no_direct_io` | Uses `io.log`/`io.exit` | 1 | Grep function body |
| `h1_test` | H1: Help contains key commands | 1 | Test exists and passes |
| `tests_pass` | `bun test --grep printHelp` passes | 1 | Run test |
| `decision_log` | decision-log.jsonl ≥3 entries | 0.5 | Check file |

## Verdict

- **PASS**: all weight-1 criteria met + tests_pass green
- **FAIL**: <4 criteria met
