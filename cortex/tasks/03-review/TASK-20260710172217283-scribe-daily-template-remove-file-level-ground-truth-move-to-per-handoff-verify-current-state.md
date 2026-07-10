# TASK-20260710172217283: scribe daily template: remove file-level Ground Truth, move to per-handoff Verify Current State

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-07-10 | Created |
| in-progress | 2026-07-10 | Started |
| review | 2026-07-10 | Deliverables committed |

## Background & Goals
<!-- ⚠️ REQUIRED: Why is this task needed? What problem does it solve? Empty = shell, blocked by probe. -->

The daily handoff file has a `## Ground Truth` section at the file top, above all `## Session Handoff` sections. In the prepend model (new handoffs added at top), this file-level Ground Truth is written once and never updated — it becomes stale.

Evidence: `daily/2026-07-10.md` Ground Truth says Git HEAD = `76151e38`, but the first (latest) handoff says Git HEAD = `5772ce89`.

This creates a UX hazard: onboarding agent sees stale Ground Truth before fresh handoff.

Full decision record: ADR-20260710172235956

Goal: Remove file-level `## Ground Truth`, expand `## 0. Verify Current State` in each handoff to contain all necessary state. Each handoff becomes self-contained SSOT.

## Requirements
<!-- ⚠️ REQUIRED: List specific requirements. Keeping placeholders = shell, blocked by probe. -->
- [ ] Update `daily-template.md` to remove `## Ground Truth` section
- [ ] Expand `## 0. Verify Current State` in daily-template.md to include all fields formerly in Ground Truth (Git HEAD, Version, Deck, Branch, Active Epic/Task counts)
- [ ] Update scribe SKILL.md to reflect new template (no file-level Ground Truth)
- [ ] Update onboarding SKILL.md to remove Ground Truth references, clarify onboarding reads first handoff's Verify section
- [ ] Build both skills after source edits
- [ ] Verify existing daily files are not affected (legacy format is historical, not template)

## Technical Approach
<!-- ⚠️ REQUIRED: Implementation plan, key decisions, references. Empty = shell, blocked by probe. -->

1. Edit `packages/lythoskill-project-scribe/skill/references/daily-template.md`
   - Remove `## Ground Truth` section entirely
   - Expand `## 0. Verify Current State` to include: Git HEAD, Version, Deck, Branch, Active Epic, Active Task
   - Add note: "This section is the SSOT for this session's state."
2. Edit `packages/lythoskill-project-scribe/skill/SKILL.md`
   - Remove references to `## Ground Truth` or file-level state
   - Update "Core Operation: Write Daily File" section
3. Edit `packages/lythoskill-project-onboarding/skill/SKILL.md`
   - Remove any mention of file-level Ground Truth
   - Clarify: onboarding reads the first `## Session Handoff`, then its `## 0. Verify Current State`
4. Build both skills: `bun packages/lythoskill-creator/src/cli.ts build lythoskill-project-scribe && bun packages/lythoskill-creator/src/cli.ts build lythoskill-project-onboarding`

## Acceptance Criteria
<!-- ⚠️ REQUIRED: Testable acceptance criteria. Keeping placeholders = shell, blocked by probe. -->
- [ ] `daily-template.md` no longer contains `## Ground Truth` section
- [ ] `daily-template.md` `## 0. Verify Current State` contains all fields: Git HEAD, Version, Deck, Branch, Active Epic, Active Task
- [ ] scribe SKILL.md does not mention file-level Ground Truth
- [ ] onboarding SKILL.md does not mention file-level Ground Truth
- [ ] Both skills build successfully
- [ ] ZK Review: fresh agent reads both skills + daily-template, understands that each handoff is self-contained and no file-level state exists

## Progress Log
<!-- Update during execution, with timestamps -->

- 2026-07-10 17:22 — ADR-20260710172235956 created and filled
- 2026-07-10 17:23 — Task card updated with ADR reference

## Related Files
- Modified:
  - `packages/lythoskill-project-scribe/skill/references/daily-template.md`
  - `packages/lythoskill-project-scribe/skill/SKILL.md`
  - `packages/lythoskill-project-onboarding/skill/SKILL.md`
- Added:
  - `cortex/adr/01-proposed/ADR-20260710172235956-...`

## Git Commit Message
```
docs(scribe,onboarding): remove file-level Ground Truth, per-handoff Verify is SSOT (TASK-20260710172217283)

- daily-template.md: remove ## Ground Truth, expand ## 0. Verify Current State
- scribe SKILL.md: remove file-level state references
- onboarding SKILL.md: clarify reads first handoff's Verify section
- Build both skills
- ADR: ADR-20260710172235956

Review: TASK-20260710172217283
```

## Notes
