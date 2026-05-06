# ADR-20260506103209293: Supersede combo-skill-as-orchestration-layer — combo is now a deck-level prompt, not a separate skill

## Status History

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-05-06 | Created |
| accepted | 2026-05-06 | Accepted |

## 背景

ADR-20260424114401090 设计了 `combo-` 前缀命名的专用编排 skill — 作为 orchestrator layer，类似后端的 Manager/BPMN 引擎。该设计假设 combo 需要独立的 SKILL.md + 触发条件 + 路由表 + TypeScript 代码。

2026-05-06 的 deck 重构和 fork 机制验证后，三个新事实推翻了这个假设：

1. **Fork 压缩了 combo 的存在空间**。Fork 提供真正的 remix 能力（"借用心智，改成我的场景"）。如果 combo 只是"几个 skill 一起用"，fork 可以做到更多。

2. **Agent 本身就是自然语言驱动的**。combo 的"编排逻辑"不需要 TypeScript — agent 读到 "Search the web, then generate DOCX with diagrams" 就知道怎么做。这和 agent 读取 SKILL.md description 的机制完全一样。

3. **`max_cards` 预算模型不支持 combo 占位**。如果每个 combo 都创建一个独立 skill，它会和工具 skill 竞争卡位。Combo 是元数据（"这些 skill 怎么配合"），不是能力。

**同一模式出现过**：lythoskill BDD 从 Gherkin/Cucumber 退化到 Given/When/Then 在 markdown 里。Agent 不需要框架，只需要自然语言。Combo 遵循同样的退化路径。

## 决策驱动

- Combo 的编排能力已被 fork + agent 自然语言理解覆盖
- `max_cards` 约束下，combo 不应该和 tool skill 争份额
- Deck prompt 就是外挂的 description — agent 扫描 → 匹配 → activate

## 选项

### 方案A：保持 combo- 前缀 skill（ADR-20260424114401090 原方案）

**缺点**: 每个 combo 占一个 max_cards 位；需要独立 SKILL.md + 维护；功能与 fork 重叠。

### 方案B：combo = deck 声明 + prompt（新方案）

```toml
[combo.report-generation]
skills = ["web-search", "docx", "mermaid"]
prompt = "Search for latest info, then generate professional document with diagrams"
```

**优点**:
- 零 runtime 代码，零 SKILL.md
- 不占 max_cards（元数据，不在 working set 计数）
- Agent 读取方式和读 SKILL.md description 一致
- Arena 可以 A/B test 同一个 skill 组 + 不同 prompt

## 决策

**选择**: 方案B。**Supersede ADR-20260424114401090。**

**combo 不是 skill，是 deck 的 prompt** — 和 SKILL.md description 一样的外挂元数据。Agent 扫描 → 匹配 → 按 prompt 描述的方式协调 skills。不需要代码层、不需要命名约定、不需要 package。

## 影响

- **正面**: `max_cards` 只计 tool skill，combo 是免费元数据
- **负面**: 无
- **后续**: `combo-` 前缀 skill 废弃。已有 combo skill（如 `report-generation-combo`）可转为 deck 声明

## 相关

- **Supersedes**: ADR-20260424114401090 (combo skill as orchestration layer)
- ADR-20260423101938000 (thin skill pattern)
- BDD 退化模式：Gherkin → markdown Given/When/Then（同一次简化）
