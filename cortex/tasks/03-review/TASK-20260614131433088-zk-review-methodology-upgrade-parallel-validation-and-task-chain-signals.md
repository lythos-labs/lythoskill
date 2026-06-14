# TASK-20260614131433088: ZK Review methodology upgrade - parallel validation and task chain signals

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-06-14 | Created |
| in-progress | 2026-06-14 | Started |
| review | 2026-06-14 | Deliverables committed |

## Background & Goals
<!-- ⚠️ REQUIRED: Why is this task needed? What problem does it solve? Empty = shell, blocked by probe. -->
Today's session (2026-06-14) demonstrated ZK Review methodology gaps through three tasks:
- Probe UX audit passed document ZK at 9/10 but trial usage dropped to 5/10
- Round 3 was treated as hard ceiling rather than structural signal
- "Same agent vs new agent" was treated as interchangeable, but they serve different purposes (revisit = memory continuity, parallel = information stability)

AGENTS.md §3 ZK Review needs operational upgrades to capture these learnings.

## Requirements
<!-- ⚠️ REQUIRED: List specific requirements. Keeping placeholders = shell. -->
- [ ] Add "Round 3 as warning signal" — entering round 3 means task design is suspect
- [ ] Distinguish "revisit" (same agent) vs "parallel" (new agent) with purpose-driven selection
- [ ] Add cross-model parallel validation (arena single --player) for high-stakes tasks
- [ ] Clarify trial usage output gaps must spawn new task, not fold into original task
- [ ] Keep changes minimal (1-3 sentences per location, no paragraph rewrites)

## Technical Approach
<!-- ⚠️ REQUIRED: Implementation plan, key decisions, references. -->
4 targeted edits to AGENTS.md §3 (Task Design):
1. Line ~170 (after "Three rounds is a reasonable default"): add round 3 signal sentence
2. Line ~207 (round 2 instruction): replace parenthetical with explicit revisit/parallel choice
3. Line ~269 (after Multi-angle ZK Review): add cross-model parallel paragraph
4. Line ~234 (trial usage flow): add "never fold into original task" sentence

Reference: daily/2026-06-14.md ZK Review Meta-Learning section

## Acceptance Criteria
<!-- ⚠️ REQUIRED: Testable acceptance criteria. Keeping placeholders = shell. -->
- [ ] AGENTS.md edits land in 4 specific locations, ≤3 sentences each
- [ ] ZK Review of updated AGENTS.md converges in ≤2 rounds with a fresh agent
- [ ] No existing paragraphs are rewritten or moved
- [ ] Commit includes Review: TASK-20260614131433088 trailer
- [ ] Pre-commit tests pass (AGENTS.md is not code, but probe should be clean)

## Progress Log
<!-- Update during execution, with timestamps -->
- 2026-06-14 13:14: Task created, filling template
- 2026-06-14 13:16: Starting execution — editing AGENTS.md §3

## Related Files
- Modified: AGENTS.md
- Added: (none)

## Git Commit Message
```
docs(agents): ZK Review methodology upgrade — parallel validation and task chain signals (TASK-20260614131433088)

- Round 3 is a warning signal, not just a ceiling
- Distinguish revisit (same agent) vs parallel (new agent) by purpose
- Add cross-model parallel validation for high-stakes tasks
- Clarify trial usage gaps must spawn new tasks, not fold into original
```


## Notes
