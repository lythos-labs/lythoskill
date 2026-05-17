# TASK-20260517121825279: BDD: arena single + cross-deck vs 三连触发稳定

## Status History

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-17 | Created |
| completed | 2026-05-17 | 3/3 triggers PASS |

## 做了什么

优化 arena SKILL.md (427→212行, pushy desc, agent-orchestrated default) 后，验证 3 个 e2e subagent 能否正确选择执行路径。

## 怎么做

三个 trigger 并行派发，每个 subagent 读 arena SKILL.md 后自主判断执行模式：

### Trigger 1 — single
- Deck: `examples/decks/scout.toml`
- Brief: "写 hello.ts + hello.test.ts，跑 bun test 确认"
- Subagent 用 CLI `bunx @lythos/skill-arena single` 模式
- 产出: hello.ts + hello.test.ts → bun test PASS

### Trigger 2 — cross-deck vs (recipe-report vs design-studio)
- Side A: recipe-report deck → 科学深度报告 (197行, 14营养素)
- Side B: design-studio deck → Golden Hour theme HTML
- Subagent 按 agent-orchestrated 路径: 隔离 workdir → deck link → 顺序执行 → judge
- Pareto: A 赢 completeness/nutrition (9+9), B 赢 readability/formatting (9+9)
- 78,684 tokens, 41 tool calls

### Trigger 3 — cross-deck vs (qa-sweep vs scout)
- Side A: qa-sweep deck → 5 security findings + CWE IDs
- Side B: scout deck → architecture/code-quality analysis
- Pareto: A dominates security_depth (9 vs 4), B wins code_quality/completeness
- 72,273 tokens, 28 tool calls

## 得到什么结果

| # | 类型 | 路径 | Tokens | 耗时 | 结果 |
|---|------|------|--------|------|------|
| 1 | single | CLI single | 27,689 | 243s | hello.ts + test PASS |
| 2 | cross-deck vs | agent-orchestrated | 78,684 | 1055s | Pareto A41 B40 |
| 3 | cross-deck vs | agent-orchestrated | 72,273 | 529s | Pareto A38 B35 |

## 核心发现

优化后 SKILL.md 触发稳定。Agent-orchestrated 路径被正确选择（Trigger 2、3），cross-player 路径在 Trigger 1 被正确避开（single 是单 deck 测试，不需要 cross-player）。Decision Tree 前置有效。

## 验收标准
- [x] 3 次触发全部成功完成 e2e
- [x] Agent-orchestrated 路径被正确选择（cross-deck vs）
- [x] Cross-player 路径被正确避开（单 deck 测试）
- [x] Judge 产出了 Pareto frontier 分析
- [x] SKILL.md 212 行 (原 427，-50%)

## 关联
- Epic: EPIC-20260517121757041
- 源: `packages/lythoskill-arena/skill/SKILL.md` (optimized)
- REF: `packages/lythoskill-arena/skill/references/player-setup.md` (new)
