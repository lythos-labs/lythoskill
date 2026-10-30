---
name: "Epic: explicit create still works"
description: |
  `cortex epic create "<title>" --lane ...` remains the single creation entry point.
---

## Given

- A cortex project initialized in a git repo

## When

- Run `cortex epic create "User auth system" --lane main`

## Then

- CLI exits 0
- new epic file exists in `cortex/epics/01-active/`
