# Concurrent Subagent Map-Reduce

> 如何用并发 subagent 执行独立任务，主 agent 零跟踪成本收集结果。

## 问题

想让多个 subagent 并发工作，但：
- 不想发明调度器/编排器/FSM 框架
- 不想跟踪 agent_id
- 需要结果可追溯、可复盘

## 解法：目录即状态

不需要代码框架，只需要**目录结构约定** + **TASK card**。

```
playground/test-runs/
└── 20260423-154911/              ← 时间戳隔离每次运行
    ├── deck-a/
    │   ├── TASK-deck-a.md        ← 任务指针（subagent 自己更新）
    │   ├── skill-deck.toml       ← 产物
    │   ├── skill-deck.lock       ← 产物
    │   └── .claude/skills/       ← 产物
    ├── deck-b/
    │   └── ...
    └── deck-c/
        └── ...
```

## TASK Card 格式

project-cortex 风格的 markdown，front matter 记录状态：

```markdown
---
id: TASK-deck-a
state: 02-in-progress
assigned_to: subagent-a
---

# Deck A: 自选 Skill 组合

## Status History
| State | Date | Note |
|-------|------|------|
| 01-backlog | 2026-04-23T07:49:11Z | 任务创建 |
| 02-in-progress | 2026-04-23T07:49:11Z | 分配给 subagent-a |

## Description
1. 扫描 `~/.agents/skill-repos/` 查看可用 skills
2. 选择 5-10 个有协同效应的 skills
3. 创建 `skill-deck.toml`
4. 运行 `lythoskill-deck link`
5. **更新本 TASK card 状态**

## Acceptance Criteria
- [ ] skill-deck.toml 已创建
- [ ] link 成功
- [ ] TASK card 状态更新为 04-completed
```

## 执行流程

### Map（主 agent）

1. 创建时间戳目录：`mkdir playground/test-runs/$(date +%Y%m%d-%H%M%S)`
2. 为每个任务创建子目录 + TASK card（state = 02-in-progress）
3. 启动 background subagent，各分配一个目录

```
Agent A → workdir: deck-a/
Agent B → workdir: deck-b/
Agent C → workdir: deck-c/
```

### Run（subagent）

1. 读取本目录的 TASK card
2. 执行任务
3. 更新 TASK card：
   - front matter `state: 04-completed`
   - Status History 添加完成行
4. 产物直接写在 workdir 中

### Reduce（主 agent）

1. 等所有 subagent 完成（看通知或检查 TaskList）
2. 遍历各 workdir，读取 TASK card
3. 汇总结果

**不需要跟踪 agent_id**——目录结构本身就是索引。

## 关键原则

| 不要做 | 要做 |
|--------|------|
| 发明编排器/调度器/FSM 框架 | 用目录 + TASK card 约定 |
| 跟踪 agent_id | 等完成后读目录状态 |
| 把产物放随机位置 | 固定时间戳目录结构 |
| 用复杂状态存储 | markdown front matter 就是状态 |

## 和 project-cortex 的关系

TASK card 直接复用 project-cortex 的 task 格式：
- 7 状态 FSM（01-backlog → 07-archived）
- Status History 表格
- front matter 元数据

区别只是：task card 放在 workdir 中由 subagent 自己更新，而不是放在 `cortex/tasks/` 中。

## 实际验证

2026-04-23 用 3 个并发 subagent 测试 lythoskill-deck：
- 3 个 deck 各自从 `~/.agents/skill-repos/`（54 skills）自选组合
- 产物全部在 `playground/test-runs/20260423-154911/` 下可追溯
- TASK card 状态历史完整
- 零编排代码，零 agent_id 跟踪
