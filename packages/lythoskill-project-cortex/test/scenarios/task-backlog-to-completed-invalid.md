---
name: "Task: backlog to completed is invalid"
description: |
  Running `cortex complete` on a backlog task should fail because
  backlog → completed is not a valid transition.
---

## Given

- A cortex project initialized in a git repo
- A task `TASK-TEST-001` exists in `01-backlog/`

## When

- Run `cortex done TASK-TEST-001`

## Then

- CLI exits non-zero
- stderr contains "Invalid transition"
- Task file exists at `cortex/tasks/01-backlog/TASK-TEST-001-*.md`
