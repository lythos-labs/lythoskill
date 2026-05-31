# T1 Judge — runQuery IO Injection

## Criteria

| ID | Criterion | Weight | Verify |
|----|-----------|--------|--------|
| `signature` | `runQuery(argv, io?: CuratorIO)` exists | 1 | Read cli.ts |
| `no_direct_io` | Uses `io.log`/`io.error`/`io.exit`, not console/process | 1 | Grep function body |
| `q1_schema` | Q1: No SQL → schema in io.log | 1 | Test exists and passes |
| `q2_select` | Q2: SELECT → markdown table | 1 | Test exists and passes |
| `q3_notfound` | Q3: DB not found → error + exit(1) | 1 | Test exists and passes |
| `q4_readonly` | Q4: Non-SELECT rejected | 1 | Test exists and passes |
| `tests_pass` | `bun test --grep runQuery` passes | 1 | Run test |
| `decision_log` | decision-log.jsonl ≥3 entries | 0.5 | Check file |

## Verdict

- **PASS**: all weight-1 criteria met + tests_pass green
- **FAIL**: <6 criteria met
