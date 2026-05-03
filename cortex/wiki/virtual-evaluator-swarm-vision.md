# 虚拟评测群（Virtual Evaluator Swarm）愿景

> 类型: 头脑风暴 / 长期愿景 | 来源: EPIC-20260429234732479（已降级为愿景文档）
>
> 状态: **未排期实现**，仅作设计参考。当前 lythoskill-arena 已提供基础 skill 对比能力，评测群是 arena 的扩展方向之一。

---

## 核心问题

Skill 评价目前依赖单一视角（arena judge 或 curator LLM 推理），存在盲区。同一个 skill，架构师、产品经理、测试员、安全研究员关注的维度完全不同。单一评价者无法覆盖所有维度，导致"看上去很完善但实际上在某类用户手里会出问题"的隐患。

此外，不同 agent 平台的并发能力差异巨大（Kimi 有 agent swarm，Claude Code 有 subagent，Cursor/Web Chat 无并发），评价器不能绑定特定平台。

## 愿景目标

实现一个**平台无关、自适应并发、多维度虚拟人格评价**的 skill 评测基础设施。

---

## 设计草案（五组件）

### 1. 宿主并发能力读取

- **触发**: evaluator 启动时需要知道当前 player 声明了多少并发能力
- **需求**: 读取 `player.toml` 的 `concurrent` 字段，而非检测平台身份
- **实现**: `readPlayerCapability()` — 解析 player.toml，返回 `{ concurrent: number }`
- **验证**: 同一 deck 在不同 player.toml（concurrent=8 vs concurrent=1）下行为正确分化

### 2. 虚拟评价者人格设计

- **触发**: 需要覆盖 skill 质量的六维度（架构、UX、稳定性、安全、文档、运维）
- **需求**: 6 个 MBTI 人格化评价者 prompt，每个聚焦特定维度
- **实现**: prompt 模板（MBTI + 角色 + 关注点 + 输出格式）
- **产出**: `personas/` 目录下 6 个 prompt 文件
- **验证**: 同一 skill 被不同人格评价，输出维度差异显著

### 3. 自适应调度器

- **触发**: 根据 player 声明的 `concurrent` 能力动态选择策略
- **需求**:
  - `concurrent >= 6` → 并行启动全部 6 个评价者人格
  - `concurrent = 4`  → 并行启动 4 个，剩余 2 个排队
  - `concurrent = 1`  → **串行退化：切换人格 → 新 session → 运行 → 回收 → 切换下一个人格**
- **实现**: `scheduleEvaluators()` — 声明式调度，不检测平台身份
- **产出**: 支持 (player × deck) 矩阵测试的调度器
- **验证**: 同一 deck 在 concurrent=8 player 和 concurrent=1 player 上输出等价（仅耗时不同）

### 4. 评分向量聚合与 Pareto 分析

- **触发**: 多评价者输出需要合并为可决策的评分
- **需求**: 评分向量 + Pareto 前沿识别 + 冲突标记
- **实现**: 聚合算法，输出结构化的 evaluation report
- **产出**: `aggregateScores()` 函数 + report 模板
- **验证**: 冲突案例（如架构师 5 分 vs 产品经理 2 分）被正确标记

### 5. 缓存机制（可选）

- **触发**: 同一 skill 在短时间内被重复评价，浪费 token
- **需求**: 基于 content hash 的缓存，避免重复评价
- **实现**: 缓存 key = skill content_hash，TTL 可配置
- **产出**: `cache/` 目录或 SQLite 缓存表
- **验证**: 相同 skill 第二次评价秒回，不同 skill 重新评价

---

## 关键设计原则

### 声明式能力协商，而非平台嗅探

evaluator 不检测"你是 Kimi 还是 Claude"，只读取 `player.toml` 的 `concurrent` 字段。这是 IaC 理念在 skill 层的映射——声明期望状态，执行层根据实际能力自适应。

### 串行退化 = 人格切换 + session 轮转

当 `concurrent = 1` 时，evaluator 不会报错或跳过，而是依次切换评价者人格、开新 session、运行、回收，再切下一个。同一个 deck 在任何 player 上都能跑，只是耗时不同。

### 影子评价的真实性

虚拟人格不是"假"的，而是真实用户群体的关注点代理。

### 与 arena 的边界

- **arena**: 测组合效果（多个 skill 一起用时的协同/冲突）
- **evaluator**: 测单 skill 质量（六维度人格评价）
- **共享**: Pareto 分析框架

### player-deck-evaluator 三层分离

| 层 | 声明内容 | 对应文件 |
|----|---------|---------|
| deck | "用什么 skill" | `skill-deck.toml` |
| player | "有多少资源" + "实际测过什么" | `player.toml` + `player.memo` |
| evaluator | 读取声明 + memo 后取保守交集，自适应执行 | 运行时逻辑 |

三者互相独立，可任意交叉组合。

---

## 相关 ADR

| ADR | 标题 | 状态 |
|-----|------|------|
| ADR-20260424115621494 | virtual-evaluator-swarm adaptive concurrency skill design | accepted |
| ADR-20260424120936541 | player-deck separation and deck boundary rationale | accepted |
| ADR-20260424114401090 | combo-skill-as-orchestration-layer-naming-and-emergence-strategy | accepted |

---

## 何时从愿景变为 Epic

以下条件满足任一，可将本文档升级为正式 Epic：

1. lythoskill-arena 的 Pareto 分析代码稳定，接口可复用
2. `player.toml` 格式被至少 2 个 skill 消费（非仅 evaluator）
3. 有真实需求：某个 skill 在单一视角评价下通过了，但在实际使用中被特定用户群体发现严重缺陷
4. 有预算/资源进行 6 个人格 prompt 的 arena 实证测试

---

> 本文档由 EPIC-20260429234732479 降级而来。原 Epic 的所有设计思考已收拢至此，不占 active lane slot。
