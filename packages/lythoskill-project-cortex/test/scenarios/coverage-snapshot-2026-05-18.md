# Cortex Coverage Snapshot — 2026-05-18

> Cortex is a CLI governance tool, not a library with plan/execute separation.
> Tests cover command builders (pure) + state machine logic. CI-safe.

## Test Coverage

| Module | Tests | What it verifies |
|--------|-------|------------------|
| coupling.ts | 22 | EPIC-ADR linking, buildAcceptCommands, extract/parse |
| trailer.ts | 18 | Trailer parsing, buildDispatchCommands, edge cases |
| lane.ts | 9 | Lane counting, active epic listing, limit enforcement |
| **Total** | **49** | |

## Plan-like Functions (all pure)

| Function | Coverage | Type |
|----------|----------|------|
| buildAcceptCommands | coupling.test.ts | Pure — string[] → string[] |
| buildDispatchCommands | trailer.test.ts | Pure — Trailer[] → string[] |
| countByLane | lane.test.ts | Pure — Epic[] → counts |
| listActiveEpics | lane.test.ts | Pure — config → Epic[] |

## IO Functions (integration-tested in pre-commit hook)

| Function | Tested via |
|----------|-----------|
| probeStatus | Manual run, pre-push hook |
| initWorkflow | Manual run, end-to-end |
| pre-commit.ts | Every commit (self-bootstrapping) |

## CI Safety

All 49 tests are CI-safe — no filesystem writes outside tmpdir, no network calls,
no external process spawns. Pre-commit hook runs them on every push.
