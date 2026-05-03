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

### `@lythos/project-cortex` — 12 scenarios

`packages/lythoskill-project-cortex/test/scenarios/*.md`

| File | Scenario |
|------|----------|
| [`adr-accept-moves-proposed.md`](../lythoskill-project-cortex/test/scenarios/adr-accept-moves-proposed.md) | ADR: accept moves proposed to accepted |
| [`adr-double-accept-rejected.md`](../lythoskill-project-cortex/test/scenarios/adr-double-accept-rejected.md) | ADR: accept from rejected is invalid |
| [`adr-reject-moves-proposed.md`](../lythoskill-project-cortex/test/scenarios/adr-reject-moves-proposed.md) | ADR: reject moves proposed to rejected |
| [`epic-done-moves-active.md`](../lythoskill-project-cortex/test/scenarios/epic-done-moves-active.md) | Epic: done moves active to done |
| [`epic-resume-moves-suspended.md`](../lythoskill-project-cortex/test/scenarios/epic-resume-moves-suspended.md) | Epic: resume moves suspended to active |
| [`epic-suspend-moves-active.md`](../lythoskill-project-cortex/test/scenarios/epic-suspend-moves-active.md) | Epic: suspend moves active to suspended |
| [`lane-main-rejected.md`](../lythoskill-project-cortex/test/scenarios/lane-main-rejected.md) | Lane: main full rejects new epic |
| [`lane-override-accepted.md`](../lythoskill-project-cortex/test/scenarios/lane-override-accepted.md) | Lane: override bypasses full lane |
| [`task-backlog-to-completed-invalid.md`](../lythoskill-project-cortex/test/scenarios/task-backlog-to-completed-invalid.md) | Task: backlog to completed is invalid |
| [`trailer-closes-multiple-tasks.md`](../lythoskill-project-cortex/test/scenarios/trailer-closes-multiple-tasks.md) | Trailer: multiple trailers close multiple tasks |
| [`trailer-closes-task.md`](../lythoskill-project-cortex/test/scenarios/trailer-closes-task.md) | Trailer: Closes moves task to completed |
| [`trailer-malformed-ignored.md`](../lythoskill-project-cortex/test/scenarios/trailer-malformed-ignored.md) | Trailer: malformed trailer is ignored |

These cover the cortex FSM edges — task / epic / ADR transitions, trailer dispatch, lane discipline.

### `@lythos/skill-deck` — 5 scenarios

`packages/lythoskill-deck/test/scenarios/*.ts` (TypeScript scenario objects, not Markdown — older shape; both forms drive the same runner.)

| File | Scenario |
|------|----------|
| [`basic-link.ts`](../lythoskill-deck/test/scenarios/basic-link.ts) | basic link creates symlinks and lock |
| [`broken-symlink-replacement.ts`](../lythoskill-deck/test/scenarios/broken-symlink-replacement.ts) | link replaces broken self-referencing symlinks |
| [`budget-rejection.ts`](../lythoskill-deck/test/scenarios/budget-rejection.ts) | budget rejection when exceeding `max_cards` |
| [`deny-by-default.ts`](../lythoskill-deck/test/scenarios/deny-by-default.ts) | deny-by-default removes undeclared skills |
| [`workdir-override.ts`](../lythoskill-deck/test/scenarios/workdir-override.ts) | workdir override anchors `working_set` to specified directory |

These cover the original `deck link` reconciler. The 3-axis CRUD refactor (see below) will add 9 more.

---

## Planned scenarios — deck 3-axis CRUD refactor

Tracked by [TASK-20260503152006435](../../cortex/tasks/01-backlog/TASK-20260503152006435-add-bdd-scenarios-for-refactored-deck-crud.md), driven by [ADR-20260503152000411](../../cortex/adr/01-proposed/ADR-20260503152000411-deck-3-axis-crud-model-with-as-alias-schema-for-working-set-collisions.md).

| # | Scenario | Note |
|---|----------|------|
| 1 | `add` writes FQ → `link` materializes flat symlink at cold-pool path | invariant: cold pool is go-module form |
| 2 | Two FQ entries with same basename, no `as` → `link` exits non-zero with collision error | alias collision detection |
| 3 | Adding `as` resolves the collision — both flat-symlink correctly | alias mechanism |
| 4 | `refresh tdd-foo` runs `git pull` only on that path; other entries' mtime unchanged | per-skill refresh |
| 5 | `remove <fq>` deletes deck.toml entry + working-set symlink; **cold pool path remains** | strict per-axis side effects |
| 6 | `prune` does not delete declared paths even if working-set symlink is missing | declared-paths protected |
| 7 | Cold pool physical path stable across add / refresh / link / remove / prune | stability invariant |
| 8 | Old string-array deck.toml + new array-of-tables both link successfully | migration backward-compat |
| 9 | `deck update` still works but stderr emits a deprecation warning | deprecation shim |

Status: scenarios will be authored after the underlying CLI changes land (TASK-20260503152001333 → 152005415).

---

## Agent BDD — empty today

Zero scenarios in this category currently. They are not blocked by tooling — they're blocked by the fact that we haven't yet needed to verify "agent reads SKILL.md → makes the right CLI choice" with formal scenarios. When that becomes useful (e.g. after curator's L3 metadata lands), the convention will be:

- Filename suffix: `*.agent.md` (so the runner can skip them in CI environments)
- Verification step is delegated to the in-loop LLM, not deterministic file diff
- Pass/fail goes into a separate report — never the green CI badge

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

Current totals: **17 CLI integration scenarios in CI · 0 agent BDD in CI · 9 planned for deck refactor**.
