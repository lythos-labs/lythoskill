# Pattern: lythoskill Scope Boundaries & Recommended Ecosystem Paths

> 状态: ✅ 已验证 | 关联: ADR-20260423130348396

## 核心原则

**lythoskill 只做 meta-governance，不做应用工作流。**

Agent 犯错往往不是能力问题，而是**找不到正确的基础设施时急出来的诡异 workaround**——就像找不到厕所的人会做出不合理的行为。lythoskill 的目标就是提供清晰的 skill 发现、治理和 handoff 机制，避免 agent 在资源不足时做出错误的临时拼凑。

## In Scope: Meta-Infrastructure

lythoskill 核心包和技能只做这些事：

| 类别 | 技能 | 解决的问题 |
|------|------|-----------|
| **脚手架** | `lythoskill-creator` | 如何创建符合 thin-skill 规范的包 |
| **卡组治理** | `lythoskill-deck` | 哪些 skill 可见、会不会冲突 |
| **项目记忆** | `project-scribe`, `project-onboarding`, `project-cortex` | Session 之间信息不丢失 |
| **发现索引** | `skill-curator` | 冷池里有什么、能不能用 |
| **基准测试** | `lythoskill-arena` | Deck 组合是否比裸奔更有效 |

这些技能的共同特征：**它们管理其他技能，不直接帮用户完成具体业务任务。**

## Out of Scope: Application Workflows

以下类型的 skill **不属于 lythoskill 本仓库**，即使它们非常有价值：

| 类型 | 例子 | 为什么不属于 lythoskill |
|------|------|------------------------|
| **报告生成** | `report-generation-combo` | 依赖 Playwright/Chromium/Tailwind CDN，与 zero-deps 哲学冲突 |
| **深度研究** | `deep-research-orchestrator` | 应用层 workflow，组合搜索+读取+LLM 做业务任务 |
| **网页搜索** | `web-search`, `web-reader` | 依赖 `z-ai-web-dev-sdk` 等外部 SDK |
| **内容创作** | `image-generation`, `video-generation`, `pptx` | 领域特定，依赖重型库 |
| **垂直业务** | `finance`, `ai-marketing-skills` | 业务逻辑，与治理无关 |

## 如果你要做这些事，推荐路径

lythoskill 作为 scaffolding 工具是中立的——它可以帮助你创建任何类型的 skill repo，只是本仓库选择聚焦在治理层。

### 路径 A: 独立工具合集（推荐）

```bash
# 用 lythoskill 脚手架创建独立的 workflows 仓库
lythoskill init lythos-workflows
```

这个 repo 里可以放：
- `report-generation-combo`
- `deep-research-orchestrator`
- `web-search` + `web-reader` 组合
- 其他术层 workflow skill

**好处**：
- 应用工作流有自己的发布周期，不受 lythoskill 核心版本约束
- 可以引入重型依赖（Playwright、Chromium、各种 SDK）而不污染核心
- 不同团队可以 fork 出自己的 toolkit，共享 thin-skill 规范但不共享业务逻辑

### 路径 B: 团队私有 Toolkit

```bash
lythoskill init my-team-toolkit
```

适合：
- 公司内部的垂直业务 skill（财务审批、HR 流程、运维脚本）
- 不想开源的专有工作流
- 需要接入内部系统的 adapter

### 路径 C: Stack-Primer / Embassy

```bash
lythoskill init lythos-embassy
```

专门存放 **stack-primer**——告诉 agent "怎么用好外部生态的 skill"。已有示例：
- `lythos-superpowers-stack-primer`
- `lythos-mattpocock-stack-primer`
- `lythos-zai-stack-primer`

这些不是 wrapper（不重新实现功能），而是 **外交指南**——坑点、最佳实践、与 lythoskill 生态的配合方式。

### 路径 D: 个人冷池管理

```bash
lythoskill init my-cold-pool
```

个人或团队收集的所有第三方 skill，配合 `lythoskill-deck` 的冷池机制使用。curator 产出的分类体系和 pitfall 检查可以复用。

## 决策树: 这个 skill 该放哪里?

```
你要创建什么 skill?
        │
        ▼
它帮助管理/发现/治理其他 skill?
  ├─ 是 → lythoskill 本仓库（或核心生态）
  │       例: deck governance, curator, arena, handoff
  │
  └─ 否 → 它帮助用户完成具体业务任务?
            ├─ 是 → 独立 repo / workflows toolkit
            │       例: report generation, web search, code review
            │
            └─ 否 → 它教 agent 怎么用好外部 skill?
                      ├─ 是 → stack-primer embassy repo
                      │       例: superpowers-primer, zai-primer
                      └─ 否 → 重新想想这个 skill 的 purpose
```

## 为什么必须画这条线

lythoskill 的定位是 **治理复杂度、防止 skill 屎山**。如果它自己变成一个大杂烩——把报告生成、图像处理、金融分析全塞进来——它就变成了它要解决的问题。

保持核心 lean 的好处：
- **认知负担小**：新贡献者只需要理解 governance 层
- **发布快**：核心包没有重型依赖，CI 快
- **边界清晰**："lythoskill 不做这个" 比 "lythoskill 什么都能做" 更有力量
- **生态健康**：鼓励外部 repo 围绕 thin-skill 规范生长，而不是全部内卷到一个 monorepo

## 相关

- curator 本地扫描: 冷池 skill 的 dao-shu-qi-yong 分类示例（你的冷池内容不同，结果也不同）
- ADR-20260423130348396: lythoskill-deck 移植决策（依赖分层原则）
- `cortex/wiki/01-patterns/thin-skill-pattern.md`: 三层分离架构
