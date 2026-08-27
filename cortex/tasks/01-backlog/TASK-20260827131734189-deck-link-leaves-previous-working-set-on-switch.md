# TASK-20260827131734189: deck-link-leaves-previous-working-set-on-switch

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-08-27 | Created |

## Background & Goals
<!-- ⚠️ REQUIRED: Why is this task needed? What problem does it solve? Empty = shell, blocked by probe. -->

Found by ZK external-onboarding trial (2026-08-27, agent-14): after switching `working_set` from `.claude/skills` to `.agents/skills` and re-linking, the NEW working set is correctly populated but the OLD one still contains both symlinks. A user migrating agents ends up with skills active in BOTH agents — the exact stale-leftover state the site claims to eliminate ("No cleanup, no leftovers"). Docs now carry a caveat (site/index.md + zh), but the product behavior contradicts deny-by-default's spirit: state you declared away from should not linger.

Design tension: the old working set may belong to a DIFFERENT agent the user still uses — silently cleaning it could be wrong. This is why the fix is a decision, not just code.

## Requirements
<!-- ⚠️ REQUIRED: List specific requirements. Keeping placeholders = shell. -->
- [ ] R1 (必达) Decide the semantics: (a) link cleans the previously-known working set (tracked in skill-deck.state) on switch, (b) link warns loudly about the leftover old working set with a remediation hint, or (c) document-only (current state). Write the decision in this card before implementing
- [ ] R2 (必达) Implement the chosen behavior with tests covering: switch with old set present, switch with old set already gone, first link (no previous set)
- **不做**: no multi-working-set simultaneous reconciliation (that's `also_link_to`'s job — ADR-20260517152850372)

## Technical Approach
<!-- ⚠️ REQUIRED: Implementation plan, key decisions, references. Empty = shell, blocked by probe. -->
- `packages/lythoskill-deck/src/link.ts` — reconciler; `skill-deck.state` (per ADR-20260616000939948 state snapshot) likely already records the last working_set — check before designing
- If (b): warning follows HATEOAS template; if (a): removal must only touch symlinks link itself created (never user content)
- Tests: co-located link tests; ZK trial repro in daily/2026-08-27.md

## Acceptance Criteria
<!-- ⚠️ REQUIRED: Testable acceptance criteria. Keeping placeholders = shell. -->
- [ ] Repro the trial: link with working_set A, switch to B, re-link → old set handled per chosen semantics → Verify: fixture test asserting old-set state
- [ ] Site caveat in site/index.md matches final behavior (update if (a) or (b) lands) → Verify: grep the caveat text
- [ ] `bun --filter=@lythos/skill-deck run test` green → Verify: run it

## Progress Log
<!-- Update during execution, with timestamps -->

## Related Files
- Modified: (pending)
- Added: (pending)

## Git Commit Message
```
fix(deck): handle previous working set on working_set switch (TASK-20260827131734189)

- Semantics decision recorded in card; reconciler + tests; site caveat aligned
```

## Notes
- ZK trial report in daily/2026-08-27.md; docs caveat added 2026-08-27 (site/index.md:71 + zh mirror)
