# TASK-20260827131734189: deck-link-leaves-previous-working-set-on-switch

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-08-27 | Created |
| in-progress | 2026-08-28 | Started |

## Background & Goals
<!-- ⚠️ REQUIRED: Why is this task needed? What problem does it solve? Empty = shell, blocked by probe. -->

Found by ZK external-onboarding trial (2026-08-27, agent-14): after switching `working_set` from `.claude/skills` to `.agents/skills` and re-linking, the NEW working set is correctly populated but the OLD one still contains both symlinks. A user migrating agents ends up with skills active in BOTH agents — the exact stale-leftover state the site claims to eliminate ("No cleanup, no leftovers"). Docs now carry a caveat (site/index.md + zh), but the product behavior contradicts deny-by-default's spirit: state you declared away from should not linger.

Design tension: the old working set may belong to a DIFFERENT agent the user still uses — silently cleaning it could be wrong. This is why the fix is a decision, not just code.

## Requirements
<!-- ⚠️ REQUIRED: List specific requirements. Keeping placeholders = shell. -->
- [x] R1 (必达) **Decision (2026-08-28): (b) warn loudly.** link compares `skill-deck.state`'s previous working_set against the current one; on switch with link-created symlinks still present in the old dir, print a HATEOAS warning (what's there / why it may be intentional — another agent may use it / how to clean: exact `rm` hint). Rationale: (a) auto-clean contradicts the project's audit-first instinct for destructive ops (A-prune-is-heredoc-not-action) — the old set may serve a different agent the user still runs; (c) leaves the "No cleanup, no leftovers" site claim contradicted. Warning makes the leftover visible without a silent destructive act.
- [x] R2 (必达) Implement the chosen behavior with tests covering: switch with old set present, switch with old set already gone, first link (no previous set) → all three cases tested in link.test.ts (`working_set switch warning` describe)
- **不做**: no multi-working-set simultaneous reconciliation (that's `also_link_to`'s job — ADR-20260517152850372)

## Technical Approach
<!-- ⚠️ REQUIRED: Implementation plan, key decisions, references. Empty = shell, blocked by probe. -->
- `packages/lythoskill-deck/src/link.ts` — reconciler; `skill-deck.state` (per ADR-20260616000939948 state snapshot) likely already records the last working_set — check before designing
- If (b): warning follows HATEOAS template; if (a): removal must only touch symlinks link itself created (never user content)
- Tests: co-located link tests; ZK trial repro in daily/2026-08-27.md

## Acceptance Criteria
<!-- ⚠️ REQUIRED: Testable acceptance criteria. Keeping placeholders = shell. -->
- [x] Repro the trial: link with working_set A, switch to B, re-link → old set handled per chosen semantics → fixture tests in link.test.ts (`working_set switch warning` describe: warns + never auto-deletes; old set gone → silent; first link → silent)
- [x] Site caveat in site/index.md matches final behavior → updated en+zh: "link prints a warning with the exact rm command" (2026-08-28)
- [x] `bun --filter=@lythos/skill-deck run test` green → canonical gate EXIT=0 (2026-08-28), 161 tests in skill-deck

## Progress Log
<!-- Update during execution, with timestamps -->

- 2026-08-28: Implemented decision (b). link.ts reads `skill-deck.state`'s previous `resolved_paths.working_set` (state snapshot per ADR-20260616000939948); on switch with link-created symlinks still present, prints HATEOAS warning (what/why/exact `rm` fix) — never auto-deletes. Site caveat updated en+zh to match. Three fixture tests (switch+leftover, switch+gone, first link). Canonical gate EXIT=0.

## Related Files
- Modified: packages/lythoskill-deck/src/link.ts, packages/lythoskill-deck/src/link.test.ts, site/index.md, site/zh/index.md
- Added: (none)

## Git Commit Message
```
fix(deck): handle previous working set on working_set switch (TASK-20260827131734189)

- Semantics decision recorded in card; reconciler + tests; site caveat aligned
```

## Notes
- ZK trial report in daily/2026-08-27.md; docs caveat added 2026-08-27 (site/index.md:71 + zh mirror)
