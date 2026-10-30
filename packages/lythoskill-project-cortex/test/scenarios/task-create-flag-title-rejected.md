---
name: "Task: a flag-shaped title is refused"
description: |
  `cortex task create --lane main` must not create a card titled "--lane".
  The guard is shared (`requireCreateTitle`), so this scenario pins the
  `startsWith('-')` clause for all four document commands; without it, every
  other scenario stays green.
---

## Given

- A cortex project initialized in a git repo

## When

- Run `cortex task create --lane main`

## Then

- CLI exits non-zero
- stderr contains "Task title required after"
- stderr contains "looks like a flag, not a title"
- no new task file is created in `cortex/tasks/01-backlog/`
