# Session Handoff Protocol
## When to Handoff
Trigger any of:
- User says "let's stop here" / "先这样" / "LGTM"
- Conversation exceeds 50 turns
- User explicitly requests handoff
- A milestone is completed

## What to Write
Update `daily/YYYY-MM-DD.md` (scribe-managed) or a project-root handoff file.
Focus on what **file exploration cannot recover**:
- Pitfalls encountered (not in any file)
- True working-tree state (uncommitted decisions)
- Specific next steps with priority order
- Warnings for the next agent session
Do NOT repeat what `git log`, `ls`, `cat` can reveal.
## Handoff Structure
```markdown
# Session Handoff
## Last Updated
- Date: YYYY-MM-DD
- Session rounds: XX

## Current Epics
| Epic | Status | Key progress |
|------|--------|-------------|

## Key Tasks
### Completed this session
### In Progress (with blockers)
### Next Up (backlog priority)
## Open Issues
1. ...

## Warnings for Next Agent
- ...

## Startup Checklist
- [ ] Read latest `daily/YYYY-MM-DD.md` (or project handoff file)
- [ ] Check cortex/tasks/01-backlog/
- [ ] Run `bunx @lythos/project-cortex stats`
- [ ] Confirm with user if unclear
```

A full template is available at `${CLAUDE_SKILL_DIR}/assets/HANDOFF-TEMPLATE.md`.
## For New Agent Entering a Project
Read in this order:
1. Latest `daily/YYYY-MM-DD.md` (if using scribe) — highest priority, session-specific context
2. `cortex/INDEX.md` — project structure and document inventory
3. `git log --oneline -10` — recent code changes
4. `bunx @lythos/project-cortex list` — active tasks and epics

## Related Skills (Optional, Not Required)
- **lythoskill-project-scribe**: Manages `daily/` journal. If present, cortex
  task status appears in scribe's handoff automatically.
- **lythoskill-project-onboarding**: Structured layer loading for new sessions.
  Reads cortex INDEX.md as part of its onboarding flow.
Cortex works independently. These skills enhance but don't gate cortex functionality.
