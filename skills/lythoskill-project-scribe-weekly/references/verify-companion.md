# Verify Companion Pattern for Weekly

Every agent-produced state summary needs a paired reality-check command. Weekly is no exception.

## Why Verify

A weekly with wrong epic states, incorrect priority claims, or phantom tasks is worse than no weekly — it misleads the next agent. The verify companion catches these before they propagate.

## Manual Verification

```bash
# 1. Epic status reality-check
bunx @lythos/project-cortex@latest probe

# 2. Git activity matches claimed period
git log --since="2026-05-04" --until="2026-05-10" --oneline

# 3. Daily files exist for claimed period
ls daily/2026-05-04.md daily/2026-05-05.md ...

# 4. Cross-check quest claims
grep -r "EPIC-20260507020846020" cortex/tasks/
```

## Automated Verification (future)

```bash
# Validate weekly file structure and cross-reference claims
bunx @lythos/skill-creator@latest validate-weekly weekly/2026-W19.md
```

Checks:
- Frontmatter schema valid
- Referenced daily files exist
- Referenced epics exist in cortex
- `quests_advanced` epics are not in `quests_paused`
- Git activity exists for claimed period
- No duplicate entries across quadrants

## When to Verify

- Before using a weekly for next-week planning
- Before sharing a weekly with another agent
- When resuming work after a gap > 3 days

## Failure Handling

If verification fails:
1. Flag the discrepancy in the weekly file itself (edit in place)
2. Re-run scribe-weekly with corrected inputs
3. Do NOT silently fix — the discrepancy may reveal a deeper drift
