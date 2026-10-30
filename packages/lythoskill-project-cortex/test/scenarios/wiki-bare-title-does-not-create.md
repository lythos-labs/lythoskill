---
name: "Wiki: bare title creates no page"
description: |
  The legacy `wiki "<title>"` shorthand is removed. What used to create a wiki
  entry is now an unknown subcommand that exits non-zero.
---

## Given

- A cortex project initialized in a git repo

## When

- Run `cortex wiki "Dormancy property test"`

## Then

- CLI exits non-zero
- stderr contains "Unknown wiki subcommand"
- no new wiki file is created in `cortex/wiki/01-patterns/`
