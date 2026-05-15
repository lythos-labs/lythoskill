# Arena vs — Seed Bootstrap: Free Form vs Baoyu Standardized

> Date: 2026-05-15
> Run ID: arena-vs-seed-bootstrap-baoyu
>
> Two agents, same seed (lythoskill-deck only), same task, different approach:
> - **Free Form**: discover skills autonomously, no methodology guidance
> - **Baoyu Standardized**: research baoyu-skills methodology first, then apply
>
> Task: Generate a complete content report on "AI Coding Agents Ecosystem Comparison"
> — 5 agents × 5 dimensions, with article text, radar chart, cover illustration,
> publishable HTML/docx output.

## Results at a Glance

| Metric | Free Form | Baoyu Standardized |
|--------|-----------|-------------------|
| Time | 6.7 min | 7.5 min |
| Tokens | 49.9K | 71.2K (+42%) |
| Tool calls | 38 | 68 (+79%) |
| Skills added | 2 | 4 |
| Skill failures | 0 | 3/4 partial/full |
| HTML | 19K dark theme | 40K orange accent |
| Radar chart | PNG 522K (matplotlib) | SVG 9K + PNG 87K (baoyu-diagram) |
| Cover | PNG 413K (matplotlib) | PNG 50K (baoyu-cover-image fallback) |
| docx | ✅ 13.8K (pandoc) | ❌ missing |

## Judge Verdict

| Dimension | Free Form | Baoyu | Winner |
|-----------|-----------|-------|--------|
| D1 Content Completeness | 8 | 9 | Baoyu |
| D2 Visual Quality | 7 | 8 | Baoyu |
| D3 Publishability | 8 | 7 | Free Form |
| D4 Methodology Coherence | 6 | 8 | Baoyu |
| D5 Resource Efficiency | 8 | 6 | Free Form |

**Overall winner: Baoyu Standardized (narrow margin)**

Full verdict in [`verdict.md`](./verdict.md).

## Key Insight 1: 心法 > 工具链

Baoyu's 4 skills had partial/full failures:

| Skill | Failure | Fallback |
|-------|---------|----------|
| baoyu-diagram | `sharp` (libvips) missing for SVG→PNG | Python/PIL generated PNG directly |
| baoyu-markdown-to-html | `deck link` blocked by network probe | Manual symlink from cold pool |
| baoyu-cover-image | `baoyu-imagine` no API key configured | Python/PIL rendered cover programmatically |
| baoyu-article-illustrator | Same imagine API issue | Methodology applied without image gen |

**But the agent still completed the task** — because it had read the SKILL.md and internalized the methodology (Type × Style × Palette, dark theme, semantic color coding). Even when the execution layer broke, the "心法" (design principles) was transferrable to hand-rolled Python.

> **Lesson**: SKILL.md's value is not just "tell agent which tool to call" — it is "teach agent a methodology that survives tool failure."

## Key Insight 2: WIP ∝ Subagent Capability

This experiment was run with **WIP = 2** (two agents in parallel). The ceiling is determined by:

```
WIP_max = min(API key budget, rate limit slots, token budget, agent spawn limit)
```

| Resource | Session 5 usage | Headroom |
|----------|----------------|----------|
| API calls | ~3 concurrent agents | Claude API allows more |
| Tokens | ~170K total (3 agents) | Well within budget |
| Rate limit | No throttling observed | Healthy |
| Cold pool disk | ~500MB skills | SSD, no issue |

For a 4-side arena run, WIP = 4 would be feasible with current resources. For WIP > 4, token budget becomes the bottleneck (each side burns 50-70K tokens).

## Key Insight 3: Free Form = Ship It Now, Baoyu = Read and Trust

- **Free Form** is the better "ship it now" artifact: complete package (docx included), no toolchain wrestling, polished dark-theme HTML.
- **Baoyu** is the better "read and trust" artifact: richer per-dimension analysis, SVG vector graphics, explicit methodology, design-system coherence.

The ideal hybrid: **Baoyu's content structure + Free Form's execution pragmatism**.

## Files

| File | Description |
|------|-------------|
| `verdict.md` | Full judge evaluation with scoring rationale |
| `free-form-side-report.md` | Side A agent's self-report |
| `baoyu-side-report.md` | Side B agent's self-report |
| `free-form-radar-chart.png` | Matplotlib radar chart (522K, 2415×1978) |
| `free-form-cover.png` | Matplotlib cover illustration (413K, 3179×1779) |
| `baoyu-radar-chart.png` | baoyu-diagram PNG fallback (87K, 1800×1400) |
| `baoyu-radar-chart.svg` | baoyu-diagram SVG source (9K, scalable vector) |
| `baoyu-cover.png` | baoyu-cover-image fallback (50K, 1920×1080) |

## Reproduce

```bash
bash reproduce.sh
```

See [`reproduce.sh`](./reproduce.sh) for full reproduction steps.
