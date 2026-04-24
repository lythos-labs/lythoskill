# ADR-20260424114401090: combo skill as orchestration layer naming and emergence strategy

## Status History

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-04-24 | Created |
| accepted | 2026-04-24 | Approved by user |

## 背景

lythoskill 生态中有多个独立 skill（cortex, scribe, onboarding, deck, arena, curator...）。当多个 skill 同时存在于一个 deck 中时，agent 需要知道如何组合使用它们。

核心问题：combo 应该通过什么机制实现？是各自 skill 提一下 combo 关系就够了，还是需要一个单独的编排 skill？

## 决策驱动

- **松耦合**：每个 skill 可独立安装使用，不强制绑定
- **可发现性**：combo 关系应该一眼可见，而不是藏在某个 skill 的角落
- **分层**：简单 combo 用声明式（Mermaid 流程图），复杂 combo 用代码（TypeScript 编排）
- **后端编排层类比**：combo skill = manager / orchestrator，不实现业务逻辑，只做路由和调度

## 选项

### 方案A：Emergent Combo（纯涌现式）

没有 combo skill。各自 skill 的 SKILL.md 中描述"相关 Skill"，agent 自己发现组合关系。

**优点**:
- 最松耦合，零额外 skill
- 组合关系自然涌现

**缺点**:
- agent 可能发现不了 combo
- 组合逻辑散落在各处，难以维护一致性
- 没有统一的 combo 入口，agent 不知道"什么时候该触发 combo"

### 方案B：Dedicated Combo Skill（专用组合 skill）

创建 `lythoskill-combo-xxx` 命名的 skill。combo skill 只做编排，不实现业务逻辑。

**优点**:
- combo 逻辑集中，易于维护
- 命名一眼可见（`combo-` 前缀）
- 有明确的 combo 触发条件

**缺点**:
- 增加 skill 数量
- 如果 combo skill 过重，会变成"上帝 skill"

### 方案C：Hybrid（混合模式）

**三层 combo 体系**：

1. **松耦合基础**：各自 skill 独立存在，SKILL.md 中描述"相关 Skill"关系
2. **声明式编排**：简单 combo 在 SKILL.md 中用 Mermaid 流程图描述（Kimi CLI 的 `type: flow`）
3. **代码编排**：复杂 combo 在 `src/` 中写 TypeScript，调用其他 skill 的 CLI

combo skill 命名强制用 `combo-` 前缀，一眼可见。

**优点**:
- 兼顾松耦合和可发现性
- 简单 combo 轻量（Mermaid 图），复杂 combo 强大（代码）
- combo skill 不实现业务逻辑，只负责"在正确的时机调用正确的组件"

**缺点**:
- 需要维护 combo skill 的触发条件
- 需要约定 combo skill 的命名规范

## 决策

**选择**: 方案C（混合模式）

**原因**:

1. **后端编排层类比**：

   | 后端架构 | Skill 生态 | 职责 |
   |---------|-----------|------|
   | Service | Standard skill | 实现具体业务逻辑 |
   | Manager / Orchestrator | Combo skill | 路由、调度、条件判断 |
   | BPMN / Workflow Engine | Flow type skill | 声明式流程编排（Mermaid） |

   combo skill 就像后端的 manager 层——不实现业务逻辑，只负责"在正确的时机调用正确的 service"。

2. **分层实现**：
   - **简单 combo**（如"cortex + scribe + onboarding 协作"）：用 Mermaid 流程图在 SKILL.md 中描述即可，agent 按图执行
   - **复杂 combo**（如 arena 的"生成临时 deck → 启动 subagent → 收集输出 → Pareto 分析"）：在 `src/` 中写 TypeScript，调用 `lythoskill-deck link`、`lythoskill-project-cortex task` 等 CLI

3. **命名一眼可见**：`combo-` 前缀让 agent 和人类都能立即识别"这是编排 skill，不是工具 skill"。例如：
   - `lythoskill-combo-project-workflow` — 项目治理全链路（cortex + scribe + onboarding）
   - `lythoskill-combo-report-generation` — 报告生成（web-search + docx + design-doc-mermaid）

4. **涌现 vs 显式**：各自 skill 的"相关 Skill"章节提供**涌现基础**（agent 自己发现组合可能），combo skill 提供**显式编排**（定义明确的触发条件和执行流程）。两者互补。

## 影响

- 正面:
  - combo 关系一眼可见（`combo-` 前缀命名）
  - 简单 combo 轻量（Mermaid），复杂 combo 强大（代码）
  - combo skill 不膨胀，因为业务逻辑仍在各自独立 skill 中
  - 和 Kimi CLI 的 `type: flow` 自然对接
  - arena 和 curator 作为 combo 涌现装置，与显式 combo 形成完整的认识论三层体系（见 wiki）

- 负面:
  - 需要维护 combo skill 的触发条件和路由表
  - 如果 combo 过多，skill 数量会增加

- 后续:
  - 在 `skill-deck.toml` 的 `[combo]` section 中明确 combo skill 的语义（deck-level SOP 声明）
  - combo skill 的 SKILL.md 中必须包含：触发条件、参与 skill 列表、编排流程图、路由规则
  - 约定 combo skill 的 `deck_delegates` 字段格式（条件 → 委托 skill 的映射表）
  - arena 发现的 emergent combo 应反馈到显式 combo（知识飞轮：实验发现 → 索引归档 → 沉淀为规范）

## 相关

- 关联 ADR: ADR-20260423101938000-thin-skill-pattern.md（thin skill 三层分离模式）
- 关联 Skill: lythoskill-deck（combo section 治理）
- 关联概念: Kimi CLI `type: flow`、Mermaid 流程图、deck_delegates 路由规则
