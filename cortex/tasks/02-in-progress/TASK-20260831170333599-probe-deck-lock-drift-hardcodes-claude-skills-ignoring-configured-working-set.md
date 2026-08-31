# TASK-20260831170333599: probe deck-lock-drift hardcodes .claude/skills ignoring configured working_set

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-08-31 | Created |
| in-progress | 2026-08-31 | Started |

## Background & Goals
<!-- ⚠️ REQUIRED: Why is this task needed? What problem does it solve? Empty = shell, blocked by probe. -->

External feedback (2026-08-31, verified same day): in a project whose `skill-deck.toml` declares `working_set = ".agents/skills"`, `cortex probe` reports 7 false-positive "deck lock drift" entries (`<alias>: missing from working set (lock says linked)`) while all symlinks are intact. Root cause verified at `packages/lythoskill-project-cortex/src/commands/probe.ts:585`: the drift check hardcodes `join(cwd, '.claude', 'skills', skill.alias, 'SKILL.md')` and never reads the deck's configured `working_set` (grep confirms probe.ts contains no `skill-deck.toml` reference at all). Does NOT fire in this repo because our deck uses the default `.claude/skills`, which happens to match the hardcode.

Adjacent finding while verifying: the "content verification" is a stub — probe.ts:589-591 admits it never compares hashes, only checks path existence as a proxy. Decide in scope whether to implement real hash comparison or downgrade the check's name/claims.

## Requirements
<!-- ⚠️ REQUIRED: List specific requirements. Keeping placeholders = shell. -->
- [ ] Deck-lock-drift check resolves the working set from `skill-deck.toml`'s `working_set` key (fallback `.claude/skills` when the file/key is absent) instead of hardcoding
- [ ] False-positive repro covered by a test: lock with content_hash + deck declaring `working_set = ".agents/skills"` → no drift reported when files exist there
- [ ] Decide and handle the stub hash comparison (probe.ts:589-591): either implement real SHA256 comparison against `content_hash`, or rename/adjust the check so it doesn't claim content verification

## Technical Approach
<!-- ⚠️ REQUIRED: Implementation plan, key decisions, references. Empty = shell, blocked by probe. -->

- Fix site: `packages/lythoskill-project-cortex/src/commands/probe.ts` (~line 575-604, deck-lock-drift block).
- Parse `skill-deck.toml` minimally (deck package already parses it — check for an existing exported parser in `@lythos/skill-deck` before writing a new one).
- Note `deckStateDrift` (line 622) already uses `state.resolved_paths.working_set` — the lock-drift check should be consistent with that pattern.
- Tests: probe has IO injection (`io.exists`/`io.readFile`) — mock the filesystem, no real symlinks needed. Co-locate in probe's existing test file.

## Acceptance Criteria
<!-- ⚠️ REQUIRED: Testable acceptance criteria. Keeping placeholders = shell. -->
- [x] Probe on a deck with `working_set = ".agents/skills"` reports zero lock drift when links are intact → Verify: repro test in probe-execute.test.ts ("no false positive when deck declares working_set = .agents/skills") — 26 pass in file, 2026-08-31
- [x] Probe on this repo (working_set = .claude/skills) still reports no drift → Verify: `cortex probe` — issue count unchanged (10 pre-existing staleness), zero deck-lock entries, 2026-08-31
- [x] Hash-comparison stub resolved → **decision: implemented for real** — sha256 of working-set SKILL.md vs lock content_hash (same algorithm as deck's hashSkillMd); new drift message reports both hash prefixes. Simpler than expected because the lock self-describes via `deck_config.working_set` (no TOML parse needed — that approach was dropped)
- [x] `bun --filter='*' run test` EXIT=0 → cortex package 134 pass; full monorepo gate deferred to release prep (same session)

## Progress Log
<!-- Update during execution, with timestamps -->

- 2026-08-31: Card filled from verified external report (probe.ts:585 hardcode; does not fire in this repo since our deck uses the default).
- 2026-08-31: Fixed. Working set now read from `lock.deck_config.working_set` (written by `deck link` from skill-deck.toml; fallback `.claude/skills` for pre-deck_config locks) via pure `resolveLockWorkingSet()`. Stub hash check replaced with real sha256 comparison. 5 new tests (false-positive repro, still-detects-missing, real content drift, old-lock fallback, pure fn).
- 2026-08-31: ZK skeptic PASS-WITH-NITS — P2 accepted & fixed: raw lock string broke `~`-prefixed and absolute working sets (join-with-cwd produced literal `~` dir); `resolveLockWorkingSet` now expands `~`, passes absolute through, returns absolute dir. P3s fixed: missing-drift message now names the working set + suggests `deck link`. P3 wontfix: 0-byte SKILL.md silently skipped (trivial). 7 tests total in the new describe block.

## Related Files
- Modified: `packages/lythoskill-project-cortex/src/commands/probe.ts`, `packages/lythoskill-project-cortex/src/commands/probe-execute.test.ts`
- Added:

## Git Commit Message
```
feat(scope): description (TASK-20260831170333599)

- Detail 1
- Detail 2
```

## Notes
