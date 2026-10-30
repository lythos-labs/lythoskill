---
name: "Epic: bare title creates no epic"
description: |
  The legacy `epic "<title>" --lane ...` shorthand is removed. What used to
  create an epic is now an unknown subcommand that exits non-zero.
---

## Given

- A cortex project initialized in a git repo

## When

- Run `cortex epic "Fix login bug" --lane main`

## Then

- CLI exits non-zero
- stderr contains "Unknown epic subcommand"
- no new epic file is created in `cortex/epics/01-active/`
