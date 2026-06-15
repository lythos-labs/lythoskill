# TASK-20260616003015674: AGENTS.md onboarding friction: daily handoff format unknown

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-06-15 | Created |
| in-progress | 2026-06-15 | Started |
| review | 2026-06-15 | Deliverables committed |

## Background & Goals

During AGENTS.md v2.1 onboarding testing, a zero-knowledge agent read `daily/2026-06-15.md` but asked: "What structure should I expect? Is it freeform? Does it have frontmatter?"

The AGENTS.md says "read daily/YYYY-MM-DD.md" but does not describe what a daily handoff looks like. This is a friction point — agent doesn't know what information to look for or how to verify freshness.

## Requirements
- [ ] Add daily handoff structure description to AGENTS.md Boot First
- [ ] List key sections: Git Commit, Session Summary, Task Status, Epic Status, Pitfalls, Next Steps
- [ ] Explain freshness check: compare handoff's `git_commit` with current HEAD
- [ ] Reference `daily-template.md` for full format

## Technical Approach
- AGENTS.md §0 Boot First "After executing — now read": add bullet about daily structure
- 3-4 lines: what sections exist, what to look for, how to check freshness
- Link to `packages/lythoskill-project-scribe/skill/references/daily-template.md` for full format

## Acceptance Criteria
- [ ] New agent knows daily handoff has structured sections (not freeform)
- [ ] Agent knows to check `git_commit` vs HEAD for freshness
- [ ] Agent knows where to find the template for full format
- [ ] Tests pass: 0 fail

## Progress Log
<!-- Update during execution, with timestamps -->

## Related Files
- Modified: AGENTS.md

## Git Commit Message
```
docs(agents): add daily handoff structure guide to Boot First (TASK-20260616003015674)

- List key sections: Git Commit, Session Summary, Task/Epic Status, Pitfalls, Next Steps
- Freshness check: git_commit vs HEAD
- Link to daily-template.md for full format
```

## Notes
- Part of EPIC-20260615211529145 (SSOT CLI help and documentation governance)
