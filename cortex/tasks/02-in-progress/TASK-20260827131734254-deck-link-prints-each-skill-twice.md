# TASK-20260827131734254: deck-link-prints-each-skill-twice

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-08-27 | Created |
| in-progress | 2026-08-28 | Started |

## Background & Goals
<!-- ⚠️ REQUIRED: Why is this task needed? What problem does it solve? Empty = shell, blocked by probe. -->

Found by ZK external-onboarding trial (2026-08-27, agent-14): every `deck link` run prints each skill twice:

```
🔗 tdd
🔗 diagnosing-bugs
🔗 tdd
🔗 diagnosing-bugs
```

Cosmetic, but on a user's first run it suggests something executed twice — undermines confidence in the reconciler's output at exactly the trust-building moment. Dual output (.claude/skills + .agents/skills fan-out) is the likely cause, but even so each destination should print its own header, not an undifferentiated repeat.

## Requirements
<!-- ⚠️ REQUIRED: List specific requirements. Keeping placeholders = shell. -->
- [x] R1 (必达) Each skill prints once per actual destination, with the destination labeled (or once total if only one destination) → dropped the duplicate metadata-loop print; destinations labeled via `📁 working_set:` / `📋 also_link_to:` headers
- **不做**: no change to sync semantics — output only

## Technical Approach
<!-- ⚠️ REQUIRED: Implementation plan, key decisions, references. Empty = shell, blocked by probe. -->
- `packages/lythoskill-deck/src/link.ts` output path. ZK review (2026-08-28) checked the dual-sync hypothesis: the real cause is a **single-destination double-print** — `🔗 ${item.alias}` is printed inside `reconcileTargetDir` (~line 567) and again in the metadata loop (~line 642). The fan-out is NOT the cause. Note: the metadata loop (~lines 585-607) also re-creates symlinks (link work runs twice for WORKING_SET) — **do NOT touch that here**; 不做 = output only, drop one print.
- Test: capture link output in a fixture, assert no duplicate undifferentiated lines

## Acceptance Criteria
<!-- ⚠️ REQUIRED: Testable acceptance criteria. Keeping placeholders = shell. -->
- [x] `bun packages/lythoskill-deck/src/cli.ts link` on the quick-start deck prints each skill once per destination, destinations labeled → verified live 2026-08-28: `📁 working_set: .claude/skills` / `📋 also_link_to: .agents/skills` headers, each skill exactly once per destination
- [x] `bun --filter=@lythos/skill-deck run test` green → canonical gate EXIT=0 (2026-08-28), output assertions in link.test.ts (`link output` describe)

## Progress Log
<!-- Update during execution, with timestamps -->

- 2026-08-28: Implemented. Dropped the duplicate `🔗` print in the metadata loop (ZK-identified root cause: single-destination double-print, NOT fan-out); added `📁 working_set:` / `📋 also_link_to:` destination headers. Metadata loop's symlink re-creation intentionally untouched (不做). Verified live on the repo's own deck: each skill once per destination. Output-assertion tests in link.test.ts. Canonical gate EXIT=0.

## Related Files
- Modified: packages/lythoskill-deck/src/link.ts, packages/lythoskill-deck/src/link.test.ts
- Added: (none)

## Git Commit Message
```
fix(deck): dedupe/label per-destination link output (TASK-20260827131734254)
```

## Notes
- ZK trial report in daily/2026-08-27.md
