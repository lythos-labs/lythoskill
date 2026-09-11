---
name: "Status History: a card the buggy writer damaged is repaired by its next transition"
description: |
  The victim card of TASK-20260911080931450: `task start` → `task review` appended two
  bare rows to the end of the file (no heading, no table header), and `probe` then reported
  "Status History 为空或无记录" — the mechanism's defect, told as the card's defect.

  The fixture is that card's bytes as they are on disk right now (frozen). After one
  legitimate transition the next writer pass must (a) write the full block, (b) fold the
  two orphan rows, order-preserving, into the end of the canonical table, and (c) leave the
  reader's last row equal to the new status.
---

## Given

- A cortex project initialized in a git repo
- A writer-damaged task `TASK-20260909010058114` exists in `03-review/` with content from `test/fixtures/writer-damaged-task-card.md`

## When

- Run `cortex task reject TASK-20260909010058114`

## Then

- Task file exists at `cortex/tasks/02-in-progress/TASK-20260909010058114-*.md`
- Status History last record is `in-progress`
- The task file contains the verbatim Status History block
