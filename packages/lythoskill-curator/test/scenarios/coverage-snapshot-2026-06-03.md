# Coverage Snapshot — 2026-06-03

> Auto-generated via `bun test --coverage`. Manual snapshot for trend tracking.
> Compare with past snapshots to detect coverage regressions.

## Summary

| Package | Tests | Statement % | Branch % | Files |
|---------|-------|------------|----------|-------|
| cold-pool | 159 | 91.3 | 89.6 | 15 |
| test-utils | 122 | 95.3 | 95.3 | 8 |
| arena | 143 | 82.7 | 81.7 | 7 |
| project-cortex | 49 | 100.0 (lib/) | 87.5 | 5 |
| curator | 83 | 73.6 | 73.1 | 4 |
| agent-adapter-claude-sdk | 3 | 77.8 | 67.0 | 1 |
| infra | 3 | 72.5 | 71.3 | 4 |
| deck | 100 | 62.5 | 64.4 | 11 |
| agent-adapter | 17 | 61.4 | 62.0 | 5 |
| agent-adapter-deepseek-serve | 27 | 50.0 | 54.3 | 2 |
| agent-adapter-codex | 8 | 40.0 | 44.1 | 1 |

**Total: 714 pass, 0 fail across 11 packages (63 files)**

## Key Changes Since 2026-05-18

- `arena`: +ArenaCliIO + ArenaIO injection (cli.ts + runner.ts), coverage up
- `curator`: +deck-aware DB resolution (resolveDbPath), +gitClone → FetchIO injection, +fetchIO in runAdd
- `cold-pool`: +FetchIO/FetchPlan/Locator exports, existing git-io already fully injectable
- `deck`: stable (no structural changes to core modules)
- All packages: 0 fail across full suite
