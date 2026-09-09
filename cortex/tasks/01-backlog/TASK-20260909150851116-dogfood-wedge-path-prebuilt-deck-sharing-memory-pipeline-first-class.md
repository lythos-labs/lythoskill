# TASK-20260909150851116: dogfood wedge path: prebuilt deck sharing + memory pipeline first-class

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-09-09 | Created |

## Background & Goals
<!-- ⚠️ REQUIRED: Why is this task needed? What problem does it solve? Empty = shell, blocked by probe. -->

User dogfood observation (2026-09-09, verbatim): "现在我自己吃狗粮给其他项目用，用最多的
场景果然是分享预制deck和cortex和记忆系的技能。其他的如果这些用不起来是轮不到的。"

Wedge logic: deck (distribution) + cortex (state) + memory family (scribe → weekly →
dreaming → onboarding) form the minimal cross-project reuse loop. All other skills
(writer/coach/sober/arena/red-green) are conditional-quality tools — they only matter
if the wedge works. Current examples/onboarding present skills flat, not sequenced.

Goal: make the wedge path (prebuilt deck sharing + memory pipeline) a first-class
scenario in examples/onboarding, backed by a decided distribution mechanism.

## Requirements
<!-- ⚠️ REQUIRED: List specific requirements. Keeping placeholders = shell. -->
- [ ] Feasibility research: agent-CLI skill-dir mechanisms × deck/side-deck (per-role
      deck) mapping matrix — which CLIs support custom skill dirs, multi-set
      switching, per-role scoping, symlinks (research note 2026-09-09, 3 parallel agents)
- [ ] dsh agent-team plugin + similar harnesses surveyed for per-role skill injection surface
- [ ] Distribution channel comparison (gist tried & weak — why; gh repo / npm / site+manifest / registry)
- [ ] Plan/roadmap doc: sequenced wedge onboarding (deck → cortex → memory family → rest)
- [ ] Decision recorded as ADR (distribution mechanism choice)

## Technical Approach
<!-- ⚠️ REQUIRED: Implementation plan, key decisions, references. Empty = shell, blocked by probe. -->
- Research notes land in cortex/wiki/02-research/ (2026-09-09 survey, 3 dimensions)
- Roadmap doc + ADR follow from research conclusions; no implementation before ADR accept
- Constraints: declarative toml state, lock-file integrity (hash pins), plan-first
  updates, URL-first but not URL-only (local paths stay documented)

## Acceptance Criteria
<!-- ⚠️ REQUIRED: Testable acceptance criteria. Keeping placeholders = shell. -->
- [ ] Research note published with per-claim source URLs (no source → no rule)
- [ ] Mapping matrix covers ≥6 CLIs incl. Claude Code, Cursor, Kimi CLI, and dsh
- [ ] Roadmap doc merged with explicit sequencing decision
- [ ] Distribution mechanism ADR accepted or explicitly deferred with reason

## Progress Log
<!-- Update during execution, with timestamps -->

- 2026-09-09: card created; 3 parallel research agents dispatched (CLI skill-dir
  survey / dsh agent-team + analogues / distribution channels)

## Related Files
- Modified:
- Added:

## Git Commit Message
```
docs(cortex): TASK-20260909150851116 wedge path research card (TASK-20260909150851116)

- Dogfood wedge observation → sequenced onboarding goal
- Research dispatched: CLI skill-dir matrix, dsh agent-team, distribution channels
```

## Notes
