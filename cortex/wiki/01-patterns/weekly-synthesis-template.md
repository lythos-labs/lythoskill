---
period: YYYY-MM-DD_to_YYYY-MM-DD
core_thread: "..."
priority_at_start: []
priority_at_end: []
quests_advanced: []
quests_unlocked: []
quests_paused: []
quests_dropped: []  # explicit drop, not just pause
parked_threads: []
parked_reasoning: |
  # unblock_condition per item
decisions_accepted: []
retro_cells:
  planned_done: ""
  planned_paused: ""
  emergent_done: ""
  emergent_paused: ""
project_lesson_candidates: []  # source-required: must cite TASK-xxx or commit
validated_lessons: []  # confirmed insights with evidence
docs_checked: true  # mandatory boolean — force the check
docs_now_stale: []  # mandatory, empty = explicit "none detected"
docs_stale_lifespan: []  # weeks unresolved per stale doc
epic_status_audited: true  # mandatory boolean — force the check
false_convergence_flagged: []  # mandatory checklist
information_density_score: "N/10"  # self-rating, 5-10 is healthy
omissions_this_week: []  # key innovation: what was skipped and why
references:
  daily: []
  cortex_index: cortex/INDEX.md
---

# Weekly Synthesis — YYYY-WXX

> **TL;DR thesis**: [One sentence capturing the week's core narrative. Not a feature list.]
> **Honest signal**: [One sentence about what did NOT go well. Prevents optimism bias.]

---

## 1. 4-Quadrant Retro

| Quadrant | Items | Meta |
|----------|-------|------|
| **Planned + Done** | [One sentence per item. Max 3. Rest → references.] | [Pattern: why did planned items succeed?] |
| **Planned + Paused** | [One sentence per item. Max 3. Rest → references.] | [Pattern: why did planned items stall?] |
| **Emergent + Done** | [One sentence per item. Max 3. Rest → references.] | [Pattern: what unplanned work emerged and why?] |
| **Emergent + Paused** | [One sentence per item. Max 3. Rest → references.] | [Pattern: what was noted but not acted on?] |

**Meta paragraph**: [One paragraph synthesizing the 4-quadrant pattern. Not a list.]

---

## 2. Quest DAG (Status Only)

```
[Epic-1] → [Task-A] → [Task-B] → [Task-C]  [status: all done | active | stalled]
[Epic-2] → [Task-D] → [Task-E]              [status: active | stalled]
```

**Quests dropped this week**: [Explicitly dropped, not just paused. Why?]

---

## 3. Project Lesson Candidates (Observation-Bound, Max 5)

Each candidate MUST cite a concrete event (TASK-xxx, commit hash, or daily file). Taxonomic restatements are rejected.

| # | Candidate | Source | Confidence | Falsification Condition |
|---|-----------|--------|------------|----------------------|
| 1 | [Observation from this week] | [TASK-xxx / commit abc123] | [high/medium/low] | [What would prove this wrong?] |
| 2 | ... | ... | ... | ... |

---

## 4. Validated Lessons (Confirmed Insights)

Lessons that have survived ≥2 independent sessions or ZK review. Not new observations — confirmed patterns.

| # | Lesson | First Observed | Validation | Status |
|---|--------|---------------|------------|--------|
| 1 | [Confirmed pattern] | [Wxx] | [ZK Review / 2+ sessions] | [active / deprecated] |
| 2 | ... | ... | ... | ... |

---

## 5. Anti-Rot & Accountability

### 5.1 Docs Stale Check
- `docs_checked`: [true / false — if false, explain why not]
- `docs_now_stale`: [List stale docs, or explicit "none detected after checking X, Y, Z"]
- `docs_stale_lifespan`: [For each stale doc: weeks since flagged, owner, resolution path]

### 5.2 Epic Status Audit
- `epic_status_audited`: [true / false — if false, explain why not]
- `false_convergence_flagged`: [Epics marked done with incomplete tasks, or "none after checking"]

### 5.3 Parked Lot (Kill Dates + Re-Parking Cost)

| Item | Age (weeks) | Last Action | Unblock Condition | Kill Date | Owner |
|------|-------------|-------------|-------------------|-----------|-------|
| [Paused work] | [N] | [What was tried] | [What would unblock] | [YYYY-MM-DD] | [Who decides] |
| ... | ... | ... | ... | ... | ... |

**Re-parking cost rule**: Any item parked >2 weeks must include:
- Re-parking justification (why still paused?)
- Or move to `quests_dropped`
- Or escalate to P0

---

## 6. Omissions This Week

[Explicitly state what was skipped and why. Prevents silent degradation.]

- `docs_now_stale`: [skipped / checked — if skipped, why?]
- `parked_reasoning`: [skipped / written — if skipped, why?]
- `project_lesson_candidates`: [skipped / written — if skipped, why?]
- `epic_status_audited`: [skipped / done — if skipped, why?]
- [Any other section skipped]: [reason]

---

## 7. Reference Pointers

- **Daily files**: [relative paths, e.g., `./daily/2026-06-15.md`]
- **ADR/Epic references**: [relative paths with IDs]
- **Commit range**: [git log --since="7 days ago" --oneline]
- **Cortex index**: [cortex/INDEX.md — current state snapshot]

---

## Appendix: Template Changelog

| Week | Change | Rationale |
|------|--------|-----------|
| W26 | Added `docs_checked`, `epic_status_audited`, `omissions_this_week` | Prevent silent degradation |
| W26 | Restored `docs_now_stale`, `parked_reasoning` | Anti-rot accountability |
| W27 | Added `information_density_score`, `docs_stale_lifespan`, `false_convergence_flagged` | Density + rot tracking |
| W27 | Split `project_lesson_candidates` into candidate + validated tiers | Prevent assertion bloat |
| W28 | Added Parked Lot with kill dates + re-parking cost rule | Prevent zombie items |
| W29 | Audit: stabilize or drop unused fields | Continuous improvement |

---

> **Template source**: `cortex/wiki/01-patterns/weekly-synthesis-template.md` (this file)
> **Last updated**: 2026-06-15
> **Status**: active (W26+ transition in progress)
> **Related**: `packages/lythoskill-dreaming/skill/SKILL.md`, `packages/lythoskill-project-cortex/skill/references/writing-guide.md`
