---
name: lythoskill-project-scribe
version: 0.15.5
description: |
  Session context dump. Self-assess what the conversation contains that has
  NO other carrier (no task, no ADR, no epic) — pitfalls, working-tree anomalies,
  why-we-chose-this, specific next steps — and write to daily/YYYY-MM-DD.md.
  Things WITH structured carriers go to their carriers. Things WITHOUT
  carriers but needed by the next agent go here. Forms CQRS write-side pair
  with project-onboarding (read-side).
when_to_use: |
  Record progress, update task, write daily, log a pitfall, session  ending, handoff, LGTM, wrap up, context limit approaching,  踩坑了, 记录一下, 先到这里, 就这样, session 要结束了.
---

# Project Scribe
> Write what `ls` + `cat` + `git log` cannot recover. Skip everything else.
## Value Boundary

**Scribe = session context dump for things WITHOUT structured carriers.**

```
对话中产生了什么?
  ├── 有 task/adr/epic 载体 → 写到对应 carrier,不写 scribe
  └── 无载体 → 自评: 下一个 agent 需要知道吗?
        ├── 需要 → scribe
        └── 不需要 → 不写
```

| File exploration recovers (~70%) | Scribe must dump (~30%) |
|----------------------------------|------------------------|
| Project structure, tech stack | Pitfalls from this session |
| skill-deck.toml content | True working-tree state (prevents hallucination) |
| cortex/ tasks and epics | Why we chose A not B (not ADR-worthy but still important) |
| git log history | Specific next steps (not "test it") |
| README, docs | Temp artifacts: location + purpose |
| git diff (code changes) | Uncommitted modifications and their intent |
| | Meta-observations that emerge mid-conversation |

If the next agent can find it via `ls`, `cat`, or `git log` — don't repeat it.
## Pre-Handoff Checklist (mandatory before writing)
```bash
# 1. Git state
git status
git log --oneline -5
# 2. Cortex state (if cortex is active)
bunx @lythos/project-cortex@0.15.5 list
# 3. Session recall — ask yourself:
#    - What did I modify but not commit?
#    - What pitfalls did I hit?
#    - What important decisions were made verbally?
#    - What temp files did I create and where?
#    - What would the next agent most likely misunderstand?
```
## Template Usage

Scribe produces two file types. Follow the templates — they encode the
best-practice format that evolved from 100+ daily/weekly files.

| File type | Template | When to write |
|:---|:---|:---|
| **Daily** | [references/daily-template.md](./references/daily-template.md) | Every session ending |
| **Weekly** | [references/weekly-template.md](./references/weekly-template.md) | End of week (Sunday night) |

**Rule**: Do not invent format. If the template has a section, include it.
If a section is marked REQUIRED, it must be present even if empty (e.g.,
`quests_paused: []` proves you checked, not forgot).

## Core Operation: Write Daily File
Output goes to `daily/YYYY-MM-DD.md`. The first section must be `## Session Handoff`.
Human work logs follow after the handoff section.

```bash
# File location
daily/
├── 2026-04-23.md    # Yesterday's daily (contains handoff + work log)
├── 2026-04-24.md    # Today's daily
└── ...              # Flat date-based, no subdirectories
```

Multiple sessions on the same day: append a new `## Session Handoff` section
to the same file. The onboarding skill reads the **last** handoff section.

## Handoff Must Include Verification Commands
The handoff is not a snapshot — it's a snapshot **plus instructions to verify freshness**.
Always include in `## 0. Verify Current State`:
```markdown
## 0. Verify Current State
git diff <handoff-commit> --stat    # Construct "from T0 to now"
git status --short                  # Real-time working tree
git log --oneline -3                # Confirm recent commits match
```
If the reader runs these and output diverges from the handoff, the handoff is stale.
Real-time output takes precedence.
## Pitfall Recording
When the user says "hit a bug" or "踩坑了", immediately record:
```markdown
### Pitfall: <short description>
- **Wrong approach**: what was tried
- **Symptom**: error message or behavior
- **Fix**: what actually worked
- **Root cause**: why the wrong path seemed right
- **Time wasted**: X minutes
```
## Handoff Triggers (session must execute handoff when any fires)
- User says "LGTM", "就这样", "先到这里", "session ending"
- Conversation exceeds 20 turns or context approaches limit
- A milestone is completed (build succeeds, push to remote, tests pass)
- User says "switch agent" or "换个 agent 继续"
## Gotchas
**Show diff before writing.** Always present the handoff content to the user
for confirmation before writing to the daily file. Prevents hallucinated state
from being persisted.
**Daily file = handoff + log.** Do not create a separate HANDOFF.md.
The daily file is the single source of truth. The onboarding skill reads
from it directly.
**Diff artifacts ≠ working tree.** If you generated code in a diff artifact
during the conversation but haven't written it to disk, explicitly warn in the
handoff: "⚠️ The following changes are in conversation artifacts only, not on disk."
**Cortex is optional.** If the project uses cortex, read active tasks/epics
during the pre-handoff check. If not, skip — scribe works independently.

## Supporting References
| When you need to… | Read |
|--------------------|------|
| See the full daily file template with all sections | [references/daily-template.md](./references/daily-template.md) |
| See the weekly file template (YAML + markdown body) | [references/weekly-template.md](./references/weekly-template.md) |
| Understand the CQRS relationship with onboarding | [references/cqrs-architecture.md](./references/cqrs-architecture.md) |
| Set up automation triggers (hooks, events) | [references/automation-triggers.md](./references/automation-triggers.md) |
