# Skill-Coach Self-Improvement Log

> **KV-cache-friendly design**: This file caps at ~5 active lessons (~50 lines).
> When a 6th lesson arrives, the oldest is **consolidated** — either promoted to
> body Gotchas or archived to `cortex/wiki/patterns/skill-coach-lessons-learned.md`.
> Read this **before conducting a review** to avoid repeating recent mistakes.

## Active Lessons (max 5)

### 2026-04-30: From Dogma to Practice

**Trigger**: Arena test + user challenge + web search of community best practices.

**What was wrong**: "Narrative descriptions are anti-pattern" contradicted Anthropic
official guide and gstack (247K stars). The real issue is **burying the core verb**,
not narrative itself.

**Fix**: Rule rewritten to "don't bury the core verb." Added ~10-line exemption
for reference separation. Added Factual Accuracy + Naive Agent Test dimensions.

**Verification**: Arena A/B test (no coach: 5.5/10, with coach: 8/10). Both
perspectives needed.

---

## Consolidated Rules (already in body — no need to re-read)

| Lesson | Body Location | Date Consolidated |
|--------|---------------|-------------------|
| Don't bury the core verb | Gotchas | 2026-04-30 |
| ~10-line exemption for ref separation | Progressive Disclosure | 2026-04-30 |
| Question rules that conflict with community practice | Gotchas | 2026-04-30 |
| Factual Accuracy dimension | Evaluation Criteria #7 | 2026-04-30 |
| Naive Agent Test dimension | Evaluation Criteria #8 | 2026-04-30 |

---

## Archive

Full history (including consolidated entries with full context) lives at:
`cortex/wiki/patterns/skill-coach-lessons-learned.md`

---

## How to Add a New Lesson

1. Append to **Active Lessons** (top of file)
2. If this makes 6 active lessons, consolidate the oldest:
   - **Important & recurring** → add to body Gotchas (edit SKILL.md), then move to Consolidated Rules table
   - **Niche or one-off** → move to archive wiki page, then remove from this file
3. Never let this file exceed ~50 lines.
