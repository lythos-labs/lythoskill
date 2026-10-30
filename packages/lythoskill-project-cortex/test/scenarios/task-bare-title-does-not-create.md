---
name: "Task: bare title creates no card"
description: |
  The legacy `task "<title>"` shorthand is removed. What used to create a
  card is now an unknown subcommand that exits non-zero.
---

## Given

- A cortex project initialized in a git repo

## When

- Run `cortex task "Fix login bug"`

## Then

- CLI exits non-zero
- stderr contains "Unknown task subcommand"
- no new task file is created in `cortex/tasks/01-backlog/`
