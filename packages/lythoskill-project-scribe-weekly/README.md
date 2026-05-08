# @lythos/project-scribe-weekly

Weekly synthesis skill for lythoskill projects. Distills 7 days of daily handoffs into a frontmatter-rich retrospective — not a replay.

## What It Does

- Reads last 7 `daily/YYYY-MM-DD.md` files
- Reads `cortex/INDEX.md` and epic status
- Produces `weekly/YYYY-Wxx.md` with:
  - **Core thread**: the one unifying theme
  - **4-quadrant retro**: planned vs emergent × done vs paused
  - **Quest DAG**: epic/task flow diagram
  - **Lesson candidates**: patterns worth crystallizing

## What It Does NOT Do

- ❌ Replay git log (that's `git log --since`)
- ❌ List every commit (that's `ls daily/`)
- ❌ Auto-schedule (player decides timing)
- ❌ Modify skills, files, or deck state

## Usage

```bash
# As a skill (recommended)
/lythoskill-project-scribe-weekly

# Or directly
bun packages/lythoskill-project-scribe-weekly/skill/SKILL.md
```

## Design Philosophy

> "太细节的小事不会在 weekly 里。特别强烈的印象会在。"

Weekly is a *new layer of abstraction* above daily. If it reads like 7 dailies concatenated, it's wrong.

## Relationship

| Tool | Artifact | Frequency | Role |
|------|----------|-----------|------|
| project-scribe | `daily/YYYY-MM-DD.md` | Per session | Write-side |
| project-onboarding | reads latest daily | Per session | Read-side |
| **project-scribe-weekly** | `weekly/YYYY-Wxx.md` | Per week | **Synthesis** |

## References

- [SKILL.md](skill/SKILL.md) — Full agent instructions
- [Weekly Format](skill/references/weekly-format.md) — Frontmatter schema and body structure
- [Verify Companion](skill/references/verify-companion.md) — Reality-check before relying on weekly
