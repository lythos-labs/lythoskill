# T5: Deep Research × Baoyu Combo — Arena Single Demo

> Arena single demo showing side-effect-skill observability:
> the HTML artifact IS the evidence that the skill pipeline worked.
> Prompt-completion eval frameworks (agent-skills-eval, etc.) cannot
> observe files written to disk — arena can.

## What this demo proves

| Dimension | What T5 demonstrates |
|-----------|----------------------|
| **Combinatorial deck** | 6 skills from 2 unrelated repos (Weizhena/Deep-Research-skills + JimLiu/baoyu-skills) compose into a single pipeline |
| **Side-effect observability** | Judge evaluates the 59KB HTML file, not the agent's chat output |
| **Real artifact** | `agent-skills-intro-for-content-ops.html` — a styled, WeChat-compatible page a human can read |

## The brief

A content-company CTO needs a 60-minute Agent Skills primer for non-technical
content-ops staff (5-8 people). Delivered as a styled HTML file.

See [`brief.md`](./brief.md) for full requirements.

## The deck

See [`skill-deck.toml`](./skill-deck.toml). 6 skills:

- `research` — generate structured outline
- `research-deep` — parallel deep agents per outline item
- `research-report` — synthesize into markdown
- `baoyu-url-to-markdown` — fetch web content as raw material
- `baoyu-format-markdown` — format for readability
- `baoyu-markdown-to-html` — render to styled HTML (WeChat theme)

## Result

| Metric | Value |
|--------|-------|
| Verdict | **PASS** |
| Criteria | 8/8 |
| Confidence | 78 |
| HTML output | [`run/agent-skills-intro-for-content-ops.html`](./run/agent-skills-intro-for-content-ops.html) (59 KB) |
| Markdown source | [`run/agent-skills-intro.md`](./run/agent-skills-intro.md) (12 KB) |
| Judge report | [`run/judge-verdict.json`](./run/judge-verdict.json) |

## Reproduce

```bash
./reproduce.sh
```

Or manually:

```bash
bunx @lythos/skill-arena@latest single \
  --deck showcase/2026-05-13-deep-research-baoyu-combo/skill-deck.toml \
  --brief "$(cat showcase/2026-05-13-deep-research-baoyu-combo/brief.md)"
```

## Why this matters

agent-skills-eval uses `openai.invoke()` — prompt-completion only. It scores text
output, never sees files. T5's judge scored the **HTML artifact** because arena runs
a full claude subagent in a sandbox cwd and observes everything written to disk.

Skills like `baoyu-markdown-to-html` (render to file) are structurally invisible to
prompt-completion eval frameworks. Arena is the only way to measure them.
