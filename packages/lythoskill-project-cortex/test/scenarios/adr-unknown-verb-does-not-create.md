---
name: "ADR: unknown verb creates no ADR"
description: |
  A hallucinated ADR verb must exit non-zero and write nothing. The old
  bare-title fallback turned it into a new ADR in 01-proposed/.
---

## Given

- A cortex project initialized in a git repo

## When

- Run `cortex adr strat`

## Then

- CLI exits non-zero
- stderr contains "Unknown ADR subcommand"
- no new adr file is created in `cortex/adr/01-proposed/`
