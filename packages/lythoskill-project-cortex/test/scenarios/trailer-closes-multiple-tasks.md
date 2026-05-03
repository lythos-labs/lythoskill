---
name: "Trailer: multiple trailers close multiple tasks"
description: |
  A commit with multiple `Closes:` trailers should dispatch completion for
  all referenced tasks.
---

## Given

- A cortex project initialized in a git repo
- A task `TASK-TEST-001` exists in `01-backlog/`
- A task `TASK-TEST-002` exists in `01-backlog/`

## When

- A commit is made with message body containing:
  ```
  Closes: TASK-TEST-001
  Closes: TASK-TEST-002
  ```
- The post-commit hook dispatches `task complete TASK-TEST-001`
- The post-commit hook dispatches `task complete TASK-TEST-002`

## Then

- Task file exists at `cortex/tasks/04-completed/TASK-TEST-001-*.md`
- Task file exists at `cortex/tasks/04-completed/TASK-TEST-002-*.md`
- Task file does NOT exist in `01-backlog/`
