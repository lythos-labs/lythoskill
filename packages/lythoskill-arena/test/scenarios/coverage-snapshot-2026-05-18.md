# Arena Plan-Mode BDD Coverage Snapshot — 2026-05-18

> Generated during plan-mode standardization (EPIC-20260518024809887)

## Plan Function Coverage

| Plan function | File | Tests | Type | IO |
|--------------|------|-------|------|-----|
| buildExecutionPlan | arena-toml.test.ts | 7 | Pure data transform | None |
| buildCopyPlan | preflight.test.ts | 10 | Pure strings+set | None |
| buildArchiveSidePlan | preflight.test.ts | 12 | IO injected (existsFn) | Injected |
| buildPreparePlan | preflight.test.ts | 9 | Pure computation | None |
| buildArenaPrompt | runner.test.ts | 8 | Pure string builder | None |
| parseDeckSkills | preflight.test.ts | 15 | Pure TOML parse | None |
| **Total** | | **61** | | |

## BDD Scenario Coverage (IO behavior)

| Scenario | IO ops | What it verifies |
|----------|--------|------------------|
| arena-single-task | 2 | Single deck, brief → agent output |
| arena-docx-output | 3 | Agent uses skill via linked deck → .docx |

## Arena Self-Bootstrapping

Arena is unique: it can test ITS OWN SKILL.md. The Standard Posture meta-test
(showcase/2026-05-17-arena-standard-posture-meta-test/) proves an agent reading
arena's SKILL.md correctly applies the 4-step SOP to a hypothetical skill.

**Next migration target**: arena-single-task.agent.md → reproduce.sh — arena
testing itself, the ultimate self-bootstrap.
