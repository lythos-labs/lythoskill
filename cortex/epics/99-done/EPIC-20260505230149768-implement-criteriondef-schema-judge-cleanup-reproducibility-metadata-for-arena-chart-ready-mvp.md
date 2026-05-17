---
lane: main
checklist_completed: false
checklist_skipped_reason: alignment confirmed, vision documented in ADR-20260505225159725 and ADR-20260424115621494
---
# EPIC-20260505230149768: Implement CriterionDef schema + judge cleanup + reproducibility metadata for arena chart-ready MVP

> **Epic 是什么**:1-3 周可结案的 outcome,有依赖、有顺序、要规划。
> **Epic 不是什么**:配置漂移类小事(那是 task)、决策选型(那是 ADR)。
> **Workflowy zoom-in 心智**:屏蔽其他 epic 的诱惑,聚焦本卡。
> **双轨**:`lane: main`(当前迭代,最多 1)、`lane: emergency`(不可避免紧急,最多 1)。

> Implement CriterionDef schema + judge cleanup + reproducibility metadata for arena chart-ready MVP

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| active | 2026-05-05 | Created |
| done | 2026-05-05 | Done |

## 背景故事

### 以终为始：arena 的愿景

**Deck** = Hermes 的自我治理层。Agent 自己治理自己的 skill 冷池。
**Arena** = 社交验证卡片引擎。不是 benchmark 截图，是**可复现实验**。

```
arena.toml           ← 实验方案（假设 + 方法 + 条件）
  ↓ arena run
score_matrix + raw   ← 原始观测数据
  ↓ comparative judge
Pareto chart + card  ← 分析图表
  ↓ commit to git
GitHub 执行记录      ← 任何人可拉下来复现
```

和 X/Twitter 上 benchmark 截图的本质区别：方法论 + 数据 + 复现路径，不是一篇 headline。

### 核心洞察

- **LLM 作为测量仪器本身有方差**：被测 agent 和 judge agent 都是 LLM。输出不是 ground truth，是 estimate with confidence interval。
- **量规 = 测量仪器的标定**：没有标定的仪器，测得再多也没用。CriterionDef 的 rubric 就是标定。
- **Player 封装外生变量**：agent 版本、model、配置 — 这些是应控制的环境因素。
- **ScoreCell = DataFrame row**：一行 `{ participant_id, criterion, weight, score }` → pivot → 雷达图/热力图。Python 科研范式的 mentality。

### 当前 schema 缺口

| 问题 | 现状 | 影响 |
|------|------|------|
| Criteria 是裸 string | `z.array(z.string())` | Judge 无评分量规，跨 run 不可比 |
| JudgeVerdict 冗余 | `criteria[]` (二元) + `scores{}` (数值) 两个字段并存 | 同一个概念两种表示 |
| 统计聚合缺失 | `weighted_totals` 有 mean 无 variance | 无法评估估计的可靠性 |
| 复现元数据缺失 | 无 git commit / arena.toml ref | 无法追溯到实验协议 |

### 相关 ADR

- ADR-20260505225159725 (CriterionDef schema — 量规嵌入)
- ADR-20260424115621494 (virtual evaluator swarm — MBTI 人格)
- ADR-20260504200632939 (structured judge schema — Zod-first)
- ADR-20260424120936541 (player-deck separation)
- ADR-20260424013849984 (anti-corruption layer — arena = L3 审查权威)

## 需求树

### 主题A: CriterionDef schema 实现
- **触发**: ADR-20260505225159725 accepted
- **需求**: `ArenaManifest.criteria` 从 `z.array(z.string())` 升级为 `z.array(CriteriaField)`，向后兼容
- **产出**: `CriterionDef` Zod schema + `CriteriaField` union type + transform
- **验证**: bare string 仍然解析通过；结构化 CriterionDef 的 rubric 字段正确注入 `buildComparativePrompt`

### 主题B: JudgeVerdict 去重
- **触发**: `criteria: [{ name, passed }]` 和 `scores: { name: 1-5 }` 功能重叠
- **需求**: 统一为单一数据结构。Per-cell judge 产出 task 级 PASS/FAIL。Numeric scores 属于 comparative judge。
- **产出**: `JudgeVerdict` 去 `scores` 字段。`ScoreCell` 承载所有数值评分。
- **验证**: 已有测试中的 judge verdict 格式兼容或更新

### 主题C: Reproducibility metadata
- **触发**: 卡片分享需要可复现链路
- **需求**: `ComparativeReport` 增加 `run_context: { git_ref, arena_toml_path, judge_model, runs_per_side, started_at, completed_at }`
- **产出**: `ArenaRunContext` Zod schema + `ComparativeReport.run_context` 字段
- **验证**: 报告输出包含 git commit hash + arena.toml 路径

## 技术决策

| ADR | 标题 | 状态 |
|-----|------|------|
| ADR-20260505225159725 | CriterionDef schema | accepted |
| ADR-20260424115621494 | Virtual evaluator swarm | accepted |
| ADR-20260504200632939 | Structured judge schema | accepted |
| ADR-20260424120936541 | Player-deck separation | accepted |

## 关联任务

| 任务 | 状态 | 描述 |
|------|------|------|
| TASK-20260505230249874 | backlog | T1: CriterionDef + CriteriaField schema |
| TASK-20260505230249921 | backlog | T2: Rubric injection in buildComparativePrompt |
| TASK-20260505230249954 | backlog | T3: ArenaManifest.criteria union type |
| TASK-20260505230249992 | backlog | T4: JudgeVerdict cleanup (remove scores) |
| TASK-20260505230250040 | backlog | T5: Update per-cell judge + runner |
| TASK-20260505230250079 | backlog | T6: ArenaRunContext metadata |

## 经验沉淀

## 归档条件
- [ ] CriterionDef schema 实现
- [ ] JudgeVerdict 去重
- [ ] Reproducibility metadata
- [ ] buildComparativePrompt rubric 注入
- [ ] 测试覆盖
- [ ] 向后兼容验证
