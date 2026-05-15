# Graduation Exam v5 — Prompt Template + White-Box Observability

> Second successful full-chain run with major architectural improvements:
> tmpdir isolation, prompt-template IoC, robustness instructions, and white-box JSONL replay.

## What this proves

| Dimension | What the exam demonstrates |
|-----------|---------------------------|
| **Sandbox discipline** | `agentWorkdir` in `/tmp` — npm install succeeds, no workspace pollution |
| **Prompt-template IoC** | Fixed part (ROBUSTNESS + TOOLS + decision-log contract) + brief as variable |
| **Skill-first execution** | Agent reads linked `docx` skill (590 lines) and uses `docx-js` per skill guidelines |
| **White-box observability** | Full `agent-stdout-raw.jsonl` captures every tool_call / tool_result for post-hoc replay |
| **Self-validation** | Agent runs skill-provided `validate.py` — OOXML compliance verified |

## Result (2026-05-15, v5)

| Metric | Value |
|--------|-------|
| Verdict | **PASS** |
| Agent runtime | ~7 min (10 min timeout) |
| Output | `Cookie_Recipe_Report.docx` (125KB) with embedded radar chart (111KB PNG) |
| Decision log | 9 entries covering setup → design → content → output |
| Validation | `All validations PASSED!` |

## Reproduce

```bash
./reproduce.sh
```

Or manually:

```bash
bunx @lythos/skill-arena@latest single \
  --brief "Produce a professional .docx cookie recipe report with an embedded 5-dimension radar chart (Taste, Nutrition, Difficulty, Time, Cost). Include ingredient ratios with Baker's Percentages and scientific explanations." \
  --deck examples/decks/recipe-report.toml \
  --player kimi \
  --timeout 600000 \
  --out ./output
```

## Key differences from v1 (2026-05-07)

| v1 (2026-05-07) | v5 (2026-05-15) |
|-------------------|-----------------|
| Workdir in `process.cwd()` | Workdir in `/tmp` — no workspace contamination |
| Raw brief injection | Template IoC: fixed contract + `{brief}` variable |
| Agent handwritten Python (matplotlib) | Agent reads docx skill, uses `docx-js` per skill spec |
| No decision-log | Mandatory `decision-log.jsonl` with 9 entries |
| Black-box stdout only | White-box `agent-stdout-raw.jsonl` (full tool-call chain) |
| No self-validation | Agent runs `validate.py` — OOXML compliance check |

## Related

- Deck: `examples/decks/recipe-report.toml`
- Instructions: `examples/graduation-exam.md`
- Wiki: `cortex/wiki/01-patterns/2026-05-15-graduation-exam-spec.md`
- Previous run: `showcase/2026-05-07-graduation-exam/`
