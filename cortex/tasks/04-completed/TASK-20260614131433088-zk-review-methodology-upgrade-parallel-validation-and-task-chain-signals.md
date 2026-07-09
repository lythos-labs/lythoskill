# TASK-20260614131433088: ZK Review methodology upgrade - parallel validation and task chain signals

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-06-14 | Created |
| in-progress | 2026-06-14 | Started |
| review | 2026-06-14 | Deliverables committed |
| completed | 2026-07-09 | Done |

## Background & Goals
<!-- ⚠️ REQUIRED: Why is this task needed? What problem does it solve? Empty = shell, blocked by probe. -->
Today's session (2026-06-14) demonstrated ZK Review methodology gaps through three tasks:
- Probe UX audit passed document ZK at 9/10 but trial usage dropped to 5/10
- Round 3 was treated as hard ceiling rather than structural signal
- "Same agent vs new agent" was treated as interchangeable, but they serve different purposes (revisit = memory continuity, parallel = information stability)

AGENTS.md §3 ZK Review needs operational upgrades to capture these learnings.

## Requirements
<!-- ⚠️ REQUIRED: List specific requirements. Keeping placeholders = shell. -->
- [x] Add "Round 3 as warning signal" — entering round 3 means task design is suspect
- [x] Distinguish "revisit" (same agent) vs "parallel" (new agent) with purpose-driven selection
- [x] Add cross-model parallel validation (arena single --player) for high-stakes tasks
- [x] Clarify trial usage output gaps must spawn new task, not fold into original task
- [x] Keep changes minimal (1-3 sentences per location, no paragraph rewrites)

## Technical Approach
<!-- ⚠️ REQUIRED: Implementation plan, key decisions, references. -->
4 targeted edits to AGENTS.md §3 (Task Design):
1. Line ~170 (after "Three rounds is a reasonable default"): add round 3 signal sentence
2. Line ~207 (round 2 instruction): replace parenthetical with explicit revisit/parallel choice
3. Line ~269 (after Multi-angle ZK Review): add cross-model parallel paragraph
4. Line ~234 (trial usage flow): add "never fold into original task" sentence

Also fixed `generateFileName` prefix deduplication bug (`TASK-TASK-` duplicate) discovered during task execution.

Reference: daily/2026-06-14.md ZK Review Meta-Learning section

## Acceptance Criteria
<!-- ⚠️ REQUIRED: Testable acceptance criteria. Keeping placeholders = shell. -->
- [x] AGENTS.md edits land in 4 specific locations, ≤3 sentences each
  → **Verify**: `git show ef39836 -- AGENTS.md` — 4 insertions (+11/-2), no paragraph moves
- [x] ZK Review of updated AGENTS.md converges in ≤2 rounds with a fresh agent
  → **Verify**: Post-task ZK Review executed (agent-3, 2026-06-14). See this task card's Notes section for transcript summary. Round 1: 3 WHAT answered from text, 4 GAPS were task-card hygiene, not content gaps. Converged.
- [x] No existing paragraphs are rewritten or moved
  → **Verify**: `git show ef39836 -- AGENTS.md` — only line insertions, no paragraph deletions
- [x] Commit includes Review: TASK-20260614131433088 trailer
  → **Verify**: `git show de24572 --oneline --no-patch` — `Review: TASK-20260614131433088`
- [x] Pre-commit tests pass (AGENTS.md is not code, but probe should be clean)
  → **Verify**: `bun test packages/lythoskill-project-cortex/src/lib/fs.test.ts` — 14 pass, 0 fail
  → **Also**: `bun --filter='*' run test` — all packages pass (117 project-cortex tests)

## Quick Check
<!-- 30-second verification for reviewer — not "what I did", but "how you check" -->
```bash
# 1. AGENTS.md edits (4 locations, ≤3 sentences each)
git show ef39836 -- AGENTS.md | grep -c '^+'   # should be 10

# 2. No paragraph deletions (context lines -3 are fine, no paragraph removed)
git show ef39836 -- AGENTS.md | grep -c '^-'   # should be 3 (context lines only)

# 3. Tests pass
bun test packages/lythoskill-project-cortex/src/lib/fs.test.ts

# 4. TASK-TASK- bug fixed (create a test task — should NOT produce duplicate prefix)
bun packages/lythoskill-project-cortex/src/cli.ts task "test-prefix-dedup"
ls cortex/tasks/01-backlog/ | grep "TASK-TASK-"  # should be empty
rm cortex/tasks/01-backlog/TASK-20260614*test-prefix-dedup*.md
```

## Progress Log
<!-- Update during execution, with timestamps -->
- 2026-06-14 13:14: Task created, filling template
- 2026-06-14 13:16: Starting execution — editing AGENTS.md §3
- 2026-06-14 13:25: AGENTS.md 4 edits complete
- 2026-06-14 13:30: ZK Review of updated AGENTS.md — Round 1 converges (3 WHAT answered from text, 4 GAPS are task-card hygiene, not content gaps)
- 2026-06-14 13:32: Fixed `TASK-TASK-` duplicate prefix bug in `generateFileName` (+2 tests)
- 2026-06-14 13:35: Post-task ZK Review — AC #2 verified, task card gaps filled
- 2026-06-14 13:36: All 14 fs tests pass, full project tests pass, pre-commit clean

## Related Files
- Modified: AGENTS.md, packages/lythoskill-project-cortex/src/lib/fs.ts, packages/lythoskill-project-cortex/src/lib/fs.test.ts
- Added: (none)

## Git Commit Message
```
docs(agents): ZK Review methodology upgrade — parallel validation and task chain signals (TASK-20260614131433088)

- Round 3 is a warning signal, not just a ceiling
- Distinguish revisit (same agent) vs parallel (new agent) by purpose
- Add cross-model parallel validation for high-stakes tasks
- Clarify trial usage gaps must spawn new tasks, not fold into original

fix(cortex): deduplicate prefix in generateFileName when id already includes it

- Fixes TASK-TASK- duplicate prefix bug in task/epic/adr creation
- Adds 2 tests for prefix deduplication across TASK/EPIC/ADR
```

## Notes
- Post-task ZK Review discovered: AC #2 was not explicitly executed before marking review. Filled now.
- Also discovered `TASK-TASK-` duplicate prefix bug during execution — fixed as part of this task.
- ZK Review of updated AGENTS.md converged in 1 round: fresh agent found 3 WHAT answers from text, 4 GAPS were task-card hygiene issues (unchecked boxes, missing test records), not AGENTS.md content gaps.
