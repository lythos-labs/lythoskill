# TASK-20260710170234793: scribe skill: clarify record is not session end - remove handoff semantics from when_to_use and triggers

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-07-10 | Created |
| in-progress | 2026-07-10 | Started |
| review | 2026-07-10 | Deliverables committed |
| completed | 2026-07-17 | Done |

## Background & Goals
<!-- ⚠️ REQUIRED: Why is this task needed? What problem does it solve? Empty = shell, blocked by probe. -->

The scribe skill's `when_to_use` and trigger language conflates "record context" with "session ending". This causes agents to interpret "write daily" as "session is over, stop working".

Evidence from 2026-07-10 session: agent repeatedly said "this session should end" while writing the daily handoff, even though tasks were still in-progress. The user traced this to the skill's wording.

Problem phrases:
- `when_to_use`: "session ending, handoff, LGTM, wrap up, context limit approaching, 先到这里, 就这样, session 要结束了" — all end-state language, no mid-session recording cues
- "Every session ending" as the only time to write daily
- "Handoff Triggers" section title implies transfer to next agent, not "checkpoint"

Goal: Rewrite scribe skill so agents understand that recording is a **checkpoint** (can happen mid-session), not a **termination signal**.

## Requirements
<!-- ⚠️ REQUIRED: List specific requirements. Keeping placeholders = shell, blocked by probe. -->
- [x] Rewrite `when_to_use` to separate "record triggers" from "session state triggers"
- [x] Add explicit statement: "Recording ≠ session end. Record then continue working."
- [x] Rename "Handoff Triggers" to "Record Triggers" or similar neutral term
- [x] Add mid-session recording examples (e.g., "hit a pitfall, record it, keep working")
- [x] Update daily template reference: "Every session ending" → "At session milestones or end"
- [x] Ensure SKILL.md in both `packages/` (source) and `skills/` (build output) are updated
- [x] Build skill after source edit

## Technical Approach
<!-- ⚠️ REQUIRED: Implementation plan, key decisions, references. Empty = shell, blocked by probe. -->

1. Edit `packages/lythoskill-project-scribe/skill/SKILL.md` (source of truth)
2. Run `bun packages/lythoskill-creator/src/cli.ts build project-scribe` to regenerate `skills/`
3. Verify both files updated

Key rewrites:
- `when_to_use`: Lead with "Record progress at any time — mid-session or end." Then list specific cues.
- Remove "session ending" / "handoff" / "wrap up" as standalone trigger words. Replace with "user requests checkpoint" / "milestone completed" / "context pressure high".
- Add explicit "Record then Continue" section with example flow.
- Rename "Handoff Triggers" → "Record Triggers (checkpoint, not termination)".

## Acceptance Criteria
<!-- ⚠️ REQUIRED: Testable acceptance criteria. Keeping placeholders = shell, blocked by probe. -->
- [x] `when_to_use` no longer contains "session ending", "handoff", "wrap up", "先到这里", "就这样" as standalone triggers
- [x] SKILL.md contains explicit sentence: "Recording is a checkpoint, not a termination signal. Record then continue working."
- [x] Section formerly called "Handoff Triggers" is renamed to neutral term
- [x] At least one mid-session recording example is present
- [x] `packages/lythoskill-project-scribe/skill/SKILL.md` and `skills/lythoskill-project-scribe/SKILL.md` are both updated
- [x] Build succeeds without errors
- [x] ZK Review: fresh agent reads SKILL.md, understands that recording can happen mid-session and does not imply stopping work

## ZK Review Result

**Round 1 (2026-07-10)**: Fresh agent reads SKILL.md, asked "If user said '记录一下这个决定', what would you think?"

> **Answer**: "I should record this and then continue working."

**Why**: SKILL.md explicitly states:
- `when_to_use`: "Do NOT treat 'record' as 'stop working' — record then continue"
- `Record Then Continue` section: `User: "记录一下这个决定" → Write to daily → Continue with the task`
- Default assumption: "record then continue. Only stop when the user explicitly confirms"

**Gaps found**: Minor verification gaps (source vs output sync, build status) — all resolved by commit evidence. No understanding gaps.

**Verdict**: ZK Review passes. Agent no longer infers "session end" from "record".

## Progress Log
<!-- Update during execution, with timestamps -->

- 2026-07-10 17:02 — Task registered and started
- 2026-07-10 17:03 — Task card filled with Background/Requirements/Approach/AC
- 2026-07-10 17:05 — Edited `packages/lythoskill-project-scribe/skill/SKILL.md`: rewrote `when_to_use`, renamed "Handoff Triggers" → "Record Then Continue", added checkpoint examples
- 2026-07-10 17:06 — Built skill: `bun packages/lythoskill-creator/src/cli.ts build lythoskill-project-scribe`
- 2026-07-10 17:07 — Verified both source and output files updated
- 2026-07-10 17:08 — Committed: `docs(scribe): clarify recording is checkpoint not termination (TASK-20260710170234793)`
- 2026-07-10 17:10 — ZK Review: fresh agent confirms "record → continue, not stop"
- 2026-07-10 17:11 — Task card updated with ZK Review result, all AC checked

## Related Files
- Modified:
  - `packages/lythoskill-project-scribe/skill/SKILL.md`
  - `skills/lythoskill-project-scribe/SKILL.md`
- Added:

## Git Commit Message
```
docs(scribe): clarify recording is checkpoint not termination (TASK-20260710170234793)

- Rewrite when_to_use to separate record triggers from session state
- Add explicit "Record then Continue" guidance
- Rename Handoff Triggers → Record Triggers
- Add mid-session recording examples
- Build skill output
```

## Notes
