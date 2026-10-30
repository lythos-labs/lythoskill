---
name: "ADR: bare title creates no ADR"
description: |
  The legacy `adr "<title>"` shorthand is removed. What used to create an ADR
  is now an unknown subcommand that exits non-zero.
---

## Given

- A cortex project initialized in a git repo

## When

- Run `cortex adr "Choose database"`

## Then

- CLI exits non-zero
- stderr contains "Unknown ADR subcommand"
- no new ADR file is created in `cortex/adr/01-proposed/`
