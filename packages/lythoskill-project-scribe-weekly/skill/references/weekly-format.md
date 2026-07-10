# Weekly Format Specification

## File Naming

```
weekly/
├── 2026-W18.md   # ISO week 18 (2026-05-04 to 2026-05-10)
├── 2026-W19.md   # ISO week 19
└── ...           # Flat, no subdirectories
```

Use ISO week numbers: `YYYY-Wxx.md`. Monday = first day of week, Sunday = last.

**Period flexibility**: The `period` field records the actual span of work covered, not necessarily a strict Monday-Sunday window. If work naturally ran Friday-to-Thursday (e.g., around holidays or intense sprints), record that span. If a week had no active work, use the standard ISO Monday-Sunday span with "no active work" content. Always verify with the ISO week check in Pre-Write Verification.

## Frontmatter Schema

All fields are optional but strongly recommended. Omit empty fields rather than including null/empty values.

| Field | Type | Description |
|-------|------|-------------|
| `period` | string | `YYYY-MM-DD_to_YYYY-MM-DD` — inclusive start, inclusive end |
| `core_thread` | string | One-line synthesis. The unifying theme above all quadrants. |
| `priority_at_start` | string[] | What was planned at the beginning of the week. |
| `priority_at_end` | string[] | What actually became the priority by week's end. |
| `quests_advanced` | string[] | Epics/tasks that made meaningful progress. Format: `EPIC-xxx: name (status)` |
| `quests_unlocked` | string[] | New work that became actionable. |
| `quests_paused` | string[] | Work that was intentionally deferred. |
| `parked_threads` | string[] | Noted but not pursued (not necessarily paused — just acknowledged). |
| `decisions_accepted` | string[] | ADRs or major decisions ratified this week. |
| `retro_cells` | object | Four keys: `planned_done`, `planned_paused`, `emergent_done`, `emergent_paused` |
| `project_lesson_candidates` | string[] | Patterns that might become wiki entries if they repeat. |
| `docs_now_stale` | string[] | ADR/wiki entries that this week's decisions render outdated. Format: `ADR-xxx: reason` or `wiki path: reason`. Feeds dreaming skill priority queue. |
| `references` | object | `daily: string[]`, `cortex_index: string` |

## Pre-Write Verification (mandatory)

**Do not write the weekly from memory.** Run these commands and compare against your mental timeline:

```bash
# 0. ISO week alignment — verify period matches actual work dates
#    Weekly can be written on Fri/Sun/Mon; period should reflect actual work span,
#    not rigid ISO boundaries. Use this to confirm, not to force.
python3 -c "import datetime; d = datetime.date.today(); iso = d.isocalendar(); \
  mon = d - datetime.timedelta(days=d.weekday()); \
  sun = mon + datetime.timedelta(days=6); \
  print(f'Today: {d} ({d.strftime(\"%A\")}) — ISO W{iso.week}'); \
  print(f'Standard ISO: {mon}_to_{sun}'); \
  print(f'If writing today, period should cover actual work days, not necessarily Mon-Sun')"

# 1. Daily files — which days actually had work?
ls daily/*.md | sort | tail -7

# 2. Git activity — what actually got committed?
git log --since="7 days ago" --oneline

# 3. Cortex state — what moved?
bun packages/lythoskill-project-cortex/src/cli.ts probe
bun packages/lythoskill-project-cortex/src/cli.ts stats

# 4. ADR timeline — what decisions landed this week?
ls -lt cortex/adr/02-accepted/ | head -15

# 5. Check for existing weekly — if already written this week, append don't recreate
ls weekly/*.md | sort | tail -3
```

**Simulated-annealing ranking**: list every event you can recall from the week. Then:
1. **High temperature** — dump everything, don't filter
2. **Cool** — group related events into clusters
3. **Rank clusters** — which cluster, if a future agent missed it, would cause the most downstream confusion?
4. **Freeze** — the top 1-2 clusters are your `core_thread`. Clusters that involve superseded docs go into `docs_now_stale`.

**Test**: if a future ZK agent reads only this weekly + the daily files, can they correctly identify what changed and what's now stale? If the combo redefinition (May 6) would have been invisible to them, your weekly failed.

## Body Structure

### 1. TL;DR (1 paragraph, ~50 words)

The core thread + the single most important decision or finding. If an agent reads only this paragraph, they should understand what happened this week.

### 2. 4-Quadrant Retro (table + 1 line per cell)

```markdown
| | **Done** | **Paused / Dropped** |
|---|---|---|
| **Planned** | ✅ ... | ⚠️ ... |
| **Emergent** | 🌱 ... | 📋 ... |
```

Each cell: one concise sentence explaining *what* and *why*. No task lists. No commit hashes.

### 3. Quest DAG

ASCII art or Mermaid diagram showing which epics led to which. Focus on *flow*, not enumeration.

Example:
```
EPIC-A (agent-spawn)
    ├── closed: T1-T4
    └── deferred: T5-T7 → backlog
        ↓
EPIC-B (cold-pool) — emerged mid-week
    └── closed: T1-T13
        ↓
    Unlocked: reconcile command, metadata layer
```

### 4. Project Lesson Candidates

Bullets only. If a pattern repeats in 2+ weeks, promote to wiki.

### 5. Reference Pointers

```markdown
- Daily files: `daily/2026-05-04.md` through `daily/2026-05-10.md`
- Cortex index: `cortex/INDEX.md`
- Git activity: `git log --since="2026-05-04" --until="2026-05-10"`
```

## Example

See `weekly/2026-W19.md` in this repo for a complete example.
