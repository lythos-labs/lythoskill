# Deck BDD Coverage Snapshot — 2026-05-18

> Generated during Agent BDD reproduce.sh migration (EPIC-20260518024809887)

## Unit Test Coverage (pure logic)

| Test file | Domain | Tests |
|-----------|--------|-------|
| add.test.ts | `deck add` — locator parsing, git clone plan | — |
| link.test.ts | `deck link` — resolve, parse, working-set reconcile | — |
| parse-deck.test.ts | TOML parsing — sections, aliases, validation | — |
| refresh-plan.test.ts | `deck refresh` — plan generation, discover | — |
| refresh.test.ts | `deck refresh` — execute, git pull, timeout | — |
| remove.test.ts | `deck remove` — entry deletion, cold pool untouched | — |
| resolve-deck.test.ts | `deck link` — URL fetch, path resolution | — |
| to-symlink-snapshot.test.ts | `to-symlink` / `to-snapshot` — mode switching | — |
| validate.test.ts | `deck validate` — lock checking, drift detection | — |

**94 pass, 0 fail** (across 9 files)

## BDD Scenario Coverage (IO behavior)

| Scenario | IO ops | What it verifies |
|----------|--------|------------------|
| deck-to-symlink-to-snapshot | 25 | cp/symlink/roundtrip on real filesystem |
| deck-remove | 7 | rm -rf + symlink cleanup |
| deck-add | 4 | git clone + working-set sync |
| deck-refresh | 3 | git fetch + skip-localhost |
| deepseek-smoke | 1 | cross-player agent spawn |
| skills-introspection | 0 | agent reads toml, counts skills |

## Coverage Gap

Unit tests mock IO (`symlinkSync`, `cpSync`, `git clone`). They verify **return values**.
BDD scenarios execute real IO. They verify **filesystem state**.

**What unit tests can't cover**: symlink actually points to correct path, cp -r actually copies all files, git clone actually creates directory, deck link actually mutates working set.

**Reproduce.sh migration priority**: high-IO scenarios first.
1. `deck-to-symlink-to-snapshot` (25 IO) — migrate now (TASK-2026051803...)
2. `deck-remove` (7 IO)
3. `deck-add` (4 IO)
