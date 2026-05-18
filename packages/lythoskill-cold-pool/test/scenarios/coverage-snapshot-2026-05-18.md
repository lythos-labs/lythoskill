# Cold-Pool Plan-Mode Coverage Snapshot — 2026-05-18

> Prune is destructive (rm -rf). Plan-mode is the safety mechanism:
> agent reads plan → verifies correct → only then executes.

## Plan Function Coverage

| Function | Tests | Pattern | IO Strategy |
|----------|-------|---------|-------------|
| buildValidationPlan | 16 | build + execute(plan, io?) | ValidationIO injected |
| buildReconcilePlan | 12 | build + execute(plan, io?) | ColdPool + metadata |
| buildFetchPlan | 11 | build + execute(plan, io?) | ColdPool parameter |
| buildListPlan | 11 | Pure — IO by caller | DirEntry[] injected |
| buildPrunePlan | 7 | build + execute(plan, io?) | ← NEW! ColdPool + metadata |
| parseLocator | 21 | Pure parser | None |
| metadata fingerprint | 4 | validateIntegrity() | None |
| **Total plan-mode** | **82** | | |

## Destructive Operations

| Operation | Danger Level | Plan-Mode Safety |
|-----------|-------------|------------------|
| `executePrunePlan` | P0 — rm -rf | Agent reads plan → verifies candidates → only then deletes |
| `executeFetchPlan` | P1 — git clone | Plan verified before network IO |
| `executeReconcilePlan` | P1 — metadata write | Plan classification verified before DB mutation |

## Coverage Gaps

- `buildPrunePlan` now covered (was 0 tests) ✅
- All 5 plan functions have test coverage
- `executePrunePlan` tested with IO injection (mock delete)
