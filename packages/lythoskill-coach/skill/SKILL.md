---
name: lythoskill-coach
version: 0.7.0
type: standard
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

**Formula** (per Anthropic official guide): `[What it does] + [When to use it] + [Key capabilities]`

Anti-pattern is **not** "has narrative" — it's **burying the core verb** in clause depth
("For teams that struggle with maintaining consistent deployment pipelines across
environments, this skill provides…" → 核心动词 "automates deployments" 被埋在第 5 个词后).
Good narrative: "Automates multi-environment deployments. Use when CI pipelines
fail across staging/production drift. Supports rollback, canary, and blue-green."
Bad narrative: "The pain point is that teams struggle with…" (front-loads problem, not solution).
### 3. Progressive Disclosure
Three tiers of skill content:

- **Tier 1** (always loaded): name + description + when_to_use → skill matching
- **Tier 2** (on invoke): SKILL.md body → operational instructions
- **Tier 3** (on demand): references/ files → deep documentation

Check: is content at the right tier?
- "When to use this" → must be in description/when_to_use (Tier 1)
- Gotchas agent needs before encountering them → body (Tier 2)
- Tutorials, architecture, glossaries → references (Tier 3)

**Exemption**: Content under ~10 lines that is operationally essential (e.g. a
3-line architecture summary, a 5-line prerequisites list) may stay in the body
even if theoretically Tier 3. The overhead of creating a reference file and a
trigger condition for 10 lines often exceeds the token savings. Judge by net
value, not dogma.

### 4. Reference File Hygiene
Each reference needs a clear trigger condition in the body:
- **Good**: "Read references/api-errors.md when the API returns non-200"
- **Bad**: "See references/ for more details"
The reference table is a conditional dispatch table, not a bibliography.

Also applies to `scripts/` and `assets/`: if body mentions them, state when to use.
Silently present directories that body never references are dead weight.

### 5. Frontmatter Hygiene
Official Claude Code fields: name, description, when_to_use, argument-hint,
arguments, disable-model-invocation, user-invocable, allowed-tools, model,
effort, context, agent, hooks, paths, shell.

**Critical: `type` field**
- Must be `standard` or `flow` (Kimi CLI constraint)
- Any other value (`innate`, `tool`, `combo`, `transient`) causes Kimi CLI to skip the skill silently
- These are **deck governance sections**, not SKILL.md types

Custom fields: use a consistent prefix (e.g. `deck_`). Custom fields are
parsed but not injected into context — zero token cost.

#### 5.1. Type Field (CRITICAL)
- **Value**: MUST be `standard` or `flow`
- **Why**: Kimi CLI validates `skill_type in ("standard", "flow")`; other values trigger `ValueError` and the skill is silently skipped
- **Common mistake**: Using `type: tool` or `type: combo` — these are deck.toml section names, not SKILL.md types

### 6. One Skill, One Job
A skill should do one thing well. If it has 3+ unrelated responsibilities,
split it. Exception: multiple topics sharing one operational workflow.

### 6.1. Thin Skill Principle
- **Skill = Controller**, not Service. Heavy logic belongs in npm/pip/cli tools
- **Skill thickness**: SKILL.md should be <500 lines. If it exceeds, move content to `references/` or extract to an external package
- **Build pipeline**: `lythoskill build` compiles monorepo skill source → thin release directory (SKILL.md + scripts + references)
- **Mental model**: "Fat agent + thin skill + mature infra" — agent does interpretive work, CLI does deterministic work

## 7. Factual Accuracy
A skill that perfectly follows all form rules but **describes its own behavior
incorrectly** is worse than a messy but honest skill. Check:
- Architecture claims match reality (e.g. "three layers" actually lists three)
- CLI flags documented exist in the actual CLI
- File paths referenced exist after build
- Output formats claimed are what the tool actually produces

**Always verify before scoring.** Form compliance without factual accuracy
produces false confidence.

## 8. Documentation-Code Consistency (Drift Prevention)

A skill has **three surfaces** that must stay in sync:

| Surface | Audience | Content |
|---------|----------|---------|
| **CLI --help** | Human users, scripts | Commands, flags, examples |
| **README.md** | npm/bunx discoverers | What the package does, how to install/use |
| **SKILL.md** | Agent | When to invoke, workflow orchestration, gotchas |

### Common Drifts

**SKILL.md documents a command that doesn't exist in the CLI.**
- Example: SKILL.md says `generate` but CLI only has `template` and `prompt`
- Fix: Remove the fictional command from SKILL.md. Add it to CLI if it belongs there.

**SKILL.md implies output formats the tool doesn't produce.**
- Example: "Render to SVG or PNG" but `render` only outputs SVG, PNG needs a separate `convert`
- Fix: Be precise. "`render` produces SVG. Use `convert` for PNG/WebP/JPG/AVIF."

**README.md is missing or stale.**
- npm/bunx users see an empty README and can't figure out what the package does
- Fix: README must have: one-line description, install/run commands, at least one example

**SKILL.md does agent work that should be in the CLI, or vice versa.**
- Example: CLI has a `prompt` command that generates LLM prompt templates. Prompt engineering belongs in SKILL.md (agent layer), not in CLI (tool layer).
- Rule: CLI does **deterministic** work (templates, rendering, validation). Agent does **interpretive** work (prompt writing, conditionals, error recovery).

### Verification Method: Subagent Test

The only reliable way to detect drift is to **give a zero-context subagent the SKILL.md and a task**:

> "You have no prior knowledge of this project. Use the skills in `.claude/skills/`
> to [do X]. Read SKILL.md for instructions. Do not ask for help."

If the subagent fails because SKILL.md told it to use a non-existent command,
you have a drift. Fix it.

## 9. Naive Agent Test (Content Completeness)
A skill that passes all static checks may still fail in practice because it
assumes knowledge the agent doesn't have. Test by mental simulation (or actual
subagent dispatch):

> Give a naive agent only this SKILL.md + a typical user request. Can it
> complete the task without guessing?

Common completeness gaps:
- **No Quick Start / end-to-end example**: Agent knows commands exist but not
  the expected sequence or output format.
- **No prerequisites**: Agent doesn't know it needs Bun, pnpm, or a specific
  directory structure.
- **No boundary behavior**: "What if the target directory already exists?"
  "What if SKILL.md lacks frontmatter?" Agent has to guess.
- **Output not described**: A scaffold tool must show the generated directory
  tree. A review tool must show the output format. Without this, the agent
  hallucinates.

**This is the most important dimension.** A 39-line skill with complete
instructions outperforms a 390-line skill full of gaps.

## Key Numbers (Quick Reference)
| Metric | Value | Source |
|--------|-------|--------|
| SKILL.md body max lines | 500 | Claude Code docs |
| Post-compaction budget per skill | 5,000 tokens | Auto-compaction |
| Total re-attached skills budget | 25,000 tokens | Auto-compaction |
| description + when_to_use cap | 1,536 characters | Skill listing |
| All descriptions budget | 1% of context window (fallback: 8,000 chars) | Skill listing |
| Budget override env var | `SLASH_COMMAND_TOOL_CHAR_BUDGET` | Claude Code config |
| SKILL.md `type` | `standard` or `flow` only | Kimi CLI validator |
| Custom field prefix | `deck_` | lythoskill convention |
| Locator format | FQ: `host.tld/owner/repo/skill` | ADR-20260502012643244 |

## Gotchas
**"See references/ for more details" is a bibliography, not a dispatch table.**
Every reference entry needs a trigger condition: "Read X when Y happens."

** burying the core verb wastes description budget.**
"For teams that struggle with maintaining consistent deployment pipelines…"
→ "Automates multi-environment deployments with rollback support."
Front-load the solution, not the problem.

**Don't paste reference content into the body "just in case."**
If the agent can always reach the reference, body bloat buys nothing. The 5,000-token
compaction budget is real — a 15,000-token skill loses 2/3 of its content.

**Reference community practice when rules conflict with reality.**
High-star skills (gstack, anthropic-official) use narrative descriptions with
conditional clauses ("Use when user uploads…"). The formula is
[What it does] + [When to use it] + [Key capabilities], not "functional only."
If a rule contradicts proven community patterns, question the rule, not the pattern.

## Analysis Output
When reviewing a SKILL.md, produce a scoring table and then list the top 3
highest-impact improvements with before/after examples.

**Before each review**: read [references/self-improvement-log.md](./references/self-improvement-log.md)
for recent meta-lessons that may affect your scoring (e.g. updated rules,
community practice findings, common pitfalls from past reviews).

See [references/analysis-template.md](./references/analysis-template.md) for the
exact table format and prioritization rules.

## Supporting References
Read this **only when producing the analysis table**:

| When you need to… | Read |
|--------------------|------|
| See the full scoring table template and improvement format | [references/analysis-template.md](./references/analysis-template.md) |
