# ADR-20260503222838594: Kanban pull mode with CFD observability for agent-driven task management

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-05-03 | Created — backlog emptied, perfect timing to establish flow discipline |

## 背景

Cortex 现有 `probe` / `list` / `stats` 三个状态确认工具，但它们都是**点状态快照**——告诉你现在各列有多少张卡，不告诉你**流量**和**节奏**。

问题：
1. **Push mode 惯性**：Agent 接到任务就开工，backlog 永远有货，in-progress 越堆越多，没有"停下来看板"的机制
2. **无 WIP 限制**：没有"最多同时做几张"的硬约束，导致 agent 上下文爆炸、任务收尾率下降
3. **无瓶颈观测**：不知道卡在哪一列最久，无法针对性优化

本 ADR 在 cortex 现有工具基础上叠加**拉取节奏 + WIP 限制 + CFD 观测**，把"能做什么"升级为"以什么节奏做"。

## 决策驱动

- **从后往前**：看完成能力（收束率）决定拉取节奏，不是看 backlog 长度决定开工数量
- **WIP = 员工数**：Agent 的并行单位是 subagent + 主线程，WIP 限制按实际处理能力设
- **观测先于优化**：没有 CFD 就不知道瓶颈在哪，任何"提速"都是猜

## 选项

### 方案A: 保持 push mode（现状）

接到任务 → 立即开工 → 尽可能并行。

**优点**:
- 零认知成本，默认行为
- 适合单任务冲刺

**缺点**:
- 多任务并行时上下文爆炸，收尾率下降
- 无法识别瓶颈（只知道"很忙"，不知道"卡在哪"）
- 没有节奏感，agent 容易陷入"永远在赶"状态

### 方案B: kanban pull mode + WIP 限制 + CFD 观测（selected）

**Pull 原则**：
- 只有 in-progress 有空位时才从 backlog 拉取
- 拉取前用四象限评估：紧急重要 / 重要不紧急 / 紧急不重要 / 不紧急不重要
- 优先拉"重要不紧急"（防止被紧急救火淹没）

**WIP 限制**：
- **Epic 层**：main lane ≤1，emergency lane ≤1（已落地）
- **Task 层**：in-progress ≤ subagent 并发上限 + 1
  - subagent 上限由 agent 平台决定（Claude Code 当前 ~4 并发）
  - +1 给主线程的协调/审查工作
  - 当前建议 WIP = 5（4 subagent + 1 main）

**CFD 最小可行**：
- 复用 `cortex probe` / `cortex stats` 的扫描逻辑
- **时间戳来源**：task card 的 `Status History` 表已有日期列（`post-commit` hook 在状态变更时自动写入），CFD 直接读取，**不需要新增 hook 或打标**
- 新增 `cortex flow` 子命令，输出：
  ```
  Column      Count    Avg Age    WIP Limit    Status
  backlog     0        -          ∞            ✅
  in-progress 0        -          5            ✅
  review      0        -          3            ✅
  completed   42       12d        -            -
  ```
- 瓶颈 = 堆积最多、avg age 最高、逼近 WIP limit 的列
- 建议 action：某列连续 3 次检查都逼近 limit → 停止拉取、聚焦清理

## 决策

**选择**: 方案B

**原因**:
- 空板启动（backlog = 0, in-progress = 0）是建立纪律的最佳时机，不会被存量淹没
- WIP = subagent + 1 是 empirically 有效的约束（类比 scrum 团队按人数设 WIP）
- `cortex flow` 可以复用现有 `probe`/`stats` 的目录扫描逻辑，不新增维护面

## 影响

- 正面:
  - 强制节奏感：agent 必须先看板再开工，减少盲目并行
  - bottleneck 显性化：CFD 列的 avg age 直接指出卡在哪
  - 与现有 `probe`/`stats`/`list` 工具整合，不另起炉灶
- 负面:
  - WIP 限制可能让 agent"感觉闲"——但这是设计意图，闲 = 思考空间
  - CFD 需要 task card 的 Status History 有真实日期才有 avg age 意义
- 后续:
  1. 实现 `cortex flow` 子命令（复用 probe/stats 扫描逻辑）
  2. 在 daily 顶部 Ground Truth 中加 kanban 状态栏（backlog / in-progress / review / completed）
  3. /loop 定期触发时先跑 `cortex flow`，再决定是否 pull
  4. 跑 2-3 个迭代后 review WIP 限制是否合适（收束率是否稳定）
  5. **probe 时间分片 + 归档周期**：task 累积后全量扫描 O(n) 爆炸。`probe` 默认只扫活跃层（in-progress + review + 最近 2 周 completed）；`probe --full` 月度/发版前跑一次；`cortex archive` 把 >30 天的 completed task 移入 `07-archived/`。CFD 只读活跃层，历史归档不参与日常 flow 分析 —— lean kanban 的 focus 心智：只看当下流动的卡

## 相关

- 关联 ADR: ADR-20260503003315478(epic granularity discipline) — lane 限制是 kanban 的 epic 层实现
- 关联 Epic: 无（本 ADR 是 meta-flow，不绑定具体 epic）
- 关联 CLI: `cortex probe`, `cortex stats`, `cortex list` — flow 子命令复用它们的扫描逻辑
