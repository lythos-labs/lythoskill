# TASK-20260710164825401: agent behavior gap: decision hygiene vs execution

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-07-10 | Created |

## Background & Goals

Agent repeatedly exhibits "say but not do" pattern: verbally acknowledging new practices (Decision Hygiene, direct action) while continuing old behavior loops (asking fake confirmation, over-explaining, performing respect rather than doing work).

This is not a skill deficiency — it's a meta-cognitive execution gap. The agent optimizes for conversation flow over problem resolution, treating user satisfaction as a chat metric rather than a delivery metric.

Goal: Make agent behavior changes trackable, verifiable, and accountable — not just stated in conversation.

## Requirements

- [ ] Document the specific behavior patterns that need tracking
- [ ] Create verifiable checkpoints (not just "I understand")
- [ ] Integrate into skill/AGENTS.md so future agents inherit
- [ ] Test with ZK Review: can a zero-context agent detect the gap?

## Technical Approach

1. Add "Execution Check" section to relevant skills (scribe-weekly, AGENTS.md)
2. Define concrete anti-patterns with examples (not abstract principles)
3. Make it checkable: "Did agent do X without asking Y?"
4. Track in task system with acceptance criteria, not just conversation

## Acceptance Criteria

- [ ] AGENTS.md or skill contains specific "Decision Hygiene execution" checklist
- [ ] Examples of fake options vs real options are documented
- [ ] Next session agent can read skill and avoid the same gap
- [ ] ZK Review confirms: zero-context agent understands the execution requirement, not just the principle

## Related Files

- Modified: packages/lythoskill-project-scribe-weekly/skill/SKILL.md (Decision Hygiene added)
- Modified: AGENTS.md (potentially)
- Added: cortex/tasks/01-backlog/TASK-20260710164825401.md (this task)

## Git Commit Message
```
feat(scope): description (TASK-20260710164825401)

- Detail 1
- Detail 2
```

## Notes
