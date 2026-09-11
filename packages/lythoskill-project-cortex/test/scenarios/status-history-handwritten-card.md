---
name: "Status History: a hand-written card gets the full block"
description: |
  A card that did NOT come from `template.ts` — it carries no `## Status History`
  section at all. Before TASK-20260911080931450 the writer appended a bare row
  (`| status | date | note |`, no heading, no table header) to any such card, i.e. the CLI
  wrote a format the CLI's own reader could not read. Writer and reader now share one
  shape definition (lib/status-history.ts).

  The fixture is a real card, byte-for-byte (`TASK-20260909010058114` minus the two bare
  rows the buggy writer appended to it) — not an invented one, and not a template card:
  `createTaskTemplate` always emits a correct section, which is why this defect was
  invisible to the BDD suite from day one.
---

## Given

- A cortex project initialized in a git repo
- A hand-written task `TASK-20260909010058114` exists in `01-backlog/` with content from `test/fixtures/handwritten-task-card.md`

## When

- Run `cortex task start TASK-20260909010058114`

## Then

- Task file exists at `cortex/tasks/02-in-progress/TASK-20260909010058114-*.md`
- Status History last record is `in-progress`
- The task file contains the verbatim Status History block
