# Curator Plan-Mode Coverage Snapshot — 2026-05-18

> Curator is a discovery engine — scan cold pool, index SKILL.md, query.
> IO is filesystem scan (scanColdPool/findSkillDirs). Plan functions are pure.

## Plan Function Coverage

| Function | Tests | Type | IO |
|----------|-------|------|-----|
| buildAddPlan | 6 | Pure computation | None |
| buildRefreshPlan | 5 | Local IO (filesystem scan) | Test fs |
| buildAdditionRecord | 3 | Pure | None |
| buildSkillMeta | 7 | Pure (frontmatter → structured) | None |
| formatMarkdownTable | 4 | Pure formatter | None |
| formatRefreshPlan | 3 | Pure formatter | None |
| buildCuratorPlan | 1 | Pure (trivial plan struct) | None |
| **Plan-mode total** | **29** | | |

## IO Function Coverage

| Function | Tests | What it verifies |
|----------|-------|------------------|
| scanColdPool | 4 | Empty pool, flat pool, Go-mod paths, skip non-skill dirs |
| inferSource | 3 | GitHub, localhost, unknown patterns |
| parseFrontmatter | 4 | YAML extraction, body separation, no frontmatter |
| extractQuotedPhrases | 4 | Quotes, no quotes, duplicates, empty |

## Coverage Gaps

- `buildCuratorPlan` weak (1 test — intentionally simple function)
- `findSkillDirs` tested indirectly via scanColdPool
- CLI tests (cli.test.ts) cover 16 scenarios

## Note

test-utils is a library — classic unit/plan coverage suffices. No Agent BDD needed.
Its 180 tests already cover sanitize, schema, agent-bdd, judge, bdd-runner, agents.
