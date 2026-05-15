---
created: 2026-05-15
updated: 2026-05-15
category: pattern
---

# Graduation Exam Specification

## What

The graduation exam is lythoskill's end-to-end integration test. It validates the entire toolchain — deck → arena → agent orchestration → structured output — in a single autonomous run.

## Task

Produce a professional `.docx` cookie recipe report with an embedded 5-dimension radar chart (Taste, Nutrition, Difficulty, Time, Cost). Include ingredient ratios with Baker's Percentages and scientific explanations.

## Success Criteria

| # | Criterion | Threshold |
|---|-----------|-----------|
| 1 | Skills autonomously discovered & selected | Not pre-chosen |
| 2 | All `deck add` / `deck link` commands succeed | Exit code 0 |
| 3 | `.claude/skills/` contains symlinks for each skill | Self-check pass |
| 4 | Output `.docx` exists and is 100KB+ | File size ≥ 100KB |
| 5 | Embedded radar chart present | Visual verification |
| 6 | Judge verdict | PASS |

## Deck

```toml
# examples/decks/recipe-report.toml
[deck]
max_cards = 8
cold_pool = "~/.agents/skill-repos"
working_set = ".claude/skills"

[innate.skills.lythoskill-deck]
path = "github.com/lythos-labs/lythoskill/skills/lythoskill-deck"

[tool.skills.docx]
path = "github.com/anthropics/skills/skills/docx"

[tool.skills.research]
path = "github.com/Weizhena/Deep-Research-skills/skills/research-en/research"

[tool.skills.research-report]
path = "github.com/Weizhena/Deep-Research-skills/skills/research-en/research-report"
```

## Run Command

```bash
bun packages/lythoskill-arena/src/cli.ts single \
  --deck examples/decks/recipe-report.toml \
  --brief "Produce a professional .docx cookie recipe report with an embedded 5-dimension radar chart (Taste, Nutrition, Difficulty, Time, Cost). Include ingredient ratios with Baker's Percentages and scientific explanations." \
  --player kimi \
  --timeout 300000 \
  --out playground/graduation-exam-$(date +%Y-%m-%d)
```

## Expected Artifacts

```
playground/graduation-exam-YYYY-MM-DD/
├── agent-stdout.txt
├── agent-stderr.txt
├── cookie_recipe_report.docx      # 100KB+, embedded radar chart
├── radar_chart.png                # 150KB+ (matplotlib 200dpi)
├── generate_radar_chart.py        # 1-2KB
├── create_report.js               # optional, if agent uses JS
└── decision-log.jsonl             # agent decision trail
```

## Historical Runs

| Date | Player | Verdict | Notes |
|------|--------|---------|-------|
| 2026-05-07 | kimi | PASS | First run. Agent autonomously used matplotlib (not in deck). 162KB .docx. [[2026-05-07-graduation-exam-end-to-end-agent-pipeline-deck-arena-multi-skill-orchestration-radar-chart-docx]] |
| 2026-05-15 | kimi | PARTIAL | Prompt template aligned. Agent wrote generate_report.py (14KB) but did not execute it. IndentationError in generated script. No .docx produced. |

## Related

- `examples/graduation-exam.md` — Self-contained instructions (sendable to any agent)
- `examples/decks/recipe-report.toml` — Deck definition
- TASK-20260507224228837 — Original graduation exam task
