# TASK-20260827131734254: deck-link-prints-each-skill-twice

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-08-27 | Created |

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
- [ ] R1 (必达) Each skill prints once per actual destination, with the destination labeled (or once total if only one destination)
- **不做**: no change to sync semantics — output only

## Technical Approach
<!-- ⚠️ REQUIRED: Implementation plan, key decisions, references. Empty = shell, blocked by probe. -->
- `packages/lythoskill-deck/src/link.ts` output path; check whether the dual sync (.claude + .agents fallback per AGENTS.md §0 "dual output is normal") shares one log loop
- Test: capture link output in a fixture, assert no duplicate undifferentiated lines

## Acceptance Criteria
<!-- ⚠️ REQUIRED: Testable acceptance criteria. Keeping placeholders = shell. -->
- [ ] `bunx @lythos/skill-deck link` on the quick-start deck prints each skill once per destination, destinations labeled → Verify: run + inspect stdout
- [ ] `bun --filter=@lythos/skill-deck run test` green → Verify: run it

## Progress Log
<!-- Update during execution, with timestamps -->

## Related Files
- Modified: (pending)
- Added: (pending)

## Git Commit Message
```
fix(deck): dedupe/label per-destination link output (TASK-20260827131734254)
```

## Notes
- ZK trial report in daily/2026-08-27.md
