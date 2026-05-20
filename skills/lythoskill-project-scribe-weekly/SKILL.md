---
name: lythoskill-project-scribe-weekly
version: 0.15.2
type: standard
description: |
  Weekly synthesis writer. Distills the past 7 days' core thread + quest DAG
  into a frontmatter-rich short doc. Never replays git log or cortex INDEX
  (those are direct queries already). Forms the weekly counterpart to
  project-scribe (daily) and project-onboarding (read-side).
when_to_use: |
  End of week retrospective, planning next week's priorities, zooming out
  from daily noise, identifying patterns across sessions, preparing for
  epic planning, Sunday night wrap-up, 周末复盘.
---

# Project Scribe — Weekly

> Distill, don't replay. The core thread matters; the 17 commits that touched it don't.

## Value Boundary

Weekly is a **memory offloading mechanism**, not a menu listing.

| Direct queries (skip these) | Scribe-weekly must synthesize |
|-----------------------------|-------------------------------|
| `git log --since="7 days ago"` | The *one* decision that mattered most |
| `ls daily/2026-05-*` | Why the planned vs actual divergence happened |
| `cat cortex/INDEX.md` | Which emergent threads earned attention |
| `bunx @lythos/project-cortex list` | What pattern is hardening into a project trait |

If the next agent can find it via `ls daily/`, `git log`, or `cortex index` — don't replicate it. Link to it.

**Why this matters**: A future agent reading a weekly cold (no daily access) should get the *compressed representation* of the week's cognitive work — the pattern, not the commits. Without this, every agent must reconstruct the narrative from 6 daily files + 29 commits + 10 ADRs. Weekly offloads that reconstruction cost once, permanently.

## When to Run

- User explicitly asks for weekly synthesis
- End of week (typically Sunday) for retrospective
- Before epic planning to understand what unlocked/paused
- **Do NOT auto-schedule** — the player decides timing

## Inputs (collect before writing)

```bash
# 1. Daily files from the past 7 days
ls daily/*.md | sort | tail -7

# 2. Git activity (for reference, not replay)
git log --since="7 days ago" --oneline

# 3. Current cortex state
bunx @lythos/project-cortex@0.15.2 index
bunx @lythos/project-cortex@0.15.2 stats

# Cortex uses timestamp IDs (ADR-yyyyMMddHHmmssSSS, TASK-...,
# EPIC-...). This lets you grep by date range:
#   ls cortex/adr/02-accepted/ | grep '^ADR-2026051'
# Use this when reconstructing a missing weekly from ground truth.

# 4. Session recall — ask yourself:
#    - What was the priority at week start?
#    - What actually got done vs paused?
#    - What emerged mid-week that wasn't planned?
#    - What pattern repeated across multiple days?
```

## Output: weekly/YYYY-Wxx.md

### Frontmatter (machine-readable; future agents read this first)

```yaml
---
period: 2026-05-01_to_2026-05-07
core_thread: "one-line synthesis of the week's unifying theme"
priority_at_start:
  - "what was planned"
priority_at_end:
  - "what actually became priority"
quests_advanced:
  - EPIC-xxx: epic name (status)
quests_unlocked:
  - "new task or epic that became actionable"
quests_paused:
  - "task or epic that was deferred"
parked_threads:
  - "noted but not pursued"
decisions_accepted:
  - ADR-xxx: decision title
retro_cells:
  planned_done: "what was planned and completed"
  planned_paused: "what was planned but didn't happen (and why)"
  emergent_done: "what emerged and earned attention"
  emergent_paused: "what emerged but was parked"
project_lesson_candidates:
  - "pattern that might become a wiki entry if it repeats"
references:
  daily: ["daily/2026-05-01.md", "daily/2026-05-02.md", ...]
  cortex_index: cortex/INDEX.md
---
```

### Body (~200-300 words, NOT a replay)

1. **TL;DR** (1 paragraph): core thread + the one decision that mattered most.
2. **4-Quadrant Retro** (table): planned vs emergent × done vs paused.
3. **Quest DAG**: ASCII or Mermaid diagram of epic/task flow.
4. **Project Lesson Candidates**: bullets for patterns worth crystallizing.
5. **Reference Pointers**: links to daily files and indexes. Don't replicate.

## The 4-Quadrant Retrospective

Compare *intended priorities* against *actual execution*:

| | **Done** | **Paused / Dropped** |
|---|---|---|
| **Planned** (priority at start) | ✅ Validated priorities — called right | ⚠️ Priority correction — why did it slip? |
| **Emergent** (surfaced mid-week) | 🌱 What proved deserving of attention | 📋 Noted-but-parked threads |

**Rule of thumb**: One concise line per cell explaining *what happened and why*. Not a task list.

## Salience Filter

> "太细节的小事不会在 weekly 里。特别强烈的印象会在。"

| Include | Exclude |
|---------|---------|
| Decisions that changed direction | Every commit message |
| Patterns across multiple days | Single-day bugs already fixed |
| Unblocked epics or tasks | Routine maintenance |
| Surprising findings from E2E | Formatting changes, refactors |
| Project traits worth documenting | Tool version bumps |

**Test**: If a future agent reading this weekly *cold* (no daily access) would mistake a detail for a non-event, it doesn't belong.

## Verify Companion

Before relying on a weekly for planning, spot-check its claims against ground truth:

```bash
# Does the recorded epic/task status match reality?
bunx @lythos/project-cortex@0.15.2 probe

# Does the git activity match the claimed period?
git log --since="2026-05-01" --until="2026-05-07" --oneline

# Do the referenced daily files exist?
ls daily/2026-05-*.md
```

Wrong facts in weekly = disaster for next agent. The agent owns this verification — there is no `validate-weekly` CLI; weekly is a pure skill that produces a doc, the agent uses cortex probe + git log + daily ls to reality-check what it just wrote.

## Gotchas

**Show draft before writing.** Present the weekly content to the user for confirmation. Prevents hallucinated synthesis from being persisted.

**Weekly ≠ daily rollup.** If it reads like 7 daily handoffs concatenated, it's wrong. Weekly is a *new layer of abstraction*.

**Emergent work is not failure.** If the "emergent + done" cell is full while "planned + done" is empty, that's not a planning failure — it's the project responding to E2E reality. Document the pattern, don't apologize.

**Cortex is optional.** If the project uses cortex, read active epics/tasks. If not, infer quest status from daily handoffs and git history.

## Supporting References

| When you need to… | Read |
|--------------------|------|
| Full frontmatter spec and examples | [references/weekly-format.md](./references/weekly-format.md) |
| Validate-companion pattern details | [references/verify-companion.md](./references/verify-companion.md) |
| Relationship with daily scribe + onboarding | [references/cqrs-architecture.md](./references/cqrs-architecture.md) |
