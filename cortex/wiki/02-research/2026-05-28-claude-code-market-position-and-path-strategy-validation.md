# Claude Code Market Position & Path Strategy Validation

> Research date: 2026-05-28. Validates the two-path strategy (`.claude/skills/` + `.agents/skills/`) against current market data.

## Market Reality (May 2026)

| Metric | Claude Code | Codex CLI |
|--------|-------------|-----------|
| Market share | 32.4% | 34.1% |
| GitHub commits/day | 135K | — |
| Developer satisfaction | 84% | — |
| "Would fight to keep" | 46% | <25% |
| Influencer share of voice | 75% | 22% |
| Workplace adoption | 6x Codex | — |
| Share of coding agent spend | 92% | — |
| ARR | $2.5B | — |

Sources: AI Coding.Info (9,000+ repos), GlobalData, Requesty.ai, Morphllm.

## Key Findings

1. **Claude Code + Codex = ~66% combined share.** Most professional devs use 2-3 tools (Cursor for editing, Claude Code for hard problems, Codex for parallel work). Multi-agent workspace is the norm, not the edge case.

2. **Claude Code captures 92% of coding agent spend.** Developers actively choose and pay for Claude Code even when cheaper alternatives exist — this is revealed preference, not just install counts.

3. **`.claude/skills/` default + `.agents/skills/` community standard covers the overwhelming majority.** Claude Code uses `.claude/skills/`; Codex + 14 others use `.agents/skills/`. Together these two paths cover virtually the entire active ecosystem. Other branded paths (`.windsurf/skills/`, `.qwen/skills/`, etc.) are straightforward for users to configure themselves.

4. **Claude Code with open-source models is common.** Users frequently pair Claude Code CLI with non-Anthropic models via API proxies — `.claude/skills/` is not tied to Anthropic's models. This further strengthens the case for making it the default `working_set`.

## Implication for lythoskill Path Strategy

**Two-path strategy confirmed as well-founded:**

- **`.claude/skills/` as default** — justified by market dominance, developer preference, and spend share. Skill concept originated here.
- **`.agents/skills/` via `also_link_to`** — covers the community standard adopted by Codex and 14+ agents. One `also_link_to` entry reaches the rest of the ecosystem.
- **Other branded paths** — users who need them can configure. No need for the tool or examples to enumerate every possibility; the pattern is self-explanatory.

This validates the current `path-convention.md` design: Claude Code default + community standard fan-out, without claiming exclusivity for either.
