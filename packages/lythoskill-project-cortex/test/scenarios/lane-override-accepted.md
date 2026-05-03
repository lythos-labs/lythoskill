---
name: "Lane: override bypasses full lane"
description: |
  When main lane is full, `--override "reason"` should allow creation
  and record the reason in frontmatter.
---

## Given

- A cortex project initialized
- An epic `EPIC-MAIN-001` exists in `01-active/` with `lane: main`

## When

- Run `cortex epic "Emergency refactor" --lane main --override "security incident"`

## Then

- CLI exits 0
- New epic file exists in `01-active/`
- Frontmatter contains `lane_override_reason: "security incident"`
