# T5 Judge — backupIndex/restoreIndex/printHelp IO Injection

## Criteria

| ID | Criterion | Weight | Verify |
|----|-----------|--------|--------|
| `signature` | All accept `io?: CuratorIO` | 1 | Read cli.ts |
| `no_direct_io` | Uses `io.log`/`io.error`/`io.exit` | 1 | Grep function bodies |
| `b1_backup` | B1: Backup created → log + files | 1 | Test exists and passes |
| `b2_restore` | B2: Restore → content restored | 1 | Test exists and passes |
| `b3_nobak` | B3: No backup → error + exit(1) | 1 | Test exists and passes |
| `h1_help` | H1: Help contains key commands | 1 | Test exists and passes |
| `tests_pass` | `bun test --grep` passes | 1 | Run test |
| `decision_log` | decision-log.jsonl ≥3 entries | 0.5 | Check file |

## Verdict

- **PASS**: all weight-1 criteria met + tests_pass green
- **FAIL**: <6 criteria met
