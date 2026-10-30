---
name: "Wiki: unknown verb creates no page"
description: |
  A hallucinated wiki verb must exit non-zero and write nothing. The old
  bare-title fallback turned it into a new wiki page.
---

## Given

- A cortex project initialized in a git repo

## When

- Run `cortex wiki strat`

## Then

- CLI exits non-zero
- stderr contains "Unknown wiki subcommand"
- no new wiki file is created in `cortex/wiki/01-patterns/`
