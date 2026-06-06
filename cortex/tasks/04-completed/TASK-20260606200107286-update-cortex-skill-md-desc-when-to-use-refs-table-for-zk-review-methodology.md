# TASK-20260606200107286: Update cortex SKILL.md desc + when_to_use + refs table for ZK Review methodology

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-06-06 | Created |
| in-progress | 2026-06-06 | Started |
| completed | 2026-06-06 | Closed via trailer |

## 背景与目标

外部项目验证了 ZK Review 方法论（零知识 agent review task 描述，检查 WHAT/WHY/HOW 是否清晰）。该方法论应作为 cortex task 设计流程的一部分被 agent 自动触发。

当前 cortex SKILL.md 的 `when_to_use` 已包含 "delegate to subagent"，但缺 **"在分配 task 前做 ZK Review"** 的触发器。同样 `description` 缺 ZK Review 概念，`## Supporting References` 表缺对应的 reference 链接。

**目标**：更新 cortex SKILL.md 三处，让 agent 在需要做 ZK Review 时自动触发 cortex skill。

## 前置知识

- **SKILL.md 完整路径**: `.claude/skills/lythoskill-project-cortex/SKILL.md`（474 行）
- **要修改的三个位置**:
  - `:1-11` — frontmatter `description` 字段（多行、以 `GTD-style governance` 开头）
  - `:12-36` — frontmatter `when_to_use` 字段（"Create a task..." 开头，到 "ABSOLUTELY FORBIDDEN" 结束）
  - `:464-473` — `## Supporting References` 表格（7 行现有 entry）
- **新增 reference 文件**: `references/zk-review.md`（由 TASK-20260606200104214 创建）
- **AGENTS.md ZK Validation Pattern**: `AGENTS.md:112-118`（已有的文档验证模式，注意区分）

## 接口契约

- **description 字段**（`:1-11`）：新增一行，形式为 `ZK task review (WHAT/WHY/HOW) ensures subagent-readable requirements.`
  - 描述是渐进式披露——第一段概述核心功能，后续段落展开。ZK Review 作为 task 设计的一部分放在第二段。
- **when_to_use 字段**（`:12-36`）：在现有 "delegate to subagent" 触发器之后，新增 ZK Review 触发器：
  ```
  - Before assigning a task to an executor agent — ZK Review the task card (WHAT/WHY/HOW, prerequisite knowledge, interface contracts, baseline data, scope declaration)
  - User says "ZK review this task" / "零知识审查" / "review task" / "任务能看懂吗"
  ```
- **## Supporting References 表**（`:464-473`）：新增一行：
  ```
  | Design tasks that a ZK agent can execute without asking | [references/zk-review.md](./references/zk-review.md) |
  ```

## 需求详情

- [ ] `description` 字段新增 ZK Review 概念（1 行，融入现有第二段）
- [ ] `when_to_use` 新增 ZK Review 触发器（2 条 trigger rule）
- [ ] `## Supporting References` 表新增 ZK Review 行
- [ ] 确保触发器使用 hybrid desc 格式（calm + explicit keywords），匹配项目规范（`project_hybrid_desc_format.md`）

## 技术方案

纯文本编辑，修改 `.claude/skills/lythoskill-project-cortex/SKILL.md`。

**description 修改方案**：
现有第二段以 "GTD-style governance: ADR, Epic, Task, Wiki." 开头。在 "Never leave state drift..." 之后、`probe detects...` 之前插入 ZK Review 段落：
```
ZK task review (WHAT/WHY/HOW) ensures subagent-readable requirements before assignment.
```

**when_to_use 修改方案**：
在 "delegate to subagent" 之后、"task status" 之前插入触发器文本。

**refs table 修改方案**：
在 `| Understand the milestone protocol...` 行之后插入新行。按重要性排序（ZK Review 是 task 设计核心，放在 milestone protocol 附近）。

## 验收标准

- [ ] `bunx @lythos/skill-coach validate` 通过（如果有——当前本地可能没有此命令，则以人工检查代替）
- [ ] SKILL.md 的前后修改不破坏现有 YAML frontmatter 格式（`---` 包裹、冒号缩进正确）
- [ ] ZK agent 读更新后的 SKILL.md，能在 "用户说 'review task'" 场景下触发 cortex skill
- [ ] 新增的 when_to_use 关键字能 grep 到：`grep -c -i "ZK.*[Rr]eview" .claude/skills/lythoskill-project-cortex/SKILL.md` → 期望 ≥ 2

## 范围声明

- **必达**：三处修改（description + when_to_use + refs table）
- **必达**：when_to_use 新增至少 2 个 trigger pattern
- **不做**：不重写 description 整体结构（只插 1 行）
- **不做**：不修改 CLI 代码
- **依赖**：TASK-20260606200104214（reference doc 必须先存在，否则 refs table 链接指向空文件）

## 进度记录

## 关联文件

- 修改: `.claude/skills/lythoskill-project-cortex/SKILL.md`（三处 edit）
- 依赖: TASK-20260606200104214（创建 `references/zk-review.md`）

## Git 提交信息建议
```
feat(cortex-skill): add ZK Review triggers to description + when_to_use + refs table (TASK-20260606200107286)

- description: ZK task review ensures subagent-readable requirements
- when_to_use: "ZK review" / "零知识审查" triggers
- refs: link to zk-review.md
```

## 备注

- 触发器措辞参考了 `project_hybrid_desc_format.md`（hybrid: calm prose + explicit triggers）
- 关注与 AGENTS.md ZK Validation Pattern 的措辞一致性——两处都叫 ZK，但 Validation = 文档可读性验证，Review = 任务可执行性审查
