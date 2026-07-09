# TASK-20260616002926373: AGENTS.md onboarding friction: bun install prerequisite not stated

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-06-15 | Created |
| in-progress | 2026-06-15 | Started |
| review | 2026-06-15 | Deliverables committed |
| completed | 2026-07-09 | Done |

## Background & Goals

During AGENTS.md v2.1 onboarding testing, a zero-knowledge agent asked: "what if bun is not installed?" The Boot First section assumes `bun` is available but does not state this prerequisite or provide fallback instructions.

This is a friction point for agents (and humans) working in environments where Bun is not pre-installed.

## Requirements
- [x] Add Bun prerequisite check to AGENTS.md Boot First
- [x] Provide fallback instruction: "install from https://bun.sh if `bun` command not found"
- [x] Keep it concise — one line, not a tutorial

## Technical Approach
- AGENTS.md §0 Boot First: add step 0 or modify step 1 to include prerequisite check
- Example: `which bun || (echo "Bun not found. Install from https://bun.sh" && exit 1)`
- Or: add a note line before `bun install`: "Prerequisite: Bun runtime. Install from https://bun.sh if missing."

## Acceptance Criteria
- [x] New agent sees prerequisite before attempting `bun install`
- [x] Instruction is actionable (URL provided)
- [x] No more than 2 lines added to Boot First
- [x] Tests pass: 0 fail

## Progress Log
<!-- Update during execution, with timestamps -->

## Related Files
- Modified: AGENTS.md

## Git Commit Message
```
docs(agents): add Bun prerequisite to Boot First (TASK-20260616002926373)

- One-line prerequisite check before bun install
- Fallback URL for Bun installation
```

## Notes
- Part of EPIC-20260615211529145 (SSOT CLI help and documentation governance)
