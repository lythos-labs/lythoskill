# TASK-20260828141622828: publish player adapter support matrix

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-08-28 | Created |

## Background & Goals
<!-- ⚠️ REQUIRED: Why is this task needed? What problem does it solve? Empty = shell, blocked by probe. -->

ADR-20260828004129233 (accepted 2026-08-28, Option B) names a **support matrix** — player × upstream × supported versions × status — living in the adapter README as SSOT. "The matrix makes 'what do we support' reviewable and gives new players (deepseek-harness) a clear entry path."

**Depends on TASK-20260828141622777** (the adapters must actually declare `upstream {binary, versionRange, aliases}` before the matrix has real data). Start this card only after that one lands, or write the matrix against the declared contract if development runs in parallel.

## Requirements
<!-- ⚠️ REQUIRED: List specific requirements. Keeping placeholders = shell. -->
- [ ] R1 (必达) `packages/lythoskill-agent-adapter/README.md` gains a support matrix table covering every registered player (from `src/registry.ts`): player name, upstream binary, supported version range, aliases + expiry, status (active / deprecated / planned)
- [ ] R2 (必达) The matrix includes a "planned" row for deepseek-harness pointing at TASK-20260828004417068 (research task) — the entry path the ADR promises
- [ ] R3 (可选) A consistency note or lightweight check that README matrix rows match `registry.ts` declarations (manual review checklist item is acceptable; mechanized `arena doctor` is explicitly future work, not this card)
- **不做**: no `arena doctor` implementation; no runtime changes — this card is documentation + optional check

## Technical Approach
<!-- ⚠️ REQUIRED: Implementation plan, key decisions, references. Empty = shell, blocked by probe. -->
- Read `packages/lythoskill-agent-adapter/README.md` (current adapter lifecycle docs) and `src/registry.ts` (registered players).
- Matrix is prose-maintained for now; the ADR's "can be mechanized later via arena doctor" stays future work.
- Site impact check: if `site/` documents supported players anywhere, align (grep `site/` for player names).

## Acceptance Criteria
<!-- ⚠️ REQUIRED: Testable acceptance criteria. Keeping placeholders = shell. -->
- [ ] README contains the matrix with one row per registry entry → Verify: `grep -c "|" packages/lythoskill-agent-adapter/README.md` sanity + manual diff against `registry.ts` player list
- [ ] deepseek-harness "planned" row references TASK-20260828004417068 → Verify: grep
- [ ] `bun --filter='*' run test` green → Verify: run it (canonical; docs change, should be unaffected)

## Progress Log
<!-- Update during execution, with timestamps -->

- 2026-08-28: Created as follow-up of ADR-20260828004129233 acceptance (Option B). Blocked-on: TASK-20260828141622777.

## Related Files
- Modified: packages/lythoskill-agent-adapter/README.md (pending)
- Added: (none)

## Git Commit Message
```
docs(agent-adapter): player support matrix in README (TASK-20260828141622828)

- player x upstream x version range x aliases x status, incl. planned deepseek-harness row
- Implements ADR-20260828004129233 support-matrix follow-up
```

## Notes
- Sequence note: start after TASK-20260828141622777, or write against its declared contract.
