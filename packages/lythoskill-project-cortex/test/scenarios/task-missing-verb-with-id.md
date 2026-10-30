---
name: "Task: ID without a verb fails with a hint"
description: |
  `cortex task TASK-...` (verb omitted) must name the missing verb instead
  of creating a card titled with the ID.
---

## Given

- A cortex project initialized in a git repo

## When

- Run `cortex task TASK-20260101000000000`

## Then

- CLI exits non-zero
- stderr contains "Missing task verb"
- no new task file is created in `cortex/tasks/01-backlog/`
