---
name: "Wiki: explicit create still works"
description: |
  `cortex wiki create "<title>"` remains the single creation entry point.
---

## Given

- A cortex project initialized in a git repo

## When

- Run `cortex wiki create "Dormancy property test" --category pattern`

## Then

- CLI exits 0
- new wiki file exists in `cortex/wiki/01-patterns/`
