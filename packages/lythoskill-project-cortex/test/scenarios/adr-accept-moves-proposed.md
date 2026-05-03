---
name: "ADR: accept moves proposed to accepted"
description: |
  Running `cortex adr accept ADR-TEST-001` moves the ADR from 01-proposed/ to
  02-accepted/.
---

## Given

- A cortex project initialized in a git repo
- An ADR `ADR-TEST-001` exists in `01-proposed/`

## When

- Run `cortex adr accept ADR-TEST-001`

## Then

- ADR file exists at `cortex/adr/02-accepted/ADR-TEST-001-*.md`
- ADR file does NOT exist in `01-proposed/`
