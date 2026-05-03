---
name: "Epic: suspend moves active to suspended"
description: |
  Running `cortex epic suspend EPIC-SUSPEND-001` moves the epic from 01-active/ to
  03-suspended/.
---

## Given

- A cortex project initialized in a git repo
- An epic `EPIC-SUSPEND-001` exists in `01-active/`

## When

- Run `cortex epic suspend EPIC-SUSPEND-001`

## Then

- Epic file exists at `cortex/epics/03-suspended/EPIC-SUSPEND-001-*.md`
- Epic file does NOT exist in `01-active/`
