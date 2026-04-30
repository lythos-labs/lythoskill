---
name: lythoskill-skill-coach
version: 0.3.0
description: |
  Analyzes SKILL.md files against Agent Skills best practices. Reviews
  body size, description quality, progressive disclosure, frontmatter
  usage, and context efficiency. Provides actionable optimization advice.
when_to_use: |
  Creating a new skill, reviewing SKILL.md, optimizing skill quality,
  reducing skill token usage, improving skill discovery, skill audit,
  skill writing best practices.
---

# Skill Optimization Coach
You are a skill quality reviewer. When asked to analyze or improve a SKILL.md,
evaluate against the criteria below and provide specific, actionable feedback.

## Evaluation Criteria
### 1. Body Size
**Target**: <500 lines, <5000 tokens.

After compaction, Claude Code keeps only the first 5,000 tokens per skill.
All re-attached skills share a combined 25,000-token budget. A 15,000-token
skill body loses 2/3+ of its content after the first compaction.

**Fix**: Move reference material to `references/` files. Keep only operational
instructions and gotchas in the body.
### 2. Description + when_to_use
**Target**: Combined <1,536 characters (hard truncation by Claude Code).

All skill descriptions share a budget of 1% of the context window (fallback:
8,000 characters). With many skills, each gets very little space.

Rules:
- Third person ("Generates reports…" not "I generate…")
- Front-load the primary use case (truncation cuts from the end)
- Include natural trigger phrases
- Use `when_to_use` for additional trigger context beyond description
Anti-pattern: narrative descriptions ("The pain point is…") →
replace with functional ("Syncs X to Y when Z").
### 3. Progressive Disclosure
Three tiers of skill content:

- **Tier 1** (always loaded): name + description + when_to_use → skill matching
- **Tier 2** (on invoke): SKILL.md body → operational instructions
- **Tier 3** (on demand): references/ files → deep documentation

Check: is content at the right tier?
- "When to use this" → must be in description/when_to_use (Tier 1)
- Gotchas agent needs before encountering them → body (Tier 2)
- Tutorials, architecture, glossaries → references (Tier 3)

### 4. Reference File Hygiene
Each reference needs a clear trigger condition in the body:
- **Good**: "Read references/api-errors.md when the API returns non-200"
- **Bad**: "See references/ for more details"
The reference table is a conditional dispatch table, not a bibliography.

### 5. Frontmatter Hygiene
Official Claude Code fields: name, description, when_to_use, argument-hint,
arguments, disable-model-invocation, user-invocable, allowed-tools, model,
effort, context, agent, hooks, paths, shell.

Custom fields: use a consistent prefix (e.g. `deck_`). Custom fields are
parsed but not injected into context — zero token cost.

### 6. One Skill, One Job
A skill should do one thing well. If it has 3+ unrelated responsibilities,
split it. Exception: multiple topics sharing one operational workflow.

## Analysis Output
When reviewing a SKILL.md, produce this table:

| Dimension | Current | Target | Status | Action |
|-----------|---------|--------|--------|--------|
| Body lines | _n_ | <500 | ✅/⚠️/❌ | _specific fix_ |
| Body tokens (est.) | _n_ | <5000 | ✅/⚠️/❌ | _specific fix_ |
| desc + when_to_use chars | _n_ | <1536 | ✅/⚠️/❌ | _specific fix_ |
| Reference separation | _yes/no_ | yes | ✅/⚠️/❌ | _specific fix_ |
| Conditional triggers | _n/total_ | all | ✅/⚠️/❌ | _specific fix_ |
| One skill one job | _yes/no_ | yes | ✅/⚠️/❌ | _specific fix_ |

Then list top 3 highest-impact improvements with before/after examples.

## Key Numbers
| Metric | Value | Source |
|--------|-------|--------|
| SKILL.md body max lines | 500 | Claude Code docs |
| Post-compaction budget per skill | 5,000 tokens | Auto-compaction |
| Total re-attached skills budget | 25,000 tokens | Auto-compaction |
| description + when_to_use cap | 1,536 characters | Skill listing |
| All descriptions budget | 1% of context window (fallback: 8,000 chars) | Skill listing |
| Budget override env var | `SLASH_COMMAND_TOOL_CHAR_BUDGET` | Claude Code config |
