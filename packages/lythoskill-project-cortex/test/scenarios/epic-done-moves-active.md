---
name: "Epic: done moves active to done"
description: |
  Running `cortex epic done EPIC-DONE-001` moves the epic from 01-active/ to
  02-done/.
---

## Given

- A cortex project initialized in a git repo
- An epic `EPIC-DONE-001` exists in `01-active/`

## When

- Run `cortex epic done EPIC-DONE-001`

## Then

- Epic file exists at `cortex/epics/02-done/EPIC-DONE-001-*.md`
- Epic file does NOT exist in `01-active/`
