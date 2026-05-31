# T3 Judge — runTag IO Injection

## Criteria

| ID | Criterion | Weight | Verify |
|----|-----------|--------|--------|
| `signature` | `runTag(argv, io?: CuratorIO)` exists | 1 | Read cli.ts |
| `no_direct_io` | Uses `io.log`/`io.error`/`io.exit` | 1 | Grep function body |
| `t1_niche` | T1: Tag niche → DB updated | 1 | Test exists and passes |
| `t2_qa` | T2: Tag qa → qa: prefix in niches | 1 | Test exists and passes |
| `t3_notfound` | T3: Skill not found → error + exit(1) | 1 | Test exists and passes |
| `t4_missing` | T4: Missing args → error + exit(1) | 1 | Test exists and passes |
| `tests_pass` | `bun test --grep runTag` passes | 1 | Run test |
| `decision_log` | decision-log.jsonl ≥3 entries | 0.5 | Check file |

## Verdict

- **PASS**: all weight-1 criteria met + tests_pass green
- **FAIL**: <6 criteria met
