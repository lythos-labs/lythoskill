---
name: "ADR: reject moves proposed to rejected"
description: |
  Running `cortex adr reject ADR-TEST-001` moves the ADR from 01-proposed/ to
  03-rejected/.
---

## Given

- A cortex project initialized in a git repo
- An ADR `ADR-TEST-001` exists in `01-proposed/`

## When

- Run `cortex adr reject ADR-TEST-001`

## Then

- ADR file exists at `cortex/adr/03-rejected/ADR-TEST-001-*.md`
- ADR file does NOT exist in `01-proposed/`
