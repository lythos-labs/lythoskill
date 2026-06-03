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

## Why Some Packages Look Low

Bun's coverage only measures L0+L1 (unit + integration tests in the same JS runtime).
L2 Agent BDD (`reproduce.sh` spawning a real agent) is not captured.

| Low-coverage file | Stmt% | BDD scene? | Root cause |
|---|---|---|---|
| deck/add.ts | 16.7 | ❌ no BDD | Real git clone + deck.toml write — plan builder covered, execute not |
| deck/refresh.ts | 33.3 | ❌ no BDD | git pull + cold pool scan — plan builder 87%, execute 0% |
| deck/validate.ts | 50.0 | ❌ no BDD | Reads cold pool fs — buildDeckValidation tested, validateDeck not |
| deck/remove.ts | 44.4 | ✅ deck-remove-bdd | BDD covers the execute path, Bun can't see it |
| deck/link.ts | 58.3 | ⚠️ also-link-to only | also-link-to-bdd covers sub-feature; main link path has no BDD |
| arena/cli.ts | 33.3 | ✅ arena-cli-io-injection-bdd | CLI routing all IO-injected, BDD covers real spawn |
| curator/guard.ts | 50.0 | ❌ | fs + git safety wrappers → simple code, low coverage false alarm |
| infra/config-fetch.ts | 0.0 | ❌ | Network fetch → no L0/L1, tested manually |
| agent-adapter-codex | 40.0 | ❌ | spawn() wrapper → real CLI launch, BDD territory |
| agent-adapter-deepseek-serve | 0.0/8.5 | ❌ | Daemon lifecycle (serve/pid/kill) → integration-only |

**Pattern**: Low-coverage files fall into two categories:
1. **Intent is tested, Execute is not** (intent/plan/execute fractal) — plan builders at 90%+, executors at 10-50%. This is by design: executors are IO glue that L0 can't test.
2. **Covered by L2 BDD** (10 `reproduce.sh` scenes across 3 packages) — real agent spawn, real tool calls, judge verdict. These are the most valuable tests (they catch the bugs L1 misses) but invisible to `bun test --coverage`.

**Bottom line**: Deck's 62.5% is a mix. `remove` and `to-symlink-snapshot` have proper BDD coverage. But `add`, `refresh`, `validate`, and main `link` path have zero BDD scenes — their low coverage IS a real gap. Arena is clean: cli.ts 33% L1 but the IO-injected path is fully BDD-covered. Curator has 10 BDD scenes covering every major command.
