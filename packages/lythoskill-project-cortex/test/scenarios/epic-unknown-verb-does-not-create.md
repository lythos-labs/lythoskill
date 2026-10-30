---
name: "Epic: unknown verb creates no epic"
description: |
  A hallucinated epic verb must exit non-zero and write nothing. The old
  bare-title fallback turned it into a new epic.
---

## Given

- A cortex project initialized in a git repo

## When

- Run `cortex epic strat --lane main`

## Then

- CLI exits non-zero
- stderr contains "Unknown epic subcommand"
- no new epic file is created in `cortex/epics/01-active/`
