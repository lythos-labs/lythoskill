---
name: "Task: explicit create still works"
description: |
  `cortex task create "<title>"` remains the single creation entry point.
---

## Given

- A cortex project initialized in a git repo

## When

- Run `cortex task create "Fix login redirect bug"`

## Then

- CLI exits 0
- new task file exists in `cortex/tasks/01-backlog/`
