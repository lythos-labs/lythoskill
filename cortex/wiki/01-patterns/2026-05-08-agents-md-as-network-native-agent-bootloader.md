---
created: 2026-05-08
updated: 2026-05-08
category: pattern
---

# AGENTS.md as Network-Native Agent Bootloader

> One URL → agent reads instruction file → understands task, context, tools → acts.

## What

AGENTS.md is a [cross-tool standard](https://www.morphllm.com/agents-md-guide) (Linux Foundation, Dec 2025) read by 20+ agents including Claude Code, Codex, Copilot, Cursor, Gemini CLI, Windsurf. 60,000+ GitHub repos use it.

When served from a URL (raw GitHub, gist, pastebin), AGENTS.md becomes a **bootloader**: a self-contained instruction set that tells an agent:

1. **Where it is** — cwd context, parent project location
2. **What tools are available** — skills in `.claude/skills/`
3. **What to do** — task description, output targets
4. **How to navigate** — file paths relative to cwd/parent
5. **Where to write** — output directory

## Why

Instead of writing a long prompt, you write a markdown file. The agent reads it at startup. This is:

- **Reusable** — same AGENTS.md works for any agent that reads the standard
- **Version-controlled** — changes go through PR review
- **Composable** — nested AGENTS.md (nearest file wins; Codex uses 88 across its monorepo)
- **URL-addressable** — `deck link --deck <url>` + AGENTS.md at a URL = complete remote bootstrap

## Pattern

```
<workspace>/
  deck.toml           ← skill selection (fetched via --deck <url> or local)
  AGENTS.md           ← bootloader: agent reads this first
  .claude/skills/     ← isolated working set
  output.*            ← agent writes here
```

The contract between AGENTS.md and the agent:

1. **Location** — AGENTS.md tells the agent where it is and where the project context lives
2. **Tools** — declares what skills are available (via deck.toml → working set)
3. **Task** — describes what to produce and where to write it
4. **Context** — points to relevant project files (docs, ADRs, wiki, source)
5. **Constraints** — boundaries: what NOT to do, what NOT to modify

The agent reads AGENTS.md at startup (alongside CLAUDE.md if present). The nearest AGENTS.md wins — nested directories can override.

## Relationship to Karpathy's Skills Practice

Karpathy's approach (circulating on social media 2026): specify an instruction file that tells the agent how to operate. AGENTS.md is the standardized version — instead of ad-hoc prompts, a structured file that any compliant agent can read.

## Examples

The pattern is general — below is one concrete instance.

### Example: Architecture Explainer

`playground/architecture-explainer/` uses this pattern to produce project architecture docs. The AGENTS.md specifies:
- Skills: mermaid, frontend-design, theme-factory, brand-guidelines, docx, pdf
- Parent project: `..` = lythoskill monorepo
- Context: `../cortex/wiki/01-patterns/`, `../cortex/adr/02-accepted/`
- Output: `architecture.md` (Round 1), `architecture.docx` + `architecture.pdf` (Round 2)

Result: 644-line architecture reference with 8 Mermaid diagrams, validated docx + PDF.

Other use cases: code review checklist, CI incident response runbook, new-contributor onboarding walkthrough, multi-repo integration test scenario. Any task you can describe in markdown can be an AGENTS.md bootloader.

## Related Patterns

- **Intent/Plan/Execute** — AGENTS.md declares intent; agent builds plan; executes
- **Deck Governance** — `deck.toml` selects skills; AGENTS.md declares task
- **Pre-built Decks** — `examples/decks/` are URL-addressable skill presets
- **Everything-from-URL** (EPIC-20260508082810062) — this pattern is T5 of the epic

## References

- [AGENTS.md & SKILL.md: The Complete Guide (2026)](https://www.morphllm.com/agents-md-guide)
- [How AI Instructions Split into Three Layers](https://dev.to/aws-builders/agentsmd-skillmd-designmd-how-ai-instructions-split-into-three-layers-d0g)
- [AGENTS.md Specification (Agentic AI Guide)](https://yeasy.gitbook.io/agentic_ai_guide/di-wu-bu-fen-fu-lu/12_appendix/12.3_agents_md)

# AGENTS.md as network-native agent bootloader

> One-line summary of this pattern.

## Context
<!-- When does this apply? What problem does it solve? -->

## Details
<!-- The core content. Be specific. -->

## When to Apply / When Not to Apply
<!-- Boundaries and exceptions. -->

## Related
<!-- Links to related wiki entries, ADRs, or tasks. -->
