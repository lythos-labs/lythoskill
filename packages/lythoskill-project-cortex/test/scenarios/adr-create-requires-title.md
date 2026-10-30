---
name: "ADR: create without a title fails"
description: |
  `cortex adr create` with no title must not fall through to an ADR
  titled "create".
---

## Given

- A cortex project initialized in a git repo

## When

- Run `cortex adr create`

## Then

- CLI exits non-zero
- stderr contains "ADR title required after"
- no new ADR file is created in `cortex/adr/01-proposed/`
