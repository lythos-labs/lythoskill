# TASK-20260616002855133: AGENTS.md onboarding friction: skill-deck.lock drift after deck link

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-06-15 | Created |
| in-progress | 2026-06-15 | Started |
| review | 2026-06-15 | Deliverables committed |
| completed | 2026-07-09 | Done |

## Background & Goals

During AGENTS.md v2.1 onboarding testing (TASK-20260615234143099), a zero-knowledge agent executed `deck link` as part of Boot First, then saw `skill-deck.lock` as modified in `git status`. The agent flagged this as "unexpected" and asked whether it should be committed.

Root cause: `skill-deck.lock` mixes declarative lock (content hash) with operational state (linked_at timestamp). Every `deck link` updates the timestamp even when no skill content has changed.

This is friction in the onboarding flow that should not exist. See ADR-20260616000939948 for the architecture decision.

## Requirements
- [x] Implement `skill-deck.state` (git-ignored) for operational state: linked_at, resolved absolute paths, mode
- [x] Make `skill-deck.lock` (git-tracked) idempotent: only update when content_hash changes
- [x] Update `deck link` to write both files
- [x] Update `deck validate` to check both files
- [x] Update `probe` to use `.state` for operational checks, `.lock` for content verification
- [x] Add `skill-deck.state` to `.gitignore`
- [x] Migration: on first run, split existing `skill-deck.lock` into both files
- [x] After implementation: remove `skill-deck.lock` drift warning from AGENTS.md Boot First

## Technical Approach
- `packages/lythoskill-deck/src/link.ts`: write `.state` always, `.lock` only when content_hash changes
- `packages/lythoskill-deck/src/validate.ts`: check `.lock` content hashes match, `.state` paths exist
- `packages/lythoskill-project-cortex/src/probe.ts`: use `.state` for operational drift, `.lock` for content drift
- `.gitignore`: add `skill-deck.state`
- Migration: if `.state` missing, read `.lock` and split fields

## Acceptance Criteria
- [x] `deck link` produces clean `git status` when no skill content changed
- [x] Agent executing Boot First sees no unstaged modifications after `deck link`
- [x] `skill-deck.lock` changes only when skill content changes
- [x] `skill-deck.state` contains absolute paths and timestamps
- [x] Tests pass: 0 fail

## Progress Log
<!-- Update during execution, with timestamps -->

## Related Files
- Modified: packages/lythoskill-deck/src/link.ts, packages/lythoskill-deck/src/validate.ts, packages/lythoskill-project-cortex/src/probe.ts, .gitignore, AGENTS.md
- Added: skill-deck.state schema

## Git Commit Message
```
feat(deck): split skill-deck.lock into declarative lock and operational state (TASK-20260616002855133)

- skill-deck.lock: idempotent, only updates when content_hash changes
- skill-deck.state: git-ignored, stores linked_at, absolute paths, mode
- deck link writes both files
- probe uses .state for operational checks, .lock for content verification
- Migration: existing .lock auto-split on first run
```

## Notes
- Depends on ADR-20260616000939948 (accepted)
- Part of EPIC-20260615211529145 (SSOT CLI help and documentation governance)
