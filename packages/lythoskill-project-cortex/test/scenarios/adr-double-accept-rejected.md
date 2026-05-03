---
name: "ADR: accept from rejected is invalid"
description: |
  Running `cortex adr accept` on a rejected ADR should fail with
  "Invalid transition" because rejected → accepted is not allowed.
---

## Given

- A cortex project initialized in a git repo
- An ADR `ADR-TEST-001` exists in `03-rejected/`

## When

- Run `cortex adr accept ADR-TEST-001`

## Then

- CLI exits non-zero
- stderr contains "Invalid transition"
- ADR file exists at `cortex/adr/03-rejected/ADR-TEST-001-*.md`
