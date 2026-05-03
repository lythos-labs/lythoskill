---
name: "Lane: main full rejects new epic"
description: |
  When main lane already has 1 active epic, creating a second epic with
  `--lane main` should be rejected.
---

## Given

- A cortex project initialized
- An epic `EPIC-MAIN-001` exists in `01-active/` with `lane: main`

## When

- Run `cortex epic "Second focus" --lane main`

## Then

- CLI exits non-zero
- stderr contains "Cannot create another" or similar
- No new epic file is created in `01-active/`
