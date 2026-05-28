# ADR-20260528173826499: Distributed orchestration by weight — why no centralized orchestrator

## Status History

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-05-28 | Created — ZK dreaming agent surfaced this as a key non-ADR decision warranting formal documentation |

## 背景

2026-05-28 ZK dreaming agent 阅遍 W17-W22 weekly 链后，指出一个隐含的架构决策从未被写进 ADR：

> "Orchestrator is distributed by weight, not centralized. Light = combo prompt, medium = SKILL.md, heavy = CLI. External evaluators searching for a single 'orchestrator' component miss this."

这不是偶然——它是三个独立演化路径的汇聚：

1. **Combo 从 skill card 变成 deck prompt**（ADR-20260506103209293）：早期 combo 是一个独立 skill type，占用 `max_cards` 预算、有 `combo-` 前缀规则。实践中发现：占用 3 个卡位声明一个编排管道，不如 fork 一个定制 skill 把不同细节分别怎么处理写清楚。Combo 退化为 deck-level prompt——不再占用卡位，不再有独立文件，只是一个编排指令。

2. **Curator 从 rigid indexer 变成 agent companion**（ADR-20260518123403810）：早期 curator 想做统一的 skill 索引中枢。实践发现 agent 的 web search + gh CLI 比手写 feed adapter 强。Curator 退化为本地缓存 + enrichment 层。

3. **Agent-adapter 从 Claude-only 变成 multi-player**（W19: 5+ adapters in one week）：早期 arena 只有 Claude CLI spawn。实践发现需要支持 Kimi、Codex、DeepSeek 等——但没有做 "统一 agent gateway"，而是 thin adapter per player。

三个路径的共同模式：**每一次都选择了分布式的、agent 驱动的方案，拒绝了中心化的、服务化的方案**。

## 决策驱动

- 行业验证：2026 年 AI agent 编排主流是集中式（CrewAI/LangGraph/OpenAI Agents SDK 都是 Orchestrator-Worker 模式）。lythoskill 的反向选择需要解释
- ZK dreaming agent 正确地识别了这是一个 "key non-ADR decision"——隐含在所有代码和文档里但从未被显式声明
- "fork over compose" 是一个真实的设计偏好：占用 3 个卡位声明管道 vs fork 一个定制 skill 写清楚——实践中后者更清晰

## 选项

### 方案A: 集中式编排（行业主流）

一个中心化 orchestrator 组件：管理 skill 依赖图、调度执行顺序、处理错误回滚、提供可视化。类似 CrewAI 的 Crew 或 LangGraph 的 StateGraph。

**优点**: 行业标准，开发者和 evaluator 容易理解；编排逻辑集中，方便审计和可视化
**缺点**: 
- 重复发明 agent 的能力——agent 已经能读 prompt 并执行，再加一层调度是 wrapper-on-wrapper
- 违反 thin-skill pattern——把一个应该放在 agent 层的智能下沉到 CLI/服务层
- 增加系统复杂度——需要维护调度状态、处理超时、并发控制
- 和 lythoskill 的 "governance layer, not runtime" 定位冲突

### 方案B: 分布式按重量编排（Selected）

编排能力分布在三层——combo prompt (light)、SKILL.md (medium)、CLI (heavy)。没有中心 orchestrator。Agent 读消息契约，自己成为 orchestrator。

**优点**:
- 和 thin-skill pattern 一致——智能在 agent，工具在 CLI
- 零额外基础设施——不需要调度服务、状态管理、消息队列
- 分享 deck 即分享编排——combo prompt 就是编排逻辑，接收方 agent 读了就能执行
- ZK 验证补回可理解性——分布式编排的可发现性劣势被 ZK agent 阅读模式消解
- "Fork over compose"：当编排逻辑复杂到需要 3+ skills 组合时，fork 一个定制 skill 写清楚比 combo 更清晰
**缺点**:
- Scan/grep 无法一眼看全编排逻辑——必须 read（而不是 scan）才能理解
- 依赖 agent 的阅读理解能力——弱 agent 可能执行出错
- 对习惯集中式编排的 evaluator 不友好——他们找不到 "orchestrator" 在哪

## 决策

**选择**: 方案B——分布式按重量编排。这不是一次性的选择，而是三个独立路径反复收敛到同一个结论。

**原因**:
1. **历史收敛**: combo、curator、agent-adapter 三个独立演化都选了分布式，不是设计偏好，是实践淘汰
2. **Fork over compose**: 复杂编排用 combo 不如 fork 一个定制 skill——这个经验法则直接推翻了 "combo as skill type" 的早期设计
3. **Agent 已经是 orchestrator**: 2026 年的 agent 能力已经足够读 prompt → 理解意图 → 执行多步骤。不需要再加一层调度器
4. **ZK 验证是分布式编排的互补品**: 分布式编排的可发现性劣势，由 ZK agent 的 "read → self-report → 理解确认" 模式补回

## 影响

- 正面:
  - 架构原则显式化——未来 evaluator 不会误以为 "缺少 orchestrator 组件"
  - Fork over compose 成为正式设计偏好——复杂管道用 fork，简单管道用 combo
  - 和 thin-skill pattern、smart-agent-dumb-tool 自洽
- 负面:
  - 需要 ZK 验证作为互补——没有 ZK 验证，分布式编排的可理解性下降
  - Scan/grep 无法理解编排逻辑——必须 read
- 后续:
  - 写入 architecture.md SSOT § Design Principle #8（已完成）
  - Combo 的 `skills` 字段作为视觉注释（ADR-20260528153455764）
  - Dead combo-as-skill ADRs 移入 03-superseded/（已完成）

## 相关

- 关联 ADR: ADR-20260506103209293 (combo redefinition), ADR-20260518123403810 (curator re-derivation), ADR-20260506214000000 (agent-adapter plugin), ADR-20260528153455764 (combo skills as annotation), ADR-20260423101938000 (thin-skill pattern)
- 关联 Wiki: `architecture.md` SSOT § Design Principle #8, `thin-skill-pattern.md` § User-Agent-Skill-CLI
- 发现来源: 2026-05-28 ZK dreaming agent W17-W22 weekly chain analysis
