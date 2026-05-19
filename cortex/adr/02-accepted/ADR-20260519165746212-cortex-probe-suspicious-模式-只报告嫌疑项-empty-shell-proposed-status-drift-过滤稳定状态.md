# ADR-20260519165746212: cortex probe --suspicious 模式

## Status History

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-05-19 | Created |
| accepted | 2026-05-19 | Implemented — --suspicious flag filters to actionable patterns only |
| accepted | 2026-05-19 | Accepted |

## 背景

`cortex probe` 输出全套 status consistency check（162+ items），其中大部分是稳定状态（accepted ADR、completed task = 正常）。pre-push gate 和 entropy-check 场景只需要"嫌疑模式"：只报告可能有问题的部分（empty shell、proposed 未处理、backlog 过老、lane violation、coverage drift）。

## 决策驱动

entropy-check 原在 checks.ts 里做启发式字符串过滤（`01-proposed`、`📭`），这是 probe 该提供的功能，不应由消费者自己实现。

## 选项

### 方案A: probe 加 `--summary` flag
输出紧凑计数（类似 stats），不逐项列出。
**优点**: 最简洁
**缺点**: 丢掉导航信息（agent 看不到具体是哪个文件有问题）

### 方案B: probe 加 `--suspicious` flag（已采用）
跳过全量 status check（✅ 项），只输出嫌疑 section：empty shells（仅 backlog/in-progress/proposed）、stale backlog、drifted epics、lane violations、coupling warnings、coverage drift。
**优点**: 保持导航信息，过滤稳定状态
**缺点**: 需要维护"什么是 suspicious"的判断

## 决策

**选择**: 方案 B — `probe --suspicious`

**原因**: 导航信息对 agent 有价值（"哪个文件有问题"），只输出计数不够。stable（02-accepted、04-completed）的 status check 结果在 gate 场景中无 actionable 价值。

## 影响

- 正面: entropy-check 可直接用 `probe --suspicious`，删除自己的启发式过滤
- 正面: pre-push hook 可用 `probe --suspicious` 做快速 gate
- 负面: `--suspicious` 的判断逻辑需要随着项目演变维护
- 后续: 可扩展 `--suspicious` 的判断规则（如 API deprecation 检测、config drift）

## 相关

- 关联 Epic: EPIC-20260519164518898
