---
name: "Wiki: create without a title fails"
description: |
  `cortex wiki create` with no title must not fall through to a page
  titled "create".
---

## Given

- A cortex project initialized in a git repo

## When

- Run `cortex wiki create`

## Then

- CLI exits non-zero
- stderr contains "Wiki title required after"
- no new wiki file is created in `cortex/wiki/01-patterns/`
