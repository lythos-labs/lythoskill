# Graduation Exam — End-to-End Agent Pipeline

> First successful full-chain lythoskill run: empty deck → multi-skill orchestration → .docx with embedded radar chart.

## What this proves

| Dimension | What the exam demonstrates |
|-----------|---------------------------|
| Autonomous skill discovery | Agent selects its own skills (docx, charting, research) without being told |
| Multi-skill orchestration | docx write + research + charting + self-check — 6 skills composing |
| Side-effect observability | Arena judge evaluates the **artifact** (.docx + radar chart), not the agent's text output |
| Agent tool independence | Agent used `matplotlib` (Python) for radar chart — not declared in deck |

## Result (2026-05-07, first run)

| Metric | Value |
|--------|-------|
| Verdict | **PASS** |
| Agent runtime | 120s |
| Output | `cookie_recipe_report.docx` (162KB) with embedded radar chart (150KB PNG) |
| Self-check | 6/6 skills identified as symlinks |

## Reproduce

```bash
./reproduce.sh
```

Or manually:

```bash
curl -fsSL https://raw.githubusercontent.com/lythos-labs/lythoskill/refs/heads/main/examples/decks/recipe-report.toml > skill-deck.toml
bunx @lythos/skill-deck@latest link
LYTHOS_PLAYER=kimi bunx @lythos/skill-arena@latest single \
  --brief "$(cat examples/graduation-exam.md)" \
  --deck ./skill-deck.toml \
  --timeout 180000
```

## Related

- Deck: `examples/decks/recipe-report.toml`
- Instructions: `examples/graduation-exam.md`
- Wiki: `cortex/wiki/01-patterns/2026-05-07-graduation-exam-end-to-end-agent-pipeline-deck-arena-multi-skill-orchestration-radar-chart-docx.md`
