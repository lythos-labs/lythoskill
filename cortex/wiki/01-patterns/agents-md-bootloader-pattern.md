---
created: 2026-05-08
updated: 2026-05-08
category: pattern
---

# AGENTS.md as Network-Native Agent Bootloader

> AGENTS.md is the first file an agent reads when entering a repo. Use it as a bootloader — the agent loads it, understands the project structure, navigates to specific files, and produces output without being explicitly told what to read.

## The Pattern

1. **Deck declares the skills** — a mixed deck combining document-generating skills (docx, pdf) with domain-specific ones (mermaid, theme-factory)
2. **AGENTS.md is the bootloader** — written as the first entry point the agent sees, containing navigation instructions and expected output format
3. **Agent reads → navigates → produces** — the agent follows AGENTS.md to find relevant files, then uses deck skills to produce structured output

## Why It Works

Agents already read AGENTS.md on repo entry (it's in the Anthropic/Claude Code spec). By structuring it as a bootloader:

- No need to prompt the agent with file paths — AGENTS.md already lists them
- The agent autonomously discovers project structure through navigation instructions
- Output format is declared upfront (not negotiated mid-conversation)

## Verified PoC

`playground/architecture-explainer/` proves the pattern works:

| Input | Output |
|-------|--------|
| `examples/decks/architecture-explainer.toml` (7 skills) | `architecture.md` (644 lines, 8 Mermaid diagrams) |
| `playground/architecture-explainer/AGENTS.md` (bootloader) | `architecture.docx` (332KB) |
| Agent reads bootloader → navigates project → uses deck skills | `architecture.pdf` (353KB, 21 pages) |

## Minimal Reproduction

### 1. Create the deck

```toml
# examples/decks/my-explainer.toml
[deck]
cold_pool = "~/.agents/skill-repos"
working_set = ".claude/skills"

[innate.skills.lythoskill-deck]
path = "github.com/lythos-labs/lythoskill/skills/lythoskill-deck"

[tool.skills.visual-explainer]
path = "github.com/SpillwaveSolutions/skills/mermaid"

[tool.skills.theme-factory]
path = "github.com/anthropics/skills/skills/theme-factory"

[tool.skills.docx]
path = "github.com/anthropics/skills/skills/docx"

[tool.skills.pdf]
path = "github.com/anthropics/skills/skills/pdf"
```

### 2. Write the bootloader AGENTS.md

```markdown
# Project Architecture Explainer

## What This Project Is
<brief description of the project structure>

## Key Files to Read
- `src/` — main source code
- `packages/` — monorepo packages
- `docs/` — documentation

## Expected Output
Produce three files:
1. `architecture.md` — complete architecture documentation with Mermaid diagrams
2. `architecture.docx` — polished document version
3. `architecture.pdf` — PDF export

## Instructions
Navigate the project tree, read key files, then use your skills to generate output.
```

### 3. Link and run

```bash
deck link --deck examples/decks/my-explainer.toml
# Agent session: "docs(bootloader): produce architecture docs for this project"
```

## When to Use

| Use | Don't Use |
|-----|-----------|
| New team member onboarding | Single-file projects |
| Architecture documentation generation | When README already covers it |
| Cross-team knowledge sync (shared deck URL) | Interactive exploration (just explore manually) |
| Repeatable doc generation (same deck, different repos) | Conversations that need back-and-forth |

## Related

- [architecture-explainer.toml](../../examples/decks/architecture-explainer.toml) — the reference deck
- [architecture-explainer playground](../../playground/architecture-explainer/) — PoC with all output artifacts
- [Multi-Agent POSSE Syndication](./2026-05-05-multi-agent-posse-syndication.md) — same session, syndication pattern
- [Agent Adapter as Actor](./2026-05-08-agent-adapter-as-actor-daemon-lifecycle-facade-pattern-for-multi-player-cli-backends.md) — actor model pattern
