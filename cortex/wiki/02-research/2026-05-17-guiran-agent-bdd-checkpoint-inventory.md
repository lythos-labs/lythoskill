---
created: 2026-05-17
updated: 2026-05-17
category: research
status: checkpoint-inventory
---

# Guiran Agent BDD Checkpoint Inventory

> Experiment: seed + candidate-pool multi-phase brand workflow with cross-ecosystem skill composition.
> Sources: `playground/guiran-seed-arena/`, `playground/guiran-pool-arena/`

## 1. Seed Bootstrap & Discovery

| # | Checkpoint | Verified |
|---|-----------|----------|
| 1.1 | Agent reads `lythoskill-deck` SKILL.md and learns deck schema | ✅ |
| 1.2 | Agent uses curator `name LIKE '%keyword%'` for skill discovery | ✅ |
| 1.3 | Agent selects skills based on task fit (not keyword match) | ✅ |
| 1.4 | Agent rejects skills with explicit reasoning | ✅ |
| 1.5 | Agent rejects `brand-guidelines` — detects Anthropic palette conflict | ✅ |
| 1.6 | Agent rejects `saas-landing` — detects SaaS template/entity product mismatch | ✅ |
| 1.7 | Agent rejects `baoyu-article-illustrator` — detects missing raster backend | ✅ |
| 1.8 | Agent adds `frontend-design` — editorial direction, not tool invocation | ✅ |

## 2. Multi-Phase Deck Switching

| # | Checkpoint | Verified |
|---|-----------|----------|
| 2.1 | Agent creates separate phase deck files (not in-place edit) | ✅ |
| 2.2 | Agent uses `deck link --deck phase<N>.toml` for atomic switching | ✅ |
| 2.3 | Agent restores original deck after completion | ✅ |
| 2.4 | Agent keeps `lythoskill-deck` as innate across all phases | ✅ |
| 2.5 | Agent limits per-phase cards to 3-4 (not bloating) | ✅ |
| 2.6 | Phase deck files are auditable post-hoc | ✅ |

## 3. Methodology Extraction (心法 > 工具链)

| # | Checkpoint | Verified |
|---|-----------|----------|
| 3.1 | Agent reads baoyu SKILL.md to extract Type×Style×Palette methodology | ✅ |
| 3.2 | Agent applies methodology without calling the skill's tool | ✅ |
| 3.3 | Agent detects brand token conflicts with skill's built-in themes | ✅ |
| 3.4 | Agent hand-crafts output using DESIGN.md tokens | ✅ |
| 3.5 | Agent reads web-prototype SKILL.md for section rhythm, not template copy | ✅ |
| 3.6 | Agent reads frontend-design SKILL.md for editorial direction | ✅ |

## 4. Brand Consistency (DESIGN.md as Constitution)

| # | Checkpoint | Verified |
|---|-----------|----------|
| 4.1 | All outputs share same DESIGN.md color tokens | ✅ |
| 4.2 | No `#ffffff` or `#000000` in any output | ✅ |
| 4.3 | No `font-style: italic` anywhere | ✅ |
| 4.4 | No serif `font-weight` > 500 | ✅ |
| 4.5 | Bamboo Green coverage ≤ 8% | ✅ |
| 4.6 | Tag backgrounds are solid hex (not rgba) | ✅ |
| 4.7 | `tabular-nums` on all data tables | ✅ |
| 4.8 | No hard drop shadows (only whisper) | ✅ |
| 4.9 | No gradients beyond sanctioned hero wash | ✅ |
| 4.10 | Dark mode support | ✅ (v2) |
| 4.11 | Print styles (`@page A4`, `print-color-adjust: exact`) | ✅ |
| 4.12 | Responsive breakpoints (768px / 980px) | ✅ |

## 5. Quality Gate (critique as Self-Audit)

| # | Checkpoint | Verified |
|---|-----------|----------|
| 5.1 | Agent mounts `critique` skill as quality gate | ✅ |
| 5.2 | Agent runs critique across all phases | ✅ |
| 5.3 | Agent self-audits against DESIGN.md constraints | ✅ |
| 5.4 | Agent reports compliance in structured format | ✅ |

## 6. JVM Ecosystem via jbang

| # | Checkpoint | Verified |
|---|-----------|----------|
| 6.1 | Agent discovers jbang as JVM dependency resolver | ✅ |
| 6.2 | Agent writes jbang script with `//DEPS` for Apache POI | ✅ |
| 6.3 | Agent writes jbang script with `//DEPS` for OpenPDF | ✅ |
| 6.4 | Agent writes jbang script with `//DEPS` for iText html2pdf | ✅ |
| 6.5 | Agent fixes POI XML element duplication (`addNewRPr` → `getRPr`) | ✅ |
| 6.6 | Agent corrects POI `setFontSize` unit assumption (half-pt → pt) | ✅ |
| 6.7 | Agent solves CJK font rendering: `.ttc` → `.ttf` extraction via fonttools | ✅ |
| 6.8 | Agent handles font fallback when primary font unavailable | ✅ |

## 7. Multi-Format Output

| # | Checkpoint | Verified |
|---|-----------|----------|
| 7.1 | HTML with brand-compliant CSS (hand-crafted) | ✅ |
| 7.2 | HTML via baoyu-markdown-to-html (brand mismatch detected) | ✅ |
| 7.3 | PDF via Chrome headless `--print-to-pdf` | ✅ |
| 7.4 | PDF via iText html2pdf (CSS compatibility gaps observed) | ✅ |
| 7.5 | PDF via OpenPDF hand-crafted layout (6-page exhibition brochure) | ✅ |
| 7.6 | docx via POI hand-crafted (22 design compliance checks) | ✅ |
| 7.7 | Social cover PNG via Python/PIL fallback | ✅ |

## 8. Parallel Experiment Comparison

| # | Checkpoint | Verified |
|---|-----------|----------|
| 8.1 | Seed bootstrap + manual rewrite yields brand-compliant output | ✅ |
| 8.2 | Candidate pool + goal+tips yields autonomous pruning + phase decks | ✅ |
| 8.3 | Both paths converge on DESIGN.md compliance | ✅ |
| 8.4 | Pool path yields richer metadata (phase deck files, exclusion reasoning) | ✅ |

## 9. NOT Covered (Gaps → Future Scenarios)

| # | Scenario | Why Important |
|---|----------|---------------|
| 9.1 | **Arena vs** — same DESIGN.md, different execution decks | Isolates deck quality from brand direction |
| 9.2a | **localhost fork** — agent forks skill, patches brand token injection point | Methodology extraction formalized as local artifact |
| 9.2b | **localhost fork + git init** — agent detects fork needs git, runs `git init && git add && git commit` | Aligns localhost with cold-pool repo management model (curator index, deck link, refresh detect) |
| 9.3 | **`/goal` quality gate** — critique as formal approval, not self-audit | Human-in-the-loop brand alignment |
| 9.4 | **Network-restricted environment** — seed bootstrap without network access | Realistic enterprise constraint |
| 9.5 | **Different task domain** — not brand/landing/article, e.g. API docs or data dashboard | Generalizes multi-phase pattern |
| 9.6 | **Cross-player compatibility** — same seed/task, different CLI agents (kimi/codex) | Skill portability across agent runtimes |
| 9.7 | **Cold pool refresh before discovery** — stale cold pool vs fresh catalog | Data freshness impact on discovery |
| 9.8 | **Deck add network probe failure** — manual toml edit fallback | Already observed in earlier seed bootstrap, not in this run |
| 9.9 | **Design system switching** — same content, different DESIGN.md (kami vs stripe vs custom) | Brand system portability |
| 9.10 | **baoyu-markdown-to-html with external DESIGN.md injection** — does the skill accept token overrides? | Gap between methodology extraction and tool reuse |

## Design Questions (ADR Candidate)

1. **Full reproduction vs step-level reproduction**: Single reproduce.sh covering all 4 phases, or per-phase reproduce scripts? Trade-off: validation cost vs setup complexity.

2. **Checkpoint granularity**: 32 verified checkpoints. Which are BDD-worthy (assertable) vs observational (interesting but not gate-worthy)?

3. **Cross-experiment checkpoint reuse**: Many checkpoints (4.x brand consistency, 5.x quality gate) are reusable across any brand workflow experiment. Extract to shared BDD spec?

4. **Agent BDD runner**: Current `bdd-runner.ts` handles unit + CLI integration. Agent BDD (LLM-required) documented in `*.agent.md` convention. Does this inventory warrant extending the runner?

## Related

- `showcase/2026-05-15-arena-vs-seed-bootstrap-free-form-vs-baoyu-standardized/`
- `cortex/wiki/03-lessons/2026-05-15-baoyu-skills-dependency-audit-for-lythoskill-content-creation.md`
- `cortex/wiki/01-patterns/2026-05-15-seed-bootstrap-pattern-minimal-governance-skill-enables-agent-self-expansion.md`
- `memory/project_test_utils_bdd_control_loop.md`
- `memory/feedback_read_test_conventions_before_designing.md`
