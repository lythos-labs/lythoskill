---
name: "Epic: resume moves suspended to active"
description: |
  Running `cortex epic resume EPIC-RESUME-001` moves the epic from 03-suspended/ to
  01-active/.
---

## Given

- A cortex project initialized in a git repo
- An epic `EPIC-RESUME-001` exists in `03-suspended/`

## When

- Run `cortex epic resume EPIC-RESUME-001`

## Then

- Epic file exists at `cortex/epics/01-active/EPIC-RESUME-001-*.md`
- Epic file does NOT exist in `03-suspended/`
