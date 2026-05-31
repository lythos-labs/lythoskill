# T2 Judge — runAudit IO Injection

## Criteria

| ID | Criterion | Weight | Verify |
|----|-----------|--------|--------|
| `signature` | `runAudit(argv, io?: CuratorIO)` exists | 1 | Read cli.ts |
| `no_direct_io` | Uses `io.log`/`io.error`/`io.exit` | 1 | Grep function body |
| `a1_normal` | A1: Normal audit → Summary + score | 1 | Test exists and passes |
| `a2_empty` | A2: Empty DB → 0 issues, 100/100 | 1 | Test exists and passes |
| `a3_notfound` | A3: DB not found → error + exit(1) | 1 | Test exists and passes |
| `tests_pass` | `bun test --grep runAudit` passes | 1 | Run test |
| `decision_log` | decision-log.jsonl ≥3 entries | 0.5 | Check file |

## Verdict

- **PASS**: all weight-1 criteria met + tests_pass green
- **FAIL**: <5 criteria met
