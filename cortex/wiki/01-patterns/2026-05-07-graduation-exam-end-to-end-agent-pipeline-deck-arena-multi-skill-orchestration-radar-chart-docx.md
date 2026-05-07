---
created: 2026-05-07
updated: 2026-05-07
category: pattern
---

# Graduation exam — end-to-end agent pipeline

## Context

验证 lythoskill 全链路：empty deck → multi-skill orchestration → structured output with embedded visualization。这是体系的"毕业考题"——agent 自主完成发现、筛选、编排、产出的完整决策链。

## Pipeline

```
deck.toml (docx + mermaid + research, 6 skills)
  → arena agent-run link deck (symlink skills to .claude/skills/)
  → kimi spawn (fresh context, reads skills)
  → agent orchestration (multi-skill: docx write + research + charting)
  → output: .docx with embedded radar chart
  → judge verdict + self-check
```

## Key orchestration pattern

arena `agent-run` 自动处理"重新开"问题——`deck link` 创建 symlink 后 spawn 新 agent 进程，skills 自然可见。不需要手动切换上下文或重启 session。

## Results (2026-05-07, first run — passed)

| Metric | Value |
|--------|-------|
| Agent runtime | 120s |
| Judge verdict | PASS |
| Self-check | 6/6 skills identified as symlinks |
| Output size | 162KB .docx (with embedded 150KB radar PNG) |

Agent autonomously used `matplotlib` (Python) for radar chart — not declared in deck, demonstrating independent tool selection.

Radar dimensions scored: Taste 9.2, Nutrition 5.5, Difficulty 3.0, Time 4.5, Cost 6.0.

## Artifacts

- `examples/decks/recipe-report.toml` — deck definition
- `examples/graduation-exam.md` — self-contained instructions (sendable to any agent)
- `playground/2026-05-07-graduation-exam/` — full output

## Related

- wiki: `cold-pool-cli-boundary.md` — deck vs cold-pool separation
- wiki: `expected-coverage-gaps-*.md` — coverage strategy
- TASK-20260507224228837 — graduation exam task definition
