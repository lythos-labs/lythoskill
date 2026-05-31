# T4 Judge — runRefreshPlan/Execute IO Injection

## Criteria

| ID | Criterion | Weight | Verify |
|----|-----------|--------|--------|
| `signature` | Both `export async` with `io?: CuratorIO` | 1 | Read cli.ts |
| `no_direct_io` | Uses `io.log`/`io.error`/`io.exit` | 1 | Grep function bodies |
| `git_range` | `HEAD..@{upstream}` (two-dot) | 1 | Parse safeGit calls |
| `r1_empty` | R1: Empty pool → 0 items | 1 | Test exists and passes |
| `r2_repo` | R2: Pool with repo → plan includes it | 1 | Test exists and passes |
| `r3_range` | R3: Two-dot range verified | 1 | Test exists and passes |
| `r4_noplan` | R4: No plan → error + exit(1) | 1 | Test exists and passes |
| `r5_uptodate` | R5: Up to date → success | 1 | Test exists and passes |
| `tests_pass` | `bun test --grep runRefresh` passes | 1 | Run test |
| `decision_log` | decision-log.jsonl ≥3 entries | 0.5 | Check file |

## Verdict

- **PASS**: all weight-1 criteria met + tests_pass green
- **FAIL**: <8 criteria met
