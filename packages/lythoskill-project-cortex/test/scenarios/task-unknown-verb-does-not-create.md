---
name: "Task: unknown verb creates no card"
description: |
  A hallucinated task verb (`strat`) must exit non-zero and write nothing.
  The old bare-title fallback turned it into an empty-shell card plus a ✅
  that the calling agent read as a successful transition.
---

## Given

- A cortex project initialized in a git repo

## When

- Run `cortex task strat TASK-TEST-001`

## Then

- CLI exits non-zero
- stderr contains "Unknown task subcommand"
- no new task file is created in `cortex/tasks/01-backlog/`
