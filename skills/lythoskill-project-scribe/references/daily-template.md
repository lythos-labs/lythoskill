# Daily File Template
File: `daily/YYYY-MM-DD.md`

```markdown
# YYYY-MM-DD
## Session Handoff
### 0. Verify Current State
```bash
git diff <commit-hash> --stat
git status --short
git log --oneline -3
```

### Ground Truth State
- **Branch**: main
- **HEAD**: <commit-hash> "<message>"
- **Uncommitted**: list files or "clean"
- **Untracked**: list files or "none"
### What Happened This Session
- Bullet summary of key actions (only what isn't in git log)
### Pitfalls
(see pitfall format in SKILL.md)
### Next Steps (prioritized)
1. Most important next action (specific, not "continue testing")
2. Second priority
3. Third priority
### Warnings for Next Agent
- Things that are easy to misunderstand about current state
- Temp artifacts that look like real files but aren't committed
---

## Work Log (human notes below this line)
- 10:30 — started working on X
- 14:00 — user testing revealed Y
```

## Multiple Sessions Per Day
If a second session starts on the same day, append a new handoff section
with a time qualifier:

```markdown
## Session Handoff (afternoon)
...
```

The onboarding skill reads the **last** handoff section in the file.
