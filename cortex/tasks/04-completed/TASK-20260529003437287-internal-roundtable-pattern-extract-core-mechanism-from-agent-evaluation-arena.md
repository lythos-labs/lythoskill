# TASK-20260529003437287: Internal Roundtable pattern: extract core mechanism from Agent Evaluation Arena

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-28 | Created |
| in-progress | 2026-05-28 | Started |
| review | 2026-05-28 | Deliverables committed |
| completed | 2026-05-28 | Done |

## 背景与目标

Agent Evaluation Arena 模式（`cortex/wiki/01-patterns/2026-05-28-agent-evaluation-arena-pattern.md`）已经记录了外部评估的三 agent 验证机制（Evaluator → Sober Auditor → Forked Evaluator）。本次任务将其核心机制提取为可复用的 **Internal Roundtable** 模式，用于项目内部的架构决策和代码审查。

**核心洞察**：slock.ai 的多 Agent 协作（Task Claim + 频道讨论）与 lythoskill 的 cortex 任务系统可以融合——不需要模拟完整的聊天频道，提取"多视角辩论 + 裁决"的核心即可。

## 需求详情

- [ ] 将 Agent Evaluation Arena 的 "Internal Roundtable" 变体独立为可复用模式文档
- [ ] 明确与 slock.ai 的差异：我们不是运行时协作，而是审计时协作（串行 spawn，不烧 context）
- [ ] 定义三种角色（Proponent / Skeptic / Moderator）的职责和输入隔离规则
- [ ] 定义触发条件：什么情况下应该启动 Internal Roundtable
- [ ] 定义输出格式：辩论记录 + Moderator 裁决 + 行动项
- [ ] 将本次 runAdd IO 注入辩论作为第一个真实案例归档

## 技术方案

1. **独立文档**：新建 `cortex/wiki/01-patterns/2026-05-29-internal-roundtable-pattern.md`
2. **引用而非复制**：Agent Evaluation Arena 的通用部分（Why Three Agents、When to Apply）通过链接引用，不重复
3. **聚焦差异**：Internal Roundtable 的独特价值是打破 "respect current code" 偏差，这是外部 Arena 不覆盖的场景
4. **cortex 集成**：任务创建时标注 `roundtable` 标签，Moderator 裁决后更新任务状态

## 验收标准

- [ ] 新文档包含：触发条件、角色定义、输入隔离规则、输出格式、与外部 Arena 的对比表
- [ ] 文档中引用本次 runAdd 辩论作为案例（Agent A / Agent B / Moderator 裁决）
- [ ] 文档通过 ZK 验证（zero-knowledge subagent 能 self-report 理解模式用途）
- [ ] 更新 `cortex/wiki/01-patterns/INDEX.md` 或相关索引

## 进度记录
<!-- 执行时更新，带时间戳 -->

## 关联文件
- 修改: `cortex/wiki/01-patterns/2026-05-28-agent-evaluation-arena-pattern.md`（添加链接到新文档）
- 新增: `cortex/wiki/01-patterns/2026-05-29-internal-roundtable-pattern.md`

## Git 提交信息建议
```
docs(pattern): internal roundtable — extract core mechanism from agent evaluation arena (TASK-20260529003437287)

- Independent pattern doc for file-level multi-agent debate
- Trigger conditions, role isolation, moderator verdict format
- Real example: runAdd IO injection debate (Agent A vs Agent B)
- ZK validated
```

## 备注

**与 slock.ai 的关系**：
- slock.ai = 运行时多 Agent 协作（Agent 同时在线，频道讨论）
- Internal Roundtable = 审计时多 Agent 辩论（串行 spawn，文件级聚焦）
- 共同核心：Agent 需要外部视角打破自身闭环
- 差异：我们不模拟聊天频道，用 cortex 任务 + subagent spawn 实现相同目标

**缘分**：slock.ai 创始人 RC 也是 Kimi CLI 作者。lythoskill 的 Agent Evaluation Arena 和 Internal Roundtable 是独立发现的同类模式——验证了这一方向的普适性。
