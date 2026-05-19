# TASK-20260519164702541: C: cortex-probe 改用 stats + 启发式过滤，只报告 actionable 项

## Status History

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-19 | Created |
| completed | 2026-05-19 | Implemented — stats summary + probe filtered to 01-proposed/empty shells |
| completed | 2026-05-19 | Closed via trailer |

## 背景与目标

probe 原输出 162/166 items（含大量 accepted ADR = 正常状态），agent 无法快速判断。

## 需求详情
- [x] checkCortexProbe 先调用 cortex stats 获取全景计数
- [x] probe 输出只保留 actionable 项（📭 + 含 01-proposed/01-backlog 的 ⚠️）
- [x] 输出从 166 → 6 actionable items
- [x] 后续可在 probe 自身加 `--suspicious` 模式（ADR-20260519165746212）

## 技术方案
字符串匹配过滤：`📭` 或 `⚠️` + `01-proposed` 或 `01-backlog`。

## 验收标准
- [x] `--force` 输出中无 02-accepted ADR
- [x] 37 tests pass
- [x] stats summary 清晰可见
