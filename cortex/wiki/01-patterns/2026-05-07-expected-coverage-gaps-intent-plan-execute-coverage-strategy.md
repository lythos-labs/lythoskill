---
created: 2026-05-07
updated: 2026-05-07
category: pattern
---

# Expected coverage gaps — intent/plan/execute coverage strategy

## Context

Intent/plan/execute pattern 将函数拆为三层后，覆盖率自然形成"plan 高、execute 低"的分布。不了解此模式的 agent 会试图为 execute 层写单测（mock spawn/fs），反而引入脆弱测试。

此 pattern 明确：哪些覆盖率缺口是**故意的**（execute 层由 CLI BDD 覆盖），哪些是需要修复的（plan 层未提取或未测试）。

## Details

### 三层覆盖策略

| 层 | 覆盖率 | 测试方式 | 为什么 |
|----|--------|----------|--------|
| **Intent** | 100% | Schema validation | 纯数据结构，无逻辑 |
| **Plan** | 80-100% | 单元测试（mock 入参） | 纯函数，无副作用。所有分支应覆盖 |
| **Execute** | 15-50% | CLI BDD（真实 spawn/fs） | IO 编排，CI 环境无依赖（agent CLI、网络）。不追求单测覆盖率 |

### 典型覆盖剖面

```
Cold-pool:    92%  plan 提取彻底，execute 薄
Cortex:       88%  大部分纯函数
test-utils:   83%
Deck:         57%  plan 已拆到 *-plan.ts，execute wrapper 留白（预期）
Arena:        47%  runner.ts spawn 编排（预期）
Agent-adapter: 46%  spawn wrapper + SDK 调用（预期）
Curator:      31%  cli.ts 850 行 IO 编排，curator-core 100%（预期）
```

### Execute 层低覆盖的判断标准

以下情况**不应**为 execute 层补单测：

1. 函数体主要是 `spawn` / `execSync` / `readFileSync` / `writeFileSync` 等 IO 调用
2. Plan 层已提取到独立文件，覆盖 ≥80%
3. 已有 CLI BDD 测试覆盖此路径

以下情况**应该**提取并测试：

1. 文件内存在分支逻辑（if/switch）和 IO 混合 → 提取纯函数
2. 数据解析/转换逻辑直接写在 spawn 回调里 → 提取 parse 函数
3. 命令行参数解析 → 纯函数，可单测

### 已提取的 plan 文件

| Plan 文件 | 覆盖 | 对应 execute |
|-----------|------|-------------|
| `curator-core.ts` | 100%/98% | `cli.ts` 25%/15% |
| `cold-pool.ts` (buildListPlan) | 100% | `list()` (thin wrapper) |
| `arena-toml.ts` | plan | `runner.ts` 22%/8% |
| `prune-plan.ts` | 75%/97% | `prune.ts` 50%/39% |
| `refresh-plan.ts` | 75%/98% | `refresh.ts` 50%/15% |
| `comparative-judge.ts` | 94%/55% | `runner.ts` (caller) |

## When to Apply / When Not to Apply

**Apply**: 当看到 execute 层覆盖率低且已有 plan 文件时，不补单测。确认 CLI BDD 覆盖即可。

**Not apply**: 当文件同时包含分支逻辑和 IO 且无对应 plan 文件时，先提取 plan 再测试——不要直接为 IO 函数写 mock 测试。

## Related

- wiki: `2026-05-04-intent-plan-execute-fractal-architecture-pattern.md`
- ADR-20260507021957847: ColdPool as dedicated resource holder
- AGENTS.md: Testing section, IO injection table
