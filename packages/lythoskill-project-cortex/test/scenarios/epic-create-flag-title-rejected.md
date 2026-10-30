---
name: "Epic: a flag in title position is refused"
description: |
  `cortex epic create --lane main` must not create an epic titled "--lane".
  Note the epic runner appends `--skip-checklist "<reason>"` to every epic
  command (non-TTY), so this scenario can only ever exercise the *flag* half
  of the guard; the "no argument at all" half is pinned by the task, ADR and
  wiki equivalents, which take no injected flags.
---

## Given

- A cortex project initialized in a git repo

## When

- Run `cortex epic create --lane main`

## Then

- CLI exits non-zero
- stderr contains "Epic title required after"
- stderr contains "looks like a flag, not a title"
- no new epic file is created in `cortex/epics/01-active/`
