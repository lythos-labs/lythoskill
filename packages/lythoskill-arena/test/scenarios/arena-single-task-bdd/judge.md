# Judge Criteria — arena single-task smoke test

> Task agent never sees this file.

## Criteria

| ID | Criterion | Weight | How to Verify |
|----|-----------|--------|---------------|
| correctness | greet.ts has correct signature and logic | 1 | export function greet(name: string): string returning `Hello, ${name}!` |
| completeness | Both test files created with specified cases | 1 | greet.test.ts has 2 test() calls |
| execution | bun test ran, result.txt has output | 1 | result.txt contains pass/fail counts |
| decision_log | decision-log.jsonl has valid entries | 1 | JSONL with step/decision/reason/ts, ≥3 lines |
| code_quality | Clean TypeScript, no any, no unused imports | 0.5 | Code review |

## Verdict

- PASS: all 1-weight criteria met + code_quality acceptable
- FAIL: any 1-weight criterion missing
