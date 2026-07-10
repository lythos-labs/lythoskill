# TASK-20260710115319209: ZK Review methodology upgrade trade-off awareness in gap assessment

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-07-10 | Created |

## Background & Goals

ZK Review is a mandatory pre-assignment gate in this project. The standard pattern is:
1. Spawn zero-knowledge agent
2. Ask WHAT/WHY/HOW/GAPS
3. Process gaps (fill/challenge/ignore)
4. Converge at <2 new gaps

**Problem identified in this session**: ZK agents expose gaps but do not assess whether the current design is a reasonable trade-off. This leads to:
- False positives (design choices reported as defects)
- Over-engineering (solutions proposed for non-problems)
- Agent time wasted on "fixes" that break existing trade-offs

**Goal**: Upgrade ZK Review methodology so that gap assessment includes trade-off awareness. The ZK agent (or the reviewer processing ZK output) must ask "what's the alternative?" and "what would it cost?" before flagging a gap as a problem.

## Requirements

- [ ] Document the "ZK Review + trade-off awareness" pattern in AGENTS.md or a wiki pattern
- [ ] Update ZK Review prompt template to include "ask 'what's the alternative?'" instruction
- [ ] Verify the upgraded pattern with a real ZK Review round (this session's Round 4 validated the concept)
- [ ] Update project-cortex SKILL.md ZK Review reference if applicable

## Technical Approach

1. Write a wiki pattern: `cortex/wiki/01-patterns/zk-review-trade-off-awareness.md`
2. Reference it from AGENTS.md ZK Review section
3. The pattern should include:
   - When to ask "what's the alternative?"
   - How to evaluate trade-offs (cost/benefit framework)
   - Examples from this session (INDEX.md portal role, handoff stale detection, etc.)

## Acceptance Criteria

- [ ] A new agent reading the ZK Review pattern understands when to challenge a gap vs accept a trade-off
- [ ] The pattern is referenced from AGENTS.md
- [ ] At least 3 real examples from project history are included
- [ ] Verify: ZK agent spawned with new pattern produces fewer false-positive gaps

## Progress Log
<!-- Update during execution, with timestamps -->

## Related Files
- Modified:
- Added:

## Git Commit Message
```
feat(scope): description (TASK-20260710115319209)

- Detail 1
- Detail 2
```

## Notes
