# Judge Criteria — Curator CLI IO Injection BDD (Comprehensive)

> Task agent never sees this file. Only the judge agent reads it.
> Epic: EPIC-20260529214429614
>
> This is the COMPREHENSIVE scenario covering all T1-T6.
> Per-task scenarios live in:
>   - showcase/2026-05-29-t1-curator-query-bdd/
>   - showcase/2026-05-29-t2-curator-audit-bdd/
>   - showcase/2026-05-29-t3-curator-tag-bdd/
>   - showcase/2026-05-29-t4-curator-refresh-bdd/
>   - showcase/2026-05-29-t5-curator-backup-restore-bdd/
>   - showcase/2026-05-29-t6-curator-help-bdd/

## Task Context

Verify curator CLI has complete IO injection across ALL tasks (T1-T6).

## Criteria

### T1 — runQuery

| ID | Criterion | Weight | How to Verify |
|----|-----------|--------|---------------|
| `T1_io` | `runQuery(argv, io?: CuratorIO)` | 1 | Signature in cli.ts |
| `T1_q1` | Q1: No SQL → schema in io.log | 1 | Test passes |
| `T1_q2` | Q2: SELECT → markdown table | 1 | Test passes |
| `T1_q3` | Q3: DB not found → error + exit(1) | 1 | Test passes |
| `T1_q4` | Q4: Non-SELECT rejected | 1 | Test passes |

### T2 — runAudit

| ID | Criterion | Weight | How to Verify |
|----|-----------|--------|---------------|
| `T2_io` | `runAudit(argv, io?: CuratorIO)` | 1 | Signature in cli.ts |
| `T2_a1` | A1: Normal audit → Summary + score | 1 | Test passes |
| `T2_a2` | A2: Empty DB → 0 issues, 100/100 | 1 | Test passes |
| `T2_a3` | A3: DB not found → error + exit(1) | 1 | Test passes |

### T3 — runTag

| ID | Criterion | Weight | How to Verify |
|----|-----------|--------|---------------|
| `T3_io` | `runTag(argv, io?: CuratorIO)` | 1 | Signature in cli.ts |
| `T3_t1` | T1: Tag niche → DB updated | 1 | Test passes |
| `T3_t2` | T2: Tag qa → qa: prefix | 1 | Test passes |
| `T3_t3` | T3: Skill not found → error + exit(1) | 1 | Test passes |
| `T3_t4` | T4: Missing args → error + exit(1) | 1 | Test passes |

### T4 — runRefreshPlan/Execute

| ID | Criterion | Weight | How to Verify |
|----|-----------|--------|---------------|
| `T4_io` | Both `export async` with `io?: CuratorIO` | 1 | Signatures in cli.ts |
| `T4_git` | `HEAD..@{upstream}` (two-dot) | 1 | Parse safeGit calls |
| `T4_r1` | R1: Empty pool → 0 items | 1 | Test passes |
| `T4_r2` | R2: Pool with repo → plan includes it | 1 | Test passes |
| `T4_r3` | R3: Two-dot range verified | 1 | Test passes |
| `T4_r4` | R4: No plan → error + exit(1) | 1 | Test passes |
| `T4_r5` | R5: Up to date → success | 1 | Test passes |

### T5 — backupIndex/restoreIndex/printHelp

| ID | Criterion | Weight | How to Verify |
|----|-----------|--------|---------------|
| `T5_io` | All accept `io?: CuratorIO` | 1 | Signatures in cli.ts |
| `T5_b1` | B1: Backup created | 1 | Test passes |
| `T5_b2` | B2: Restore from backup | 1 | Test passes |
| `T5_b3` | B3: No backup → error + exit(1) | 1 | Test passes |
| `T5_h1` | H1: Help contains key commands | 1 | Test passes |

### T6 — --help entry

| ID | Criterion | Weight | How to Verify |
|----|-----------|--------|---------------|
| `T6_routing` | `--help` → `printHelp(defaultCuratorIO)` | 1 | Main block in cli.ts |
| `T6_h1` | H1: Help output verified | 1 | Test passes |

### Cross-cutting

| ID | Criterion | Weight | How to Verify |
|----|-----------|--------|---------------|
| `no_direct_io` | Zero direct console/process in injected functions | 1 | Grep cli.ts function bodies |
| `no_spyon` | Zero spyOn(console/process) in tests | 1 | Grep cli.test.ts |
| `all_pass` | Full test suite passes (50 tests) | 1 | Run `bun test` |
| `decision_log` | decision-log.jsonl ≥10 entries | 0.5 | Check file |

## Verdict

- **PASS**: all 1-weight criteria met + all_pass green
- **PARTIAL**: 20+ criteria met but all_pass failed
- **FAIL**: <20 criteria met
