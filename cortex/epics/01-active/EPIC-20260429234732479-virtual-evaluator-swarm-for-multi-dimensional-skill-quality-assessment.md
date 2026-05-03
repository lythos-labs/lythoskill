---
lane: main
checklist_completed: false
checklist_skipped_reason: backfilled pre-ADR-20260503003315478
---
# EPIC-20260429234732479: Virtual evaluator swarm for multi-dimensional skill quality assessment

> Multi-dimensional skill evaluation through platform-adaptive virtual persona swarm.

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| active | 2026-04-29 | Created from ADR-20260424115621494 |

## 背景故事

Skill 评价目前依赖单一视角（arena judge 或 curator LLM 推理），存在盲区。同一个 skill，架构师、产品经理、测试员、安全研究员关注的维度完全不同。单一评价者无法覆盖所有维度，导致"看上去很完善但实际上在某类用户手里会出问题"的隐患。

此外，不同 agent 平台的并发能力差异巨大（Kimi 有 agent swarm，Claude Code 有 subagent，Cursor/Web Chat 无并发），评价器不能绑定特定平台。

本 Epic 的目标是实现一个**平台无关、自适应并发、多维度虚拟人格评价**的 skill 评测基础设施。

## 需求树

### 宿主并发能力读取 #backlog
- **触发**: evaluator 启动时需要知道当前 player 声明了多少并发能力
- **需求**: 读取 `player.toml` 的 `concurrent` 字段，而非检测平台身份
- **实现**: `readPlayerCapability()` — 解析 player.toml，返回 `{ concurrent: number }`
- **产出**: 与 player-deck 分离模型对齐的 capability reader
- **验证**: 同一 deck 在不同 player.toml（concurrent=8 vs concurrent=1）下行为正确分化

### 虚拟评价者人格设计 #backlog
- **触发**: 需要覆盖 skill 质量的六维度（架构、UX、稳定性、安全、文档、运维）
- **需求**: 6 个 MBTI 人格化评价者 prompt，每个聚焦特定维度
- **实现**: prompt 模板（MBTI + 角色 + 关注点 + 输出格式）
- **产出**: `personas/` 目录下 6 个 prompt 文件
- **验证**: 同一 skill 被不同人格评价，输出维度差异显著

### 自适应调度器 #backlog
- **触发**: 根据 player 声明的 `concurrent` 能力动态选择策略
- **需求**:
  - `concurrent >= 6` → 并行启动全部 6 个评价者人格
  - `concurrent = 4`  → 并行启动 4 个，剩余 2 个排队
  - `concurrent = 1`  → **串行退化：切换人格 → 新 session → 运行 → 回收 → 切换下一个人格**
- **实现**: `scheduleEvaluators()` — 声明式调度，不检测平台身份
- **产出**: 支持 (player × deck) 矩阵测试的调度器
- **验证**: 同一 deck 在 concurrent=8 player 和 concurrent=1 player 上输出等价（仅耗时不同）

### 评分向量聚合与 Pareto 分析 #backlog
- **触发**: 多评价者输出需要合并为可决策的评分
- **需求**: 评分向量 + Pareto 前沿识别 + 冲突标记
- **实现**: 聚合算法，输出结构化的 evaluation report
- **产出**: `aggregateScores()` 函数 + report 模板
- **验证**: 冲突案例（如架构师 5 分 vs 产品经理 2 分）被正确标记

### 缓存机制（可选）#backlog
- **触发**: 同一 skill 在短时间内被重复评价，浪费 token
- **需求**: 基于 content hash 的缓存，避免重复评价
- **实现**: 缓存 key = skill content_hash，TTL 可配置
- **产出**: `cache/` 目录或 SQLite 缓存表
- **验证**: 相同 skill 第二次评价秒回，不同 skill 重新评价

## 技术决策

| ADR | 标题 | 状态 |
|-----|------|------|
| ADR-20260424115621494 | virtual-evaluator-swarm adaptive concurrency skill design | accepted |
| ADR-20260424120936541 | player-deck separation and deck boundary rationale | accepted |
| ADR-20260424114401090 | combo-skill-as-orchestration-layer-naming-and-emergence-strategy | accepted |

**关键整合**：evaluator 的并发策略不检测平台身份（Kimi/Claude/Cursor），而是读取 `player.toml` 声明的 `concurrent` 能力。这是 player-deck 分离模型在 evaluator 层的自然延伸——deck 声明"用什么 skill"，player 声明"有多少资源"，evaluator 读取两者后自适应执行。

## 关联任务

| 任务 | 状态 | 描述 |
|------|------|------|
| — | — | 待创建：并发能力检测实现 |
| — | — | 待创建：评价者人格 prompt 模板 |
| — | — | 待创建：自适应调度器 |
| — | — | 待创建：评分向量聚合 |

## 经验沉淀

- **声明式能力协商，而非平台嗅探**：evaluator 不检测"你是 Kimi 还是 Claude"，只读取 `player.toml` 的 `concurrent` 字段。这是 IaC 理念在 skill 层的映射——声明期望状态，执行层根据实际能力自适应。
- **串行退化 = 人格切换 + session 轮转**：当 `concurrent = 1` 时，evaluator 不会报错或跳过，而是依次切换评价者人格、开新 session、运行、回收，再切下一个。同一个 deck 在任何 player 上都能跑，只是耗时不同。
- **Agent 自我识别**：当 agent 发现 "player.toml 描述的就是我" 时，它会主动验证自己的能力（"我能创建 subagent 吗？系统有 persona 功能吗？"），并将结果写入 `player.memo`。player 配置从静态文件变成活的状态机。
- **影子评价的真实性**：虚拟人格不是"假"的，而是真实用户群体的关注点代理。
- **与 arena 的边界**：arena 测组合效果，evaluator 测单 skill 质量，共享 Pareto 框架。
- **player-deck-evaluator 三层分离**：
  - deck 声明"用什么 skill"
  - player 声明"有多少资源" + memo 记录"实际测过什么"
  - evaluator 读取声明 + memo 后取保守交集，自适应执行
  三者互相独立，可任意交叉组合。

## 归档条件
- [ ] 并发读取、人格设计、调度器、聚合算法全部实现
- [ ] 在至少两种 player（concurrent=8 vs concurrent=1）上验证通过，输出等价
- [ ] 与 arena 共享 Pareto 分析代码的接口对齐
- [ ] wiki 文档：虚拟评价者人格设计指南
- [ ] wiki 文档：player-deck-evaluator 三层分离模型
