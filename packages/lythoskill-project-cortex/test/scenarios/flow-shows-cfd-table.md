---
name: "Flow: kanban CFD shows task counts and WIP limits"
description: |
  `cortex flow` scans task directories and outputs a CFD table
  with count, avg age, and WIP limit status per column.
---

## Given

- A cortex project initialized in a git repo

## When

- Run `cortex flow`

## Then

- CLI exits 0
- stdout contains "backlog"
- stdout contains "in-progress"
- stdout contains "review"
- stdout contains "completed"
- stdout contains "WIP Limit"
- stdout contains "Pull signal"
