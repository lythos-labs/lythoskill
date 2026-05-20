# TDD Decision Log — Calculator divide() Bug Fix

## RED Phase

**Test added:** `divides two numbers with float result`

```js
test('divides two numbers with float result', () => {
  assert.strictEqual(divide(7, 2), 3.5);
});
```

**Why:** The existing test `divide(10, 2) === 5` passes with both buggy and fixed code because `10 / 2` is exactly `5`. To expose the integer-division bug, a test with a non-integer result is required. `7 / 2` yields `3.5` with correct float division but `3` with `Math.floor(a / b)`.

**Result:** Test failed as expected — actual `3`, expected `3.5`.

## GREEN Phase

**Fix applied:** Removed `Math.floor()` from `divide()` in `calculator.js`.

```js
// Before (buggy)
function divide(a, b) {
  return Math.floor(a / b);
}

// After (fixed)
function divide(a, b) {
  return a / b;
}
```

**Result:** All 5 tests pass (4 existing + 1 new).

## REFACTOR Phase

No refactoring was necessary. The `divide()` function is now a minimal one-liner with no duplication or complexity. The module as a whole is clean and consistent.

## Skill Guidance Assessment

The skill's guidance was **sufficient** for this TDD exercise. Key principles followed:

- **Vertical slice:** One test added, then minimal code written to pass it — not a bulk rewrite.
- **Public interface testing:** The new test exercises `divide()` through its public API, not implementation details.
- **Never refactor while RED:** The test was confirmed failing before any code change was made.
- **Minimal code:** The fix was exactly one operation — remove `Math.floor()` — with no speculative additions.

One gap: the skill mentions confirming interface changes with the user during planning, but the experiment constraints explicitly forbade asking questions. In this constrained context, the planning step was completed by inspecting the existing interface and inferring the intended behavior (float division, since the module comment called integer division a "bug").
