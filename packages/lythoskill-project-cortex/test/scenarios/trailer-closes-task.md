---
name: "Trailer: Closes moves task to completed"
description: |
  A commit with `Closes: TASK-xxx` trailer should trigger the post-commit
  hook (or equivalent CLI dispatch) to move the task from any status to
  completed.
---

## Given

- A cortex project initialized in a git repo
- A task `TASK-TEST-001` exists in `01-backlog/`

## When

- A commit is made with message body containing:
  ```
  Closes: TASK-TEST-001
  ```
- The post-commit hook dispatches `task complete TASK-TEST-001`

## Then

- Task file exists at `cortex/tasks/04-completed/TASK-TEST-001-*.md`
- Task file does NOT exist in `01-backlog/`
- Status History last record is `completed`
- INDEX.md was regenerated
