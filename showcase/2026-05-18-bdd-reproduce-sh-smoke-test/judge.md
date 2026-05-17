# Judge Criteria — arena-single-task smoke test

> Task agent never sees this file. Only the judge agent reads it.
> This is the separation that arena already has (arena.toml judge field)
> and that Agent BDD needs (ADR-20260518024500631).

## Task Context (what the agent was asked to do)

Create `greet.ts` + `greet.test.ts` + run `bun test` → write `result.txt`.

## Criteria

| ID | Criterion | Weight | How to Verify |
|----|-----------|--------|---------------|
| `correctness` | greet.ts has correct function signature and logic | 1 | Read greet.ts — `export function greet(name: string): string` returning `` `Hello, ${name}!` `` |
| `completeness` | Both test files created with specified cases | 1 | Check greet.test.ts has 2 test() calls matching the spec |
| `execution` | `bun test` ran and result.txt has output | 1 | result.txt exists and contains pass/fail counts |
| `decision_log` | decision-log.jsonl has valid entries | 1 | JSONL with step/decision/reason/ts fields, ≥3 lines |
| `code_quality` | Clean, well-typed, idiomatic TypeScript | 0.5 | No `any`, proper types, no unused imports |

## Verdict

- **PASS**: all 1-weight criteria met + code_quality acceptable
- **PARTIAL**: 2+ criteria met
- **FAIL**: <2 criteria met or greet.ts missing entirely
