---
lane: main
checklist_completed: false
checklist_skipped_reason: Batch creation in non-interactive context
---
# EPIC-20260529003844792: Agent-native project governance: defense layers, evaluation patterns, and bias mitigation

> **Epic 是什么**:1-3 周可结案的 outcome,有依赖、有顺序、要规划。
> **Epic 不是什么**:配置漂移类小事(那是 task)、决策选型(那是 ADR)。
> **Workflowy zoom-in 心智**:屏蔽其他 epic 的诱惑,聚焦本卡。
> **双轨**:`lane: main`(当前迭代,最多 1)、`lane: emergency`(不可避免紧急,最多 1)。

> Agent-native project governance: defense layers, evaluation patterns, and bias mitigation

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| active | 2026-05-28 | Created |

## 背景故事

本 Epic 源于 2026-05-28 的一次外部 agent 评估。一个独立 agent 审计了 lythoskill 项目，给出 6.8/10 的评分。项目的第一反应是"评估者误读了"——但深入分析后发现：

1. 评估者的诊断不够精确（"mock abuse" vs "missing IO interface"），但信号是真实的
2. 项目 agent 犯了 "respect current code" 偏差——假设现有代码符合文档规范，然后 retroactively 辩护
3. 更深层的发现：豁免本身在消耗 agent 的 context window（需要读文档、理解条件、判断适用性）

用户最终决策：**统一风格 > 豁免复杂度**。60 行代码换永久减少认知税。

## 需求树

### 主题A: Agent Evaluation Arena 模式固化 #completed
- **触发**: 外部评估者给出 6.8/10，包含多个事实错误
- **需求**: 建立三 agent 验证机制（Evaluator → Auditor → Forked Evaluator）
- **实现**: 编写模式文档，记录真实案例（runAdd IO 注入辩论）
- **产出**: `cortex/wiki/01-patterns/2026-05-28-agent-evaluation-arena-pattern.md`
- **验证**: 模式文档包含完整的四步流程和真实案例

### 主题B: Internal Roundtable 模式提取 #completed
- **触发**: 发现 "respect current code" 偏差需要内部机制来打破
- **需求**: 将 Arena 的核心机制提取为文件级多 agent 辩论模式
- **实现**: 独立文档，定义 Proponent/Skeptic/Moderator 角色和输入隔离规则
- **产出**: `cortex/wiki/01-patterns/2026-05-29-internal-roundtable-pattern.md`
- **验证**: 包含 runAdd 辩论作为真实案例

### 主题C: CLI IO 注入统一 #in-progress
- **触发**: 用户决策——"减少心智记忆 > 60 行改动"
- **需求**: 移除 CLI 层的 IO 注入豁免，统一为 IO 注入风格
- **实现**: 
  - 定义 `CuratorIO` 接口
  - 改 `runAdd`/`runFind`/`runCurator` 签名
  - 重写测试（去掉 `spyOn(console)`）
  - 删除 L1 Escape Hatch 文档
- **产出**: 代码 + 测试 + 文档清理
- **验证**: `bun --filter='*' run test` 全绿，零 `spyOn(console)`

### 主题D: Bias 识别与记录 #completed
- **触发**: 评估过程中识别出多种 agent 认知偏差
- **需求**: 将偏差模式记录为 pitfalls，防止未来重复
- **实现**: 
  - pitfalls.md §10b: "Respect Current Code" bias
  - pitfalls.md §10: 更新为承认 CLI 层 gap
- **产出**: 更新的 pitfalls.md
- **验证**: ZK agent 能识别并引用这些偏差

## 技术决策

| ADR | 标题 | 状态 |
|-----|------|------|
| ADR-20260529002942317 | CLI Entry Point IO Injection Exemption | **待撤销** — 用户决策统一风格 |

## 关联任务

| 任务 | 状态 | 描述 |
|------|------|------|
| TASK-20260529003437287 | completed | Internal Roundtable 模式提取 |
| TASK-20260529003742409 | backlog | CLI IO 注入统一（refactor） |

## 经验沉淀

1. **豁免的隐藏成本 = 每个 agent 每次读代码时的认知税**。统一风格不需要解释，豁免需要。
2. **"尊重当前代码"偏差**：Agent 假设现有代码符合文档规范 → retroactively 辩护 → 从不质疑代码本身。
3. **外部评估的价值不在诊断精度，在信号真实性**。评估者可能说"mock abuse"，但信号可能是"missing IO interface"。
4. **Context window 是 agent 项目的核心资源**。任何消耗 context 的文档（豁免条款、例外说明、条件判断）都是债务。

## 归档条件

- [x] Agent Evaluation Arena 模式文档完成
- [x] Internal Roundtable 模式文档完成
- [x] Bias 识别记录完成
- [ ] CLI IO 注入统一完成（TASK-20260529003742409）
- [ ] ADR-20260529002942317 撤销
- [ ] 所有测试全绿
