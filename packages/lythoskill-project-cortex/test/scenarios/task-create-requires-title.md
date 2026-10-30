---
name: "Task: create without a title fails"
description: |
  `cortex task create` with no title must not fall through to a card
  titled "create".
---

## Given

- A cortex project initialized in a git repo

## When

- Run `cortex task create`

## Then

- CLI exits non-zero
- stderr contains "Task title required after"
- no new task file is created in `cortex/tasks/01-backlog/`
