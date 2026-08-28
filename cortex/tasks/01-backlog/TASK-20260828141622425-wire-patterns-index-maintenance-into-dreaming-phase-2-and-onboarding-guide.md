# TASK-20260828141622425: wire patterns INDEX maintenance into dreaming Phase 2 and onboarding guide

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-08-28 | Created |

## Background & Goals
<!-- ⚠️ REQUIRED: Why is this task needed? What problem does it solve? Empty = shell, blocked by probe. -->

ADR-20260613190449007 (方案A, accepted 2026-08-28) introduced `cortex/wiki/01-patterns/INDEX.md` — a P0/P1/P2 pinned index over the 57 flat pattern files. The one-time initial classification was executed with the acceptance commit. But the ADR names the failure mode explicitly: **"如果 INDEX 更新不及时，会比 flat 目录更误导人"**. Without a maintenance owner, the index rots on the very next dreaming run that absorbs a pattern into SSOT.

The ADR's 后续 assigns three wiring items, none of which exist yet:
1. dreaming Phase 2 must gain an "update 01-patterns/INDEX.md" step with the P0/P1/P2 judgment rules.
2. `cortex/wiki/04-ssot/agent-onboarding-guide.md` (+ .zh.md) must tell new agents to read the patterns INDEX first.
3. The `cortex index wiki` generator's boundary vs the hand-maintained INDEX must be verified (it generates `cortex/wiki/INDEX.md`, a DIFFERENT file — confirm no clobber, document the boundary).

## Requirements
<!-- ⚠️ REQUIRED: List specific requirements. Keeping placeholders = shell. -->
- [ ] R1 (必达) `packages/lythoskill-dreaming/skill/SKILL.md` Phase 2 gains an explicit step: "update `cortex/wiki/01-patterns/INDEX.md`" carrying the ADR's judgment rules verbatim (≥2 weekly `decisions_accepted`/`project_lesson_candidates` citations → P0; referenced by `04-ssot/*.md` → P1; else P2). Then `bun packages/lythoskill-creator/src/cli.ts build dreaming` so `skills/lythoskill-dreaming/` is rebuilt.
- [ ] R2 (必达) `cortex/wiki/04-ssot/agent-onboarding-guide.md` AND `agent-onboarding-guide.zh.md` gain a "read `01-patterns/INDEX.md` before scanning patterns/" step.
- [ ] R3 (必达) Verify boundary: run `bun packages/lythoskill-project-cortex/src/cli.ts index wiki` and confirm `cortex/wiki/01-patterns/INDEX.md` is untouched (it generates `cortex/wiki/INDEX.md` only). Document this boundary in one line inside the patterns INDEX.md header.
- **不做**: no SQLite backend (方案D has its own card TASK-20260828141622502); no renaming/moving pattern files; no changes to the P0/P1/P2 rules themselves (they are ADR-pinned).

## Technical Approach
<!-- ⚠️ REQUIRED: Implementation plan, key decisions, references. Empty = shell, blocked by probe. -->
- dreaming skill source: `packages/lythoskill-dreaming/skill/SKILL.md` — find the Phase 2 section, append the step where SSOT consolidation is described. Build pipeline: `bun packages/lythoskill-creator/src/cli.ts build dreaming` (AGENTS.md § Skill Build & Deck Refresh Lifecycle), then `deck link`.
- Onboarding guide: `cortex/wiki/04-ssot/agent-onboarding-guide.md` + `.zh.md` — add to whichever reading-order section exists.
- Wiki INDEX generator: `packages/lythoskill-project-cortex/src/` (generate-index path updated in TASK-20260828011012367). Read before assuming what it writes.
- ADR with the rules: `cortex/adr/02-accepted/ADR-20260613190449007-wiki-patterns-aaa-pinned-index-dreaming-integration.md` (moved to 02-accepted on acceptance).

## Acceptance Criteria
<!-- ⚠️ REQUIRED: Testable acceptance criteria. Keeping placeholders = shell. -->
- [ ] `grep -n "01-patterns/INDEX" packages/lythoskill-dreaming/skill/SKILL.md skills/lythoskill-dreaming/SKILL.md` → hits in both → Verify: run it
- [ ] `grep -n "01-patterns/INDEX" cortex/wiki/04-ssot/agent-onboarding-guide.md cortex/wiki/04-ssot/agent-onboarding-guide.zh.md` → hits in both → Verify: run it
- [ ] `bun packages/lythoskill-project-cortex/src/cli.ts index wiki && git status --short cortex/wiki/01-patterns/INDEX.md` → no modification → Verify: run it
- [ ] `bun --filter='*' run test` green → Verify: run it (canonical form)

## Progress Log
<!-- Update during execution, with timestamps -->

- 2026-08-28: Created as follow-up of ADR-20260613190449007 acceptance （方案A).

## Related Files
- Modified: (pending)
- Added: (pending)

## Git Commit Message
```
docs(dreaming,ssot): wire 01-patterns INDEX maintenance into Phase 2 + onboarding (TASK-20260828141622425)

- dreaming SKILL.md Phase 2: update patterns INDEX with ADR judgment rules
- onboarding guide (en+zh): read patterns INDEX before scanning
- boundary documented: cortex index wiki never touches 01-patterns/INDEX.md
```

## Notes
- The initial one-time classification shipped in the ADR acceptance commit; this card is the recurring-maintenance wiring.
