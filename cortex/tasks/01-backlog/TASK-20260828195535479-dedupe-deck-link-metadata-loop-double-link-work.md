# TASK-20260828195535479: dedupe deck link metadata loop double link work

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-08-28 | Created |

## Background & Goals
<!-- ⚠️ REQUIRED: Why is this task needed? What problem does it solve? Empty = shell, blocked by probe. -->

Registered from the user-sim review of TASK-20260827131734254 (P3: identified redundancy without follow-up). The 2026-08-28 ZK review of the double-print bug found the real structure: `packages/lythoskill-deck/src/link.ts` runs the actual link work TWICE for the working set — once inside `reconcileTargetDir` and again in the metadata loop (~lines 610-632: lstat → rm → mkdir → symlink/cp per item). TASK-…34254 fixed the output symptom (duplicate print) and explicitly declared this redundancy 不做 (output only).

The double work is idempotent but wasteful and — worse — a second mutation path that can drift from the first (the metadata loop's link logic duplicates reconcileTargetDir's instead of reusing it).

## Requirements
<!-- ⚠️ REQUIRED: List specific requirements. Keeping placeholders = shell. -->
- [ ] R1 (必达) Metadata loop reuses reconcileTargetDir's result (or is restructured to only collect metadata) — link work happens exactly once per destination
- [ ] R2 (必达) Behavior-preserving: state file contents, backup behavior, and output stay identical except where the duplication was observable
- **不做**: no reconcileTargetDir semantics changes; no also_link_to flow changes

## Technical Approach
<!-- ⚠️ REQUIRED: Implementation plan, key decisions, references. Empty = shell, blocked by probe. -->
- `packages/lythoskill-deck/src/link.ts`: reconcileTargetDir (~line 540-569) does link work; metadata loop (~610-666) re-links then extracts frontmatter/hash. The clean fix is likely: metadata loop collects metadata from the already-linked dest without rm/re-create.
- Tests: `link.test.ts` — the `link output` and `working_set switch warning` describes (TASK-…34254/…34189) must stay green; add an assertion that each skill is linked once if cheaply observable (e.g. spy via fixture mtimes or a counter seam).

## Acceptance Criteria
<!-- ⚠️ REQUIRED: Testable acceptance criteria. Keeping placeholders = shell. -->
- [ ] Link work runs once per destination (assert via test) → Verify: `bun --filter='@lythos/skill-deck' run test`
- [ ] `deck link` on this repo produces identical `.claude/skills` + `.agents/skills` content and state as before → Verify: run before/after, diff
- [ ] `bun --filter='*' run test` green → Verify: run it (canonical)

## Progress Log
<!-- Update during execution, with timestamps -->

- 2026-08-28: Registered from user-sim review P3. Redundancy identified in TASK-20260827131734254's Technical Approach and explicitly deferred there (不做 = output only).

## Related Files
- Modified: packages/lythoskill-deck/src/link.ts (pending)
- Added: (none)

## Git Commit Message
```
refactor(deck): link work once per destination — metadata loop stops re-linking (TASK-20260828195535479)
```

## Notes
