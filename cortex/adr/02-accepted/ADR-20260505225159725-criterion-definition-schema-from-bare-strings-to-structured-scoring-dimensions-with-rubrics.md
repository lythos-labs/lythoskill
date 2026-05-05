# ADR-20260505225159725: Criterion definition schema — from bare strings to structured scoring dimensions with rubrics

## Status History

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-05-05 | Created |
| accepted | 2026-05-05 | Accepted |

## 背景

### 为什么 arena 要 judge

Arena 是 lythoskill 三层信任模型的 L3 — **最终激活权威**。

```
L1 卖家秀 (SKILL.md desc)     → 作者自己说的，不可靠
L2 Big V (feed 排名)          → 第三方信号，可操纵
L3 买家秀 (arena 实测)        → 同任务同条件跑出来的对比数据，不可伪造
```

Desc 是 agent SEO 战场。Arena 提供**可验证的反作弊**：不是"这个 skill 声称多好"，而是"这个 skill 在相同条件下、跑相同任务、由相同 judge 评分，分数比另一个高"。L3 的可信度取决于评分的**可复现性**和**可比较性**。

### Python 科研视角

Arena 的评分数据本质上是一个**多维观测矩阵**：`participants × criteria → scores`。这和 Python 科学计算生态（pandas DataFrame、scikit-learn metrics、seaborn heatmap）的数据模型一致：

```python
# 目标数据结构 — chart-ready
df = pd.DataFrame(score_matrix)
df.pivot(index="participant_id", columns="criterion", values="score")
# → 一行 radar chart，一列 bar chart
sns.heatmap(pivot)          # 热力图
df.groupby("criterion").plot(kind="bar")  # 分维度柱状图
pareto_frontier.plot()      # Pareto 前沿
```

当前 schema 的缺口阻碍了这种直接可用性。

### 当前缺口

`ArenaManifest.criteria` 是 `z.array(z.string())` — 裸字符串。三个问题：

| 问题 | 表现 | 后果 |
|------|------|------|
| Judge 无评分量规 | "correctness" 这个名字，LLM 自己编 3 分 vs 5 分的含义 | 跨 run 不可比较 |
| Rationale 不可聚合 | 自由文本 "代码不错但缺错误处理" | 只能读 prose，无法程序化分析 |
| 不可直接图表化 | 没有 `weight`、`persona`、rubric anchor | 每个 visualization 消费者都要重新映射 |

## 决策驱动

- Arena L3 权威依赖可复现评分。LLM 每次即兴编量规 → 分数不可比
- 评分数据应该**生成即图表就绪**（chart-ready）。Python 科研范式的 DataFrame 思维
- 评分维度需要**定义 + 量规 + 归属**，不是字符串名字
- 向后兼容：bare string 仍然合法（快速原型），结构化可覆盖

## 选项

### 方案A：保持 `z.string()`，文档写量规

**缺点**: 文档和代码分离。LLM judge 不会读文档。跨 run 不可比。

### 方案B：Criterion 结构化 + 量规嵌入（推荐）

```typescript
// 结构化 criterion — 替代 bare string
const CriterionDef = z.object({
  id: z.string(),                          // "correctness"
  label: z.string(),                       // "功能正确性" (display name)
  description: z.string().default(''),     // 这个维度测什么
  persona: z.string().optional(),          // "INTJ架构师" (来自 swarm ADR)
  weight: z.number().min(0).max(1).default(0.25),
  rubric: z.array(z.object({
    score: z.number().int().min(1).max(5),
    label: z.string(),                     // "优秀 — 全部通过"
    description: z.string(),               // "所有测试用例通过，边界条件正确处理"
  })).optional(),
})

// 向后兼容：string 自动升级为默认 CriterionDef
const CriteriaField = z.union([z.string(), CriterionDef])
  .transform(c => typeof c === 'string'
    ? { id: c, label: c, description: '', weight: 0.25 }
    : c
  )
```

**Judge prompt 变化**（量规直接嵌入）：

```
## Criterion: 功能正确性 (correctness)
Evaluator: INTJ架构师
Weight: 0.33
Rubric:
  5 — 所有测试用例通过，边界条件和异常路径正确处理
  3 — 主要功能正常，但部分边界条件未处理
  1 — 核心功能有逻辑错误或不完整
```

**图表就绪性**：`ScoreCell` 已有 `{ participant_id, criterion, weight, score, rationale }`，配合 `CriterionDef.persona` 和 `CriterionDef.label`，一行 pivot 即可生成：
- **雷达图**: `participant × criterion` 矩阵
- **分组柱状图**: `participant × criterion` 按 persona 着色
- **热力图**: participants vs criteria，颜色 = score
- **Pareto 散点**: 2D/3D，非支配点高亮

### 方案C：完整 MBTI 人格系统

为每个 MBTI 人格定义独立 prompt 模板和评分偏好。

**被拒绝**: 当前阶段不需要。`persona` 字段已经承载了人格归属。完整 prompt 模板属于 judge prompt layer（`buildComparativePrompt`），不属于 schema。

## 决策

**选择**: 方案B

**原因**:
1. 最小侵入：bare string 继续合法，只是多了结构化选项
2. Judge 可复现：量规嵌入 prompt → LLM 有明确的 1-5 对应关系
3. 图表就绪：`ScoreCell + CriterionDef` 生成即 pivot-ready，匹配 Python 科研范式的 DataFrame 思维
4. 人格可追溯：`persona` 字段记录"谁在评什么"
5. 不破坏已有 arena.toml

## 影响

- **正面**:
  - Judge prompt 质量：LLM 有量规 vs 自己编
  - 图表生成：一个 API 调用拿到 score_matrix → 前端直接渲染雷达图/热力图
  - 反作弊增强：量规固定后，skill 作者无法通过优化 desc 影响分数
- **负面**:
  - Schema 变复杂（union type）
  - Judge prompt 变长（量规文本嵌入）
- **后续**:
  - `buildComparativePrompt` 需处理结构化 criterion → 量规注入
  - 提供默认量规模板（常见维度的预定义 rubric）
  - `ScoreCell.rationale` 可进一步结构化 — 留待后续

## 相关

- ADR-20260424013849984 (anti-corruption layer → L3 审查权威)
- ADR-20260424115621494 (virtual evaluator swarm → MBTI 人格)
- ADR-20260504200632939 (structured judge schema → Zod-first)
- ADR-20260424120936541 (player-deck separation)
