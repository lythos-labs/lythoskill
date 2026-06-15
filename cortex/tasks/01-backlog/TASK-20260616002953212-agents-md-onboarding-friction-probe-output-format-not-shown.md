# TASK-20260616002953212: AGENTS.md onboarding friction: probe output format not shown

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-06-15 | Created |

## Background & Goals

During AGENTS.md v2.1 onboarding testing, a zero-knowledge agent ran `cortex probe` and found 1 epic mismatch + 1 empty shell. The agent asked: "What does 'empty shell' mean? What should I do about it?"

The AGENTS.md says "check for state drift" but does not show what probe output looks like or what "drift" means in practice. This is a friction point — agent sees output but doesn't know how to interpret it.

## Requirements
- [ ] Add probe output example to AGENTS.md Troubleshooting or Boot First
- [ ] Explain common probe findings: epic mismatch, empty shell, stale task
- [ ] State what agent should do for each: investigate with `git log`, not auto-fix

## Technical Approach
- AGENTS.md §0 Boot First or §4 Troubleshooting: add a "What probe output looks like" subsection
- Example output block showing: epic mismatch, empty shell, clean state
- One-line guidance per finding type

## Acceptance Criteria
- [ ] New agent sees probe output example before running it
- [ ] Agent knows "empty shell" = task file with empty required sections
- [ ] Agent knows epic mismatch = file location disagrees with Status History
- [ ] Agent knows both require `git log` investigation, not auto-fix
- [ ] Tests pass: 0 fail

## Progress Log
<!-- Update during execution, with timestamps -->

## Related Files
- Modified: AGENTS.md

## Git Commit Message
```
docs(agents): add probe output example and drift interpretation guide (TASK-20260616002953212)

- Show what probe output looks like (epic mismatch, empty shell, clean)
- One-line guidance per finding type
- Emphasize: investigate with git log, don't auto-fix
```

## Notes
- Part of EPIC-20260615211529145 (SSOT CLI help and documentation governance)
