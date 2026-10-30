---
name: "ADR: explicit create still works"
description: |
  `cortex adr create "<title>"` remains the single creation entry point.
---

## Given

- A cortex project initialized in a git repo

## When

- Run `cortex adr create "Choose database"`

## Then

- CLI exits 0
- new adr file exists in `cortex/adr/01-proposed/`
