# Skill-Coach Lessons Learned Archive

> Complete history of skill-coach meta-lessons, including consolidated entries.
> This is cold storage — read only when researching the evolution of a specific rule.
> For active lessons, see `skills/lythoskill-skill-coach/references/self-improvement-log.md`.

---

## 2026-04-30: From Dogma to Practice

**Trigger**: Arena test (A/B subagent comparison) + user challenge + web search of community best practices.

### What Was Wrong

The original skill-coach had 6 dimensions and several dogmatic rules that contradicted real-world success:

1. **"Narrative descriptions are anti-pattern"** — False. Anthropic official guide and gstack (247K stars) both use narrative descriptions with conditional clauses ("Use when user uploads…"). The real anti-pattern is **burying the core verb** in clause depth, not narrative itself.

2. **"Separate everything to references/"** — False without threshold. Forcing a 6-line quick-reference table into a separate file increases cognitive overhead without meaningful token savings. The threshold should be ~10 lines.

3. **Only checking form compliance** — Missing Factual Accuracy and Naive Agent Test. A skill can pass all form checks while being factually wrong (e.g. claiming "three layers" but listing two) or unusable by a naive agent (missing prerequisites, no output examples).

### What Changed

- Expanded from 6 to **8 dimensions**:
  1. Body Size
  2. Description + when_to_use
  3. Progressive Disclosure
  4. Reference File Hygiene
  5. Frontmatter Hygiene
  6. One Skill, One Job
  7. Factual Accuracy (new)
  8. Naive Agent Test (new)

- Added **~10-line exemption** for reference separation
- Added Gotcha: **"Reference community practice when rules conflict with reality"**
- Added Gotcha: **"burying the core verb wastes description budget"** (replaces "narrative is bad")

### Verification

Arena test results:
- A group (no skill-coach): 5.5/10, found 6 issues including architecture mismatch
- B group (with skill-coach): 8/10, found 3 issues including reference dead files
- **Insight**: Both perspectives are needed. Form compliance + factual accuracy + naive usability = complete review.

### Consolidation Status

All lessons from this entry have been promoted to body Gotchas or Evaluation Criteria.
See `skills/lythoskill-skill-coach/SKILL.md` for current state.
