# Weekly Format Specification

## File Naming

```
weekly/
├── 2026-W18.md   # ISO week 18 (2026-05-04 to 2026-05-10)
├── 2026-W19.md   # ISO week 19
└── ...           # Flat, no subdirectories
```

Use ISO week numbers: `YYYY-Wxx.md`. Monday = first day of week, Sunday = last.

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
| `references` | object | `daily: string[]`, `cortex_index: string` |

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
