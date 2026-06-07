# Weekly File Template
> Location: `weekly/YYYY-WNN.md`
> Source: [packages/lythoskill-project-scribe/skill/references/weekly-template.md](../../../../packages/lythoskill-project-scribe/skill/references/weekly-template.md)

---

## Format Philosophy

**Weekly = narrative compression for human retrospectives.** The daily is for the next agent; the weekly is for the human to zoom out and see patterns.

| What daily does | What weekly does |
|:---|:---|
| Dumps session facts | Extracts cross-session patterns |
| Lists completed tasks | Shows quest DAG evolution |
| Records individual pitfalls | Identifies systemic failure modes |
| Tracks working tree state | Tracks strategic priority shifts |

**Critical rule**: Never replay git log or cortex INDEX. Those are direct queries already. The weekly distills what those queries **cannot** reveal: the narrative thread, the emergent patterns, the "why" behind priority shifts.

---

## Template

```markdown
---
period: YYYY-MM-DD_to_YYYY-MM-DD
core_thread: "One-sentence narrative that captures the entire week. Not a summary — a thesis."
priority_at_start:
  - "What was planned at the start of the week"
  - "Second priority"
priority_at_end:
  - "What actually landed by week's end"
  - "Second landed priority"
quests_advanced:
  - "Quest name: concrete advancement (quantified if possible)"
quests_unlocked:
  - "New quest or capability that became available this week"
quests_paused: []
parked_threads:
  - "Thread that was deliberately paused, with brief context"
parked_reasoning: |
  <Paragraph explaining WHY threads are parked. Not excuses — strategic reasoning.
  "Parked 3 weeks because X and Y took priority. Will resume when Z condition is met.">
decisions_accepted:
  - "ADR-ID: short description of accepted decision"
retro_cells:
  planned_done: "What was planned AND got done"
  planned_paused: "What was planned but NOT done (and why)"
  emergent_done: "What was NOT planned but got done anyway"
  emergent_paused: "What emerged but was paused"
project_lesson_candidates:
  - "Insight that might become a project lesson or ADR"
docs_now_stale:
  - "Documentation that became stale this week and needs updating"
  - "None — all changes immediately reflected in reference docs"
next_week_anchors:
  - "Specific, actionable anchor for next week (not vague 'continue X')"
  - "Second anchor"
references:
  daily: ["daily/YYYY-MM-DD.md", "daily/YYYY-MM-DD.md"]
  cortex_index: cortex/INDEX.md
---

# Weekly — YYYY-WNN

## TL;DR

<2-3 sentence summary of the week. Human-readable, information-dense.>

## 4-Quadrant Retro

| | Planned | Emergent |
|:---|:---|:---|
| **Done** | | |
| **Paused** | | |

## Quest DAG

```
<Quest or epic name> (status)
├── Sub-task or phase ✅
├── Another task 🔍
└── Paused task ⬜
```

## Project Lessons

- **Lesson title**: Insight in one sentence. If it has enough depth, link to ADR or reference doc.
- **Second lesson**: 
```

---

## YAML Frontmatter Reference

### Required Fields

| Field | Type | Description |
|:---|:---|:---|
| **period** | string | `YYYY-MM-DD_to_YYYY-MM-DD` format. Start = first day of week, end = last day. |
| **core_thread** | string | One-sentence thesis. The narrative spine of the entire week. Not a list — a story. |
| **priority_at_start** | string[] | What was planned at the start. Copied from last week's `next_week_anchors` or epic tasks. |
| **priority_at_end** | string[] | What actually landed. Honest assessment, not wishful thinking. |
| **retro_cells** | object | Four-quadrant retro: planned_done, planned_paused, emergent_done, emergent_paused. |

### Optional Fields

| Field | Type | When to include |
|:---|:---|:---|
| **quests_advanced** | string[] | Concrete quest progress. Include quantitative signals. |
| **quests_unlocked** | string[] | New capabilities or quests that became available. |
| **quests_paused** | string[] | Explicitly empty `[]` if none — proves you checked. |
| **parked_threads** | string[] | Threads paused with brief context. |
| **parked_reasoning** | string | Multi-line paragraph explaining WHY threads are parked. Added in W24 to replace vague "not started" with strategic reasoning. |
| **decisions_accepted** | string[] | ADRs accepted this week. |
| **project_lesson_candidates** | string[] | Insights that might become lessons or ADRs. |
| **docs_now_stale** | string[] | Documentation debt. Explicitly list "None" if clean. |
| **next_week_anchors** | string[] | Specific, actionable anchors for next week. Not vague "continue X". |
| **references** | object | `daily`: array of daily file paths. `cortex_index`: path to INDEX.md. |

---

## Markdown Body Sections

### TL;DR (REQUIRED)
2-3 sentence human-readable summary. This is what a tired human reads on Sunday night. Information density > completeness.

### 4-Quadrant Retro (REQUIRED)
A 2×2 table:
- **Planned / Done**: What was planned and completed.
- **Planned / Paused**: What was planned but not done (and why).
- **Emergent / Done**: What was not planned but got done anyway.
- **Emergent / Paused**: What emerged but was deliberately paused.

This format prevents the "everything is fine" bias by forcing acknowledgment of paused work.

### Quest DAG (REQUIRED)
Tree or list showing quest/epic structure and status. Use emoji for quick visual scan:
- `✅` = done
- `🔍` = in review / active
- `⬜` = not started / paused

### Project Lessons (REQUIRED if any)
Bulleted list of insights. Each lesson should be:
- Generalizable (not just "this one bug was hard")
- Actionable (implies a change in behavior or process)
- Linked to evidence (commit hash, test count, ADR reference)

---

## Anti-patterns

| Anti-pattern | Why it hurts | Fix |
|:---|:---|:---|
| **Pure YAML (W24 degeneration)** | Human cannot read the weekly without parsing YAML | Always include markdown body: TL;DR + Retro + Quest DAG |
| **Replay git log** | Wastes tokens; git log is a direct query | Distill patterns, not events |
| **Vague `next_week_anchors`** | "Continue testing" is not an anchor | Include package/path and specific target |
| **Missing `parked_reasoning`** | "Not started" looks like negligence | Explain the strategic trade-off |
| **Empty `docs_now_stale` omitted** | Cannot distinguish "clean" from "forgot to check" | Explicitly write "None" if no stale docs |
| **`core_thread` as list** | A list is not a narrative | One sentence with a thesis |

---

## Related

- [daily-template.md](./daily-template.md) — daily counterpart
- [lythoskill-project-scribe-weekly skill](../../../../lythoskill-project-scribe-weekly/skill/SKILL.md) — scribe-weekly skill
