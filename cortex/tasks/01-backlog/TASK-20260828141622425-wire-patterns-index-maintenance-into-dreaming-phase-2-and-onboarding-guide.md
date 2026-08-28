# TASK-20260828141622425: wire patterns INDEX maintenance into dreaming Phase 2 and onboarding guide

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-08-28 | Created |

## Background & Goals
<!-- ⚠️ REQUIRED: Why is this task needed? What problem does it solve? Empty = shell, blocked by probe. -->

ADR-20260613190449007 （方案A, accepted 2026-08-28, now in `cortex/adr/02-accepted/`) introduced `cortex/wiki/01-patterns/INDEX.md` — a P0/P1/P2 pinned index over the 56 dated pattern files. The one-time initial classification **already shipped** (commit `7de92b8c`: 3 P0 / 15 P1 / 38 P2; `weekly-synthesis-template.md` excluded as non-pattern). But the ADR names the failure mode explicitly: **"如果 INDEX 更新不及时，会比 flat 目录更误导人"**. Without a maintenance owner, the index rots on the very next dreaming run that absorbs a pattern into SSOT.

The ADR's 后续 assigns these wiring items, none of which exist yet:
1. dreaming Phase 2 must gain an "update 01-patterns/INDEX.md" step with the P0/P1/P2 judgment rules.
2. `cortex/wiki/04-ssot/agent-onboarding-guide.md` (+ .zh.md) must tell new agents to read the patterns INDEX first.
3. The `cortex index wiki` generator's boundary vs the hand-maintained INDEX must be verified (it generates `cortex/wiki/INDEX.md`, a DIFFERENT file — confirmed by ZK review: `generate-index.ts:328` writes only `join(config.wikiDir, 'INDEX.md')` and `readWikiDir` filters out `INDEX.md` files at line 266).

## Requirements
<!-- ⚠️ REQUIRED: List specific requirements. Keeping placeholders = shell. -->
- [ ] R1 (必达) `packages/lythoskill-dreaming/skill/SKILL.md` Phase 2 (section starts at line 75, `### Phase 2: Consolidate`) gains an explicit step: "update `cortex/wiki/01-patterns/INDEX.md`" carrying the ADR's judgment rules verbatim (≥2 weekly `decisions_accepted`/`project_lesson_candidates` citations → P0; referenced by `04-ssot/*.md` → P1; else P2). Then `bun packages/lythoskill-creator/src/cli.ts build dreaming` so `skills/lythoskill-dreaming/` is rebuilt.
- [ ] R2 (必达) `cortex/wiki/04-ssot/agent-onboarding-guide.md:15-20` ("Your reading order:" list) AND `agent-onboarding-guide.zh.md:15-20` ("你的閱讀順序：" — **Traditional Chinese**, match register) gain a "read `01-patterns/INDEX.md` before scanning patterns/" step.
- [ ] R3 (必达) Verify boundary: run `bun packages/lythoskill-project-cortex/src/cli.ts index wiki` and confirm `cortex/wiki/01-patterns/INDEX.md` is untouched. Document this boundary in one line inside the patterns INDEX.md header.
- **不做**: no SQLite backend （方案D has its own card TASK-20260828141622502); no renaming/moving pattern files; no changes to the P0/P1/P2 rules (ADR-pinned); **not updating the generated `cortex/wiki/INDEX.md` template** (ADR 后续 item — the generated flat INDEX and the hand-maintained patterns INDEX coexist; revisit only if 方案D lands).

## Technical Approach
<!-- ⚠️ REQUIRED: Implementation plan, key decisions, references. Empty = shell, blocked by probe. -->
- dreaming skill source: `packages/lythoskill-dreaming/skill/SKILL.md` — Phase 2 at line 75. Build pipeline: `bun packages/lythoskill-creator/src/cli.ts build dreaming` (AGENTS.md § Skill Build & Deck Refresh Lifecycle), then `deck link`.
- Onboarding guides: insertion points at lines 15-20 in both files (reading-order lists).
- Wiki INDEX generator: `packages/lythoskill-project-cortex/src/generate-index.ts` (writes `cortex/wiki/INDEX.md` only; filters out INDEX.md files from listings — verified).
- ADR with the rules: `cortex/adr/02-accepted/ADR-20260613190449007-wiki-patterns-aaa-pinned-index-dreaming-integration.md`.

## Acceptance Criteria
<!-- ⚠️ REQUIRED: Testable acceptance criteria. Keeping placeholders = shell. -->
- [ ] `grep -n "01-patterns/INDEX" packages/lythoskill-dreaming/skill/SKILL.md skills/lythoskill-dreaming/SKILL.md` → hits in both → Verify: run it
- [ ] `grep -n "01-patterns/INDEX" cortex/wiki/04-ssot/agent-onboarding-guide.md cortex/wiki/04-ssot/agent-onboarding-guide.zh.md` → hits in both → Verify: run it
- [ ] `bun packages/lythoskill-project-cortex/src/cli.ts index wiki && git status --short cortex/wiki/01-patterns/INDEX.md` → no modification → Verify: run it
- [ ] `bun --filter='*' run test` green → Verify: run it (canonical form)

## Progress Log
<!-- Update during execution, with timestamps -->

- 2026-08-28: Created as follow-up of ADR-20260613190449007 acceptance （方案A). Initial classification shipped in commit `7de92b8c` (same commit series as the acceptance).
- 2026-08-28: ZK review round 1 — 2 P1 fixed (INDEX.md did not exist at review time → now committed; ADR path/status claims → acceptance landed, paths updated), P2 （ dropped 后续 item) added to 不做， P3 (insertion line numbers + zh register) applied.

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
- The initial one-time classification shipped in commit `7de92b8c`; this card is the recurring-maintenance wiring.
