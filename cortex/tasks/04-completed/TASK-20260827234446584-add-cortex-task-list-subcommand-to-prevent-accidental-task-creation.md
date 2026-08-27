# TASK-20260827234446584: Add cortex task list subcommand to prevent accidental task creation

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-08-27 | Created from user feedback |
| in-progress | 2026-08-27 | Started |
| completed | 2026-08-27 | Closed via trailer |

## Background & Goals

`cortex task` currently treats any non-verb second argument as a task title. This means `cortex task list` does not list tasks — it creates a task titled "list". This has been accidentally triggered more than once (latest: TASK-20260827233826168-list, since deleted).

Goal: make `cortex task list` behave intuitively by listing tasks, and update help text so users know the correct list command.

## Requirements

- [x] `cortex task list` lists tasks instead of creating a task titled "list".
- [x] Help text mentions `task list` as a valid subcommand.
- [x] Existing `cortex list` behavior remains unchanged.

## Technical Approach

1. In `packages/lythoskill-project-cortex/src/cli.ts`, add `list` to the `TASK_VERBS` array.
2. Handle `task list` before the create branch: call `listAll(config)` and exit.
3. Update `printHelp()` to include `task list`.
4. Also add `epic list` and `adr list` aliases for consistency, reusing the same list command.

## Acceptance Criteria

- [x] `bun packages/lythoskill-project-cortex/src/cli.ts task list` prints tasks without creating a new task file.
- [x] `cortex probe` passes after the change.
- [x] `bun --filter='*' run test` passes.

## Progress Log

- 2026-08-27 — Task created from user feedback.
- 2026-08-27 — Implemented `task list`, `epic list`, `adr list` aliases in `cli.ts`; verified no accidental task creation.

## Related Files
- Modified:
  - `packages/lythoskill-project-cortex/src/cli.ts`
- Added:
