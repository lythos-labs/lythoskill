# TASK-20260423102009000: Generate lythoskill Project Files

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| completed | 2026-04-23 | Migrated from old format |

## Background & Goal

Extract heredoc templates from raw chat log, fix ESM require bug, generate complete 10-file project with cortex governance.

Linked to: EPIC-20260423102000000, ADR-20260423101938000, ADR-20260423101950000

## Requirements

- [x] Extract exact heredoc content from chat log (no rewrite, preserve intent)
- [x] Fix `require('../package.json')` → `import pkg from '../package.json' with { type: 'json' }`
- [x] Fix string concatenation readability in starterCli help text
- [x] Add defensive `{ recursive: true }` note in build.ts cpSync
- [x] Create cortex governance (ADR + Epic + Task + Wiki + INDEX)

## Acceptance Criteria

- [x] All 10 project files exist at correct paths
- [x] starterCli template generates syntactically valid ESM
- [x] Build output verified (dist/ produces exactly 3 files)
- [x] KIMI_REF tags attached to all deliverables

## Progress Record

- 2026-04-23 14:00: Read raw chat log, extracted heredoc blocks
- 2026-04-23 14:05: Created ADR-20260423101938000 (thin skill pattern), ADR-20260423101950000 (ESM fix)
- 2026-04-23 14:10: Created EPIC-20260423102000000, TASK-20260423102009000, Wiki patterns
- 2026-04-23 14:15: Generated 10 project files with require fix
- 2026-04-23 14:20: Verified file integrity

## Git Commit Format

`(TASK-20260423102009000)`
