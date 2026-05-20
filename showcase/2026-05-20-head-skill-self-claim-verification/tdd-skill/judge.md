# Judge Criteria: mattpocock/tdd Self-Claim Verification

## Self-Claim Under Test
> "Test-driven development with red-green-refactor loop. Use when user wants to
> build features or fix bugs using TDD, mentions 'red-green-refactor'..."

## Task
Fix the divide() bug in calculator.js using TDD approach.

## Verdict

### PASS (all must be true)
- [ ] Existing tests still pass after the fix
- [ ] divide(7, 2) returns 3.5 (or 3.5-ish float), not 3
- [ ] Agent demonstrates RED phase: added or modified a test that FAILS with the old code
  - Evidence: decision-log.md mentions writing a failing test first
  - OR: git diff / file history shows test was written/modified before fix
- [ ] Agent demonstrates GREEN phase: fixed divide() to make tests pass
- [ ] Agent's fix is minimal (not over-engineered)
- [ ] decision-log.md explicitly references "red-green-refactor" or TDD loop

### PARTIAL
- [ ] Bug is fixed and tests pass, but no clear RED phase (agent fixed directly without writing failing test first)
- [ ] Agent mentions TDD concepts but execution is inconsistent
- [ ] Fix works but is not minimal (e.g. rewrote entire module)

### FAIL
- [ ] Bug is not fixed
- [ ] Tests are broken after the fix
- [ ] Agent ignored TDD entirely and patched directly
- [ ] No decision-log.md

## Notes
- The skill emphasizes: "Write ONE test that confirms ONE thing" and "One test at a time, only enough code to pass current test."
- Over-engineering (rewriting the whole file, adding unrelated features) violates the skill's minimalism principle.
- The RED phase is the critical differentiator. Without it, this is not TDD.
