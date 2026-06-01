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
  → arena single (spawn agent with deck-linked skills)
  → kimi spawn (fresh context, reads skills)
  → agent orchestration (multi-skill: docx write + research + charting)
  → output: .docx with embedded radar chart
  → judge verdict + self-check
```

## Key orchestration pattern

`arena single` 自动处理上下文隔离——每次运行 spawn 新 agent 进程，通过 deck link 的 symlink 让 skills 自然可见。不需要手动切换上下文或重启 session。这是 agent-orchestrated 模式的核心机制（区别于 runner 层的跨 player CLI spawn）。

> **Historical note**: 本文撰写时（2026-05-07），Arena CLI 子命令为 `agent-run`，v0.10.0 重命名为 `single`（ADR-20260509104832428）。管线逻辑未变，仅命令名更新。

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
