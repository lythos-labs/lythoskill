---
name: "Trailer: malformed trailer is ignored"
description: |
  A commit with malformed trailer (e.g., "Close:" instead of "Closes:")
  should not trigger any state change. The task remains in backlog.
---

## Given

- A cortex project initialized in a git repo
- A task `TASK-TEST-001` exists in `01-backlog/`

## When

- A commit is made with message body containing:
  ```
  Close: TASK-TEST-001
  ```

## Then

- Task file exists at `cortex/tasks/01-backlog/TASK-TEST-001-*.md`
- Task file does NOT exist in `04-completed/`
