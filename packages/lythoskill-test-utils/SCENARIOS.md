# SCENARIOS — BDD coverage index

> **Where to find every BDD scenario in this repo, what it tests, and which scenarios cannot run in CI.**

The runner here is intentionally tiny ([`bdd-runner.ts`](./src/bdd-runner.ts), [`skill-fixtures.ts`](./src/skill-fixtures.ts)). LLMs read Given/When/Then natively — no Cucumber, no plugin layer. If you can write a scenario file, the runner can drive it. See [project memory: test-utils control loop](../../cortex/wiki/) for the rationale.

## Three test categories — only two run in CI

| Category | Framework | CI? | What it verifies |
|----------|-----------|-----|------------------|
| **Unit** | Vitest / `bun:test` (free to introduce) | ✅ | Pure functions, parsers, types |
| **CLI integration BDD** | This runner — `.md` or `.ts` scenario files | ✅ | CLI commands produce the declared filesystem / process side effects |
| **Agent BDD** | Same runner **plus** an LLM agent in the loop | ❌ | Whether an agent reading SKILL.md takes the expected CLI action |

Agent BDD relies on LLM inference for the verification step — CI has no LLM, so it has no verification source. These scenarios run in local agent sessions, in arena comparisons, or as manual checkpoint runs. Don't count them in pass/fail badges.

---

## CLI integration BDD — currently in CI

Wired into [`.github/workflows/test.yml`](../../.github/workflows/test.yml) via `bun run test:all` at repo root.

### `@lythos/project-cortex` — 13 scenarios

`packages/lythoskill-project-cortex/test/scenarios/*.md`

| File | Scenario |
|------|----------|
| [`adr-accept-moves-proposed.md`](../lythoskill-project-cortex/test/scenarios/adr-accept-moves-proposed.md) | ADR: accept moves proposed to accepted |
| [`adr-double-accept-rejected.md`](../lythoskill-project-cortex/test/scenarios/adr-double-accept-rejected.md) | ADR: accept from rejected is invalid |
| [`adr-reject-moves-proposed.md`](../lythoskill-project-cortex/test/scenarios/adr-reject-moves-proposed.md) | ADR: reject moves proposed to rejected |
| [`epic-done-moves-active.md`](../lythoskill-project-cortex/test/scenarios/epic-done-moves-active.md) | Epic: done moves active to done |
| [`epic-resume-moves-suspended.md`](../lythoskill-project-cortex/test/scenarios/epic-resume-moves-active.md) | Epic: resume moves suspended to active |
| [`epic-suspend-moves-active.md`](../lythoskill-project-cortex/test/scenarios/epic-suspend-moves-active.md) | Epic: suspend moves active to suspended |
| [`flow-shows-cfd-table.md`](../lythoskill-project-cortex/test/scenarios/flow-shows-cfd-table.md) | Flow: kanban CFD shows task counts and WIP limits |
| [`lane-main-rejected.md`](../lythoskill-project-cortex/test/scenarios/lane-main-rejected.md) | Lane: main full rejects new epic |
| [`lane-override-accepted.md`](../lythoskill-project-cortex/test/scenarios/lane-override-accepted.md) | Lane: override bypasses full lane |
| [`task-backlog-to-completed-invalid.md`](../lythoskill-project-cortex/test/scenarios/task-backlog-to-completed-invalid.md) | Task: backlog to completed is invalid |
| [`trailer-closes-multiple-tasks.md`](../lythoskill-project-cortex/test/scenarios/trailer-closes-multiple-tasks.md) | Trailer: multiple trailers close multiple tasks |
| [`trailer-closes-task.md`](../lythoskill-project-cortex/test/scenarios/trailer-closes-task.md) | Trailer: Closes moves task to completed |
| [`trailer-malformed-ignored.md`](../lythoskill-project-cortex/test/scenarios/trailer-malformed-ignored.md) | Trailer: malformed trailer is ignored |

These cover the cortex FSM edges — task / epic / ADR transitions, trailer dispatch, lane discipline.

### `@lythos/skill-deck` — 20 scenarios

`packages/lythoskill-deck/test/scenarios/*.ts` (TypeScript scenario objects, not Markdown — older shape; both forms drive the same runner.)

| File | Scenario |
|------|----------|
| [`basic-link.ts`](../lythoskill-deck/test/scenarios/basic-link.ts) | basic link creates symlinks and lock |
| [`broken-symlink-replacement.ts`](../lythoskill-deck/test/scenarios/broken-symlink-replacement.ts) | link replaces broken self-referencing symlinks |
| [`budget-rejection.ts`](../lythoskill-deck/test/scenarios/budget-rejection.ts) | budget rejection when exceeding `max_cards` |
| [`deny-by-default.ts`](../lythoskill-deck/test/scenarios/deny-by-default.ts) | deny-by-default removes undeclared skills |
| [`workdir-override.ts`](../lythoskill-deck/test/scenarios/workdir-override.ts) | workdir override anchors `working_set` to specified directory |
| [`parse-old-string-array.ts`](../lythoskill-deck/test/scenarios/parse-old-string-array.ts) | old string-array deck still links with deprecation warning |
| [`parse-new-alias-dict.ts`](../lythoskill-deck/test/scenarios/parse-new-alias-dict.ts) | new alias-dict deck links correctly |
| [`parse-mixed.ts`](../lythoskill-deck/test/scenarios/parse-mixed.ts) | mixed old+new deck links with deprecation on old section |
| [`migrate-schema-dry-run.ts`](../lythoskill-deck/test/scenarios/migrate-schema-dry-run.ts) | migrate-schema dry-run does not modify file |
| [`migrate-schema-converts.ts`](../lythoskill-deck/test/scenarios/migrate-schema-converts.ts) | migrate-schema converts old deck and link no longer warns |
| [`migrate-schema-noop.ts`](../lythoskill-deck/test/scenarios/migrate-schema-noop.ts) | migrate-schema no-op on already-converted deck |
| [`cross-type-alias-collision.ts`](../lythoskill-deck/test/scenarios/cross-type-alias-collision.ts) | cross-type alias collision is rejected |
| [`link-flattens-vendor-tree.ts`](../lythoskill-deck/test/scenarios/link-flattens-vendor-tree.ts) | link flattens deep vendor tree into flat symlinks |
| [`fq-path-creates-correct-symlink.ts`](../lythoskill-deck/test/scenarios/fq-path-creates-correct-symlink.ts) | fq path creates correct symlink to cold pool |
| [`same-type-alias-collision.ts`](../lythoskill-deck/test/scenarios/same-type-alias-collision.ts) | same-type alias collision is rejected |
| [`as-resolves-collision.ts`](../lythoskill-deck/test/scenarios/as-resolves-collision.ts) | different aliases resolve same-basename collision |
| [`refresh-single-skill-only.ts`](../lythoskill-deck/test/scenarios/refresh-single-skill-only.ts) | refresh single skill only processes that target |
| [`remove-deletes-entry-and-symlink.ts`](../lythoskill-deck/test/scenarios/remove-deletes-entry-and-symlink.ts) | remove deletes deck entry and symlink but not cold pool |
| [`prune-skips-declared-repos.ts`](../lythoskill-deck/test/scenarios/prune-skips-declared-repos.ts) | prune skips declared repos and deletes unreferenced ones |
| [`update-deprecation-warning.ts`](../lythoskill-deck/test/scenarios/update-deprecation-warning.ts) | update prints deprecation warning to stderr |

These cover the original `deck link` reconciler (5) + schema parser + migrate-schema (6) + 3-axis CRUD lifecycle: add/link collision/remove/prune/refresh (9).

---

## Planned scenarios — deck 3-axis CRUD refactor

Tracked by [TASK-20260503152006435](../../cortex/tasks/01-backlog/TASK-20260503152006435-add-bdd-scenarios-for-refactored-deck-crud.md), driven by [ADR-20260503152000411](../../cortex/adr/01-proposed/ADR-20260503152000411-deck-3-axis-crud-model-with-as-alias-schema-for-working-set-collisions.md).

| # | Scenario | Status |
|---|----------|--------|
| 1 | `add` writes FQ → `link` materializes flat symlink at cold-pool path | ✅ `fq-path-creates-correct-symlink.ts` |
| 2 | Two FQ entries with same basename, no `as` → `link` exits non-zero with collision error | ✅ `same-type-alias-collision.ts` |
| 3 | Adding `as` resolves the collision — both flat-symlink correctly | ✅ `as-resolves-collision.ts` |
| 4 | `refresh tdd-foo` runs `git pull` only on that path; other entries' mtime unchanged | ✅ `refresh-single-skill-only.ts` |
| 5 | `remove <fq>` deletes deck.toml entry + working-set symlink; **cold pool path remains** | ✅ `remove-deletes-entry-and-symlink.ts` |
| 6 | `prune` does not delete declared paths even if working-set symlink is missing | ✅ `prune-skips-declared-repos.ts` |
| 7 | Cold pool physical path stable across add / refresh / link / remove / prune | ✅ covered by FQ + nested cold-pool scenarios |
| 8 | Old string-array deck.toml + new array-of-tables both link successfully | ✅ `parse-mixed.ts` |
| 9 | `deck update` still works but stderr emits a deprecation warning | ✅ `update-deprecation-warning.ts` |

All 9 planned scenarios implemented. 20 total deck scenarios in CI.

---

## Agent BDD — 1 scenario locally

| File | Scenario | Status |
|------|----------|--------|
| [`skills-introspection.agent.md`](../lythoskill-deck/test/scenarios/skills-introspection.agent.md) | Agent reads skill-deck.toml and reports skills via checkpoint | ✅ Local pass |

Convention:
- Filename suffix: `*.agent.md` (runner loads them alongside `.ts` scenarios; CI skips because they need LLM)
- Verification: automated judge for tracer bullet (checkpoint shape assertions); LLM judge for semantic scenarios (T8+)
- Pass/fail into separate report — never the green CI badge
- Timeout: 300s default (agent BDD is token-heavy; observability via `agent-stdout.txt` + `agent-stderr.txt` + `_checkpoints/*.jsonl`)
- **Evidence path**: `runs/agent-bdd/<stamp>/<scenario-slug>/` — tracked in git, pure-text only. CLI BDD sandbox stays in `playground/test-runs/` (gitignored, may contain nested git repos / cold-pool fixtures / `.bak.<ts>` files). Sandbox vs report split keeps repo clean and is forward-compatible with future docker/sandbox isolation.

---

## How to read / write a scenario

**Cortex-style (Markdown)** — preferred for new scenarios:

```markdown
---
name: "Brief: subject + verb + outcome"
description: |
  One paragraph explaining the invariant being tested.
---

## Given
- Initial state bullets

## When
- The CLI command(s) executed

## Then
- Observable post-state (filesystem / exit code / stderr text)
```

**Deck-style (TypeScript)** — fine for existing tests; new scenarios should prefer Markdown so an LLM can author them without TS knowledge.

---

## Coverage philosophy

We track **scenario coverage** (how many declared invariants have a scenario), not line coverage. Reasoning:

- BDD scenarios are LLM-readable contracts — counting them tells you *what we promise*, not *how thoroughly the implementation runs*
- Line coverage on a custom runner would require instrumenting the runner itself; the marginal value is low until the codebase grows substantially
- If the deck refactor produces enough imperative library code to warrant unit tests, `bun test --coverage` will be considered on top of (not instead of) scenario coverage

Current totals: **34 CLI integration scenarios in CI · 1 agent BDD locally · 4 planned** (T8).
