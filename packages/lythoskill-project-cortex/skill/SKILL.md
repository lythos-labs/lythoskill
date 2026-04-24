---
name: project-cortex
description: |
  GTD-style project management workflow with numeric-prefixed directories (01-, 02-, etc.)
  combining ADR (Architecture Decision Records), Epic (requirement tracking), and Task
  (execution cards). Directories are ordered by workflow stage for easy navigation.

  Use this skill when managing software development projects with:
  - Architecture decisions that need documentation and review
  - Feature development that needs requirement tracing
  - Task delegation to subagents with clear acceptance criteria
  - Git-based version control with semantic versioning

  This workflow creates a structured system: Epics track "why" (requirements origins),
  ADRs track "how" (technical decisions), Tasks track "what" (executable work).

  **Key Feature**: Numeric prefixes (01-backlog, 02-in-progress, etc.) ensure directories
  appear in GTD workflow order in file listings.
  **ID Feature**: Timestamp-based IDs (`PREFIX-yyyyMMddHHmmssSSS`) avoid collision
  without a central database.
---

# Project Cortex: ADR + Epic + Task + Wiki

> **核心原则: 自动化优于记忆 (Automation > Memory)**
>
> 不要依赖记忆，使用自动化脚本确保一致性：
> - `@lythos/project-cortex` CLI — 自动分配 timestamp ID，生成模板，避免冲突
> - `generate-index.ts` — 自动生成项目索引

A structured project management system for AI-assisted software development.

## Overview

This workflow creates three interconnected systems:

```
┌─────────────────────────────────────────────────────────────┐
│                    PROJECT WORKFLOW                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📋 EPIC          🏛️ ADR           📄 TASK                 │
│  (为什么)          (怎么做)          (做什么)                 │
│                                                             │
│  需求来源           技术决策          具体执行                │
│  背景故事           方案对比          验收标准                │
│  需求树             决策记录          进度追踪                │
│  经验沉淀           影响分析          Git关联                 │
│                                                             │
│     ↓                ↓                ↓                     │
│  派生 Task        指导 Task        关联 Epic/ADR            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Prerequisites

- Bun runtime (scripts use `bunx`)
- `@lythos/project-cortex` published to npm (or available via workspace link)

## Scripts / CLI Commands

All commands are thin wrappers around `@lythos/project-cortex`:

### Create Task
```bash
bunx @lythos/project-cortex task "修复登录 bug"
```

### Create Epic
```bash
bunx @lythos/project-cortex epic "用户认证系统"
```

### Create ADR
```bash
bunx @lythos/project-cortex adr "选择数据库方案"
```

### Init Workflow
Initialize cortex directory structure in current project:
```bash
bunx @lythos/project-cortex init
```

### Generate Index
Auto-generate `INDEX.md` and `cortex/wiki/INDEX.md`:
```bash
bunx @lythos/project-cortex index
```

Generated `INDEX.md` example:
```markdown
# Project Index

## 概览
| 类型 | 总数 | 活跃/完成 |
|------|------|----------|
| Tasks | 5 | 进行中: 0, 已完成: 2 |
| Epics | 1 | 活跃: 1, 已归档: 0 |
| ADRs | 5 | 已接受: 4 |

## Epics
- **EPIC-20260423102000000**: lythoskill MVP — Initial Release

## Tasks
- [ ] TASK-20260423124059736: Create skill templates
- ✅ ~~TASK-20260423102009000~~: Generate project files

## ADRs
- ✅ ADR-20260423101938000 (accepted): Thin Skill Pattern
```

### List Items
```bash
bunx @lythos/project-cortex list    # list tasks, epics, adrs
bunx @lythos/project-cortex stats   # project statistics
bunx @lythos/project-cortex next-id # show ID format example
```

### Probe Status (防腐检查)
扫描所有文件，检查内部状态记录与所在目录是否一致。发现不一致时暴露出来，**由人工确认真实状态**后决定是移动文件还是更新记录。

```bash
bunx @lythos/project-cortex probe
```

检查规则：
- 支持 `## Status History`（新格式）和 `## Status`（旧格式）
- 目录位置是真相来源（source of truth）
- 无法判断时标记为 `❓`，必须人工确认
- **不自动修复**，只暴露问题

## Directory Structure

After `init`, current project gets:

```
cortex/
├── adr/
│   ├── ADR-TEMPLATE.md
│   ├── 01-proposed/
│   ├── 02-accepted/
│   ├── 03-rejected/
│   └── 04-superseded/
├── epics/
│   ├── EPIC-TEMPLATE.md
│   ├── 01-active/
│   └── 02-archived/
├── tasks/
│   ├── TASK-TEMPLATE.md
│   ├── 01-backlog/      # Capture + Clarify
│   ├── 02-in-progress/  # Engage
│   ├── 03-review/       # 待验收
│   ├── 04-completed/    # 正常完成
│   ├── 05-suspended/    # 悬置/阻塞（可恢复）
│   ├── 06-terminated/   # 终止/取消（非正常结束）
│   └── 07-archived/     # 最终归档
└── wiki/
    ├── README.md
    ├── 01-patterns/     # Reusable solutions
    ├── 02-faq/          # Common questions
    └── 03-lessons/      # Retrospectives
```

**Note**: 使用数字前缀（01-, 02-）确保目录按 GTD 流程排序显示。

## ID Format

All items use **timestamp-based IDs** — no central database, no sequential counter:

| Type | Example |
|------|---------|
| Task | `TASK-20250420120000000` |
| Epic | `EPIC-20250420120100000` |
| ADR  | `ADR-20250420120200000` |

Format: `PREFIX-yyyyMMddHHmmssSSS` (17 digits)

Benefits:
- **Collision-free**: No two items created at different milliseconds share an ID
- **Self-sorting**: Files sort chronologically by ID
- **No registry**: No `.task-id-db.json` or counter file to maintain

---

## Quick Start

### 1. Initialize Workflow

```bash
# Create directory structure
mkdir -p cortex/adr/{01-proposed,02-accepted,03-rejected,04-superseded}
mkdir -p cortex/wiki/{01-patterns,02-faq,03-lessons}
mkdir -p cortex/epics/{01-active,02-archived}
mkdir -p cortex/tasks/{01-backlog,02-in-progress,03-review,04-completed,05-suspended,06-terminated,07-archived}

# Copy templates
cp ./assets/ADR-TEMPLATE.md cortex/adr/
cp ./assets/EPIC-TEMPLATE.md cortex/epics/
cp ./assets/TASK-TEMPLATE.md cortex/tasks/
```

Or simply:
```bash
bunx @lythos/project-cortex init
```

### 2. Start with an Epic

> 💡 **看不懂模板？** 查看 `cortex/epics/01-active/EPIC-20260423185732845-playground-epic.md` — 这是用 CLI 生成的真实示例文件。

Create `cortex/epics/01-active/EPIC-20250420120100000-feature-name.md`:

```markdown
# EPIC-20250420120100000: Feature Description

## Background Story
Why does this feature exist? What problem does it solve?

## Requirement Tree

### User Story #in-progress
- **Trigger**: What event triggered this need?
- **Requirement**: What needs to be built?
- **Implementation**: How was it solved?
- **Output**: TASK-<timestamp>
- **Validation**: How to verify?

## Related Tasks
| Task | Status | Description |
|------|--------|-------------|
| TASK-20250420143321029 | ⬜ | ... |

## Lessons Learned

## Archive Criteria
- [ ] All tasks completed
- [ ] Validated in production
```

### 3. Make Technical Decisions (ADR)

When facing technical choices, create an ADR in `cortex/adr/01-proposed/`:

```bash
# Create ADR (CLI automatically assigns timestamp ID)
bunx @lythos/project-cortex adr "选择数据库方案"
# Output: cortex/adr/01-proposed/ADR-20250420120200000-choose-database.md
```

Content:
```markdown
# ADR-20250420120200000: 选择数据库方案

## Status
- [x] Proposed

## Context
What is the problem we're solving?

## Options

### Option A: ...
**Pros**:
-

**Cons**:
-

### Option B: ...

## Decision
**Chosen**: Option X

**Rationale**: ...

## Consequences
- Positive: ...
- Negative: ...
- Follow-up: ...
```

Move to `cortex/adr/02-accepted/` once decided.

### 4. Create and Delegate Tasks

> 💡 **看不懂模板？** 查看 `cortex/tasks/01-backlog/TASK-20260423185733611-playground-task.md` — 这是用 CLI 生成的真实示例文件。

From Epic or ADR, create executable tasks in `cortex/tasks/01-backlog/`:

```bash
# Create Task (CLI automatically assigns timestamp ID)
bunx @lythos/project-cortex task "具体工作内容"
# Output: cortex/tasks/01-backlog/TASK-20250422143321029-specific-work.md
```

Content:
```markdown
# TASK-20250422143321029: Specific Work

## Status History
| Status | Date | Note |
|--------|------|------|
| backlog | 2025-04-22 | Created |

## Background
Link to EPIC-20250420120100000 / ADR-20250420120200000

## Requirements
- [ ] Requirement 1
- [ ] Requirement 2

## Technical Approach
Implementation details...

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Progress
<!-- Subagent updates -->

## Related Files
- Modify: `src/...`
- Create: `src/...`

## Git Commit
```
feat(scope): description (TASK-20250422143321029)

- Detail 1
- Detail 2
```
```

### Task Milestone 协议（防 endless 调研 / 伪完成）

> 基于实际项目经验：checklist 全勾 ≠ 任务完成。必须有明确的「结束标准」和「明确不交付」清单。

#### 每个 Task 创建时必须定义

```markdown
## 里程碑声明 (Milestone v1.0)

**完成日期**: YYYY-MM-DD
**结束标准**: 一句话说明什么状态算「够」了

### 已交付

| 交付物 | 验证方式 | 状态 |
|--------|----------|------|
| 具体产出 A | 如何验证它存在且可用 | ✅ |
| 具体产出 B | 如何验证它存在且可用 | ✅ |

### 明确不交付（超出当前里程碑）

- [ ] 不在本次范围的功能 X → 移至 TASK-<timestamp>
- [ ] perfectionism 陷阱："更好"但不是"必须"的 Y → 明确放弃

### 结束原因

> "为什么现在停？因为 [结束标准] 已达成。继续深入是 endless 调研，
> 不是当前 milestone 的目标。"
```

#### 反模式（实际发现的错误）

| 反模式 | 例子 | 后果 |
|--------|------|------|
| **Checklist 全勾 = 完成** | 5 个交付物只做了 1 个，但 checklist 全勾了 | 伪完成，实际产出不足 |
| **没有「明确不交付」** | "再调研一下"、"再完善一下" | endless 调研，没有终点 |
| **结束标准模糊** | "做得差不多了" | agent 自行判断是否完成，标准漂移 |
| **交付物散落在 tmp/** | 报告在 tmp/，没有归档到正式目录 | 后续 session 找不到产出 |

#### 何时标记 Completed

✅ **可以标记 Completed**：
- 已交付清单中的核心交付物已完成
- 有明确的结束原因说明
- 不交付清单已声明（防止后续 session 追问"为什么没做 X"）

❌ **不能标记 Completed**：
- 只有 checklist 全勾，没有实际交付物
- 结束标准是"差不多行了"
- 还有未声明的 "TODO" 或 "后续再弄"

### 5. Delegate to Subagent

```
Please execute: cortex/tasks/01-backlog/TASK-20250422143321029-specific-work.md

Steps:
1. Move to cortex/tasks/02-in-progress/
2. Implement according to requirements
3. Update progress with timestamps
4. Commit with "(TASK-20250422143321029)" in message
5. Move to cortex/tasks/03-review/
```

## Workflow Rules

### Role Separation

| Role | Permissions | Directories |
|------|-------------|-------------|
| **System (You)** | Create Epics/ADRs, archive completed | `cortex/epics/01-active/`, `cortex/adr/02-accepted/`, `cortex/tasks/04-completed/` |
| **Subagent** | Execute tasks, update progress | `cortex/tasks/02-in-progress/`, `cortex/tasks/03-review/` |

### Status Flow

```
Epic:    01-active → 02-archived (when criteria met)
ADR:     01-proposed → 02-accepted/03-rejected/04-superseded
Task:    01-backlog → 02-in-progress → 03-review → 04-completed → 07-archived
                  ↓
            05-suspended (paused, recoverable)
                  ↓
            06-terminated (cancelled, abnormal end)
```

### Git Integration (⚠️ Critical)

**Commits MUST include task ID**: `(TASK-<timestamp>)` in commit message title

✅ Good: `git commit -m "feat(api): add endpoint (TASK-20250422143321029)"`
❌ Bad:  `git commit -m "feat(api): add endpoint"`

**Why required**:
- Traceability: Link code changes to tasks
- Audit: Easy to find related commits
- Rollback: Revert by task if needed
- Automation: Tools can parse the ID

**Subagent checklist before commit**:
- [ ] Message title contains `(TASK-<timestamp>)`
- [ ] Using correct type (feat/fix/docs/style/refactor)
- [ ] Description is clear and concise

**Tags**: Use semantic versioning after user confirms "LGTM"
```bash
git tag -a v0.1.0 -m "feat: description"
```

## Best Practices

### Epic Writing

- Use **Workflowy-style** tree structure
- Record **trigger events** (why did this need arise?)
- Include **screenshots** for UI feedback
- Update status as work progresses

### ADR Writing

- Document **rejected options** too (why not X?)
- Include **consequences** (what happens after this decision?)
- Link related ADRs (superseded by, depends on)

### Task Writing

- Clear **acceptance criteria** (checklist)
- Specific **file paths** to modify/create
- Suggested **git commit message**
- **Checkpoint updates** with timestamps

## Templates

See `assets/` directory for:
- `ADR-TEMPLATE.md`
- `EPIC-TEMPLATE.md`
- `TASK-TEMPLATE.md`

## Example Workflow

```
User: "Add real-time data feature"

1. Create Epic: cortex/epics/01-active/EPIC-20250420120100000-realtime.md
   └─ Background: Need real-time updates
   └─ Requirements: SSE, backend job, UI updates

2. Create ADRs:
   cortex/adr/01-proposed/ADR-20250420120200000-sse-vs-websocket.md → accepted/
   cortex/adr/01-proposed/ADR-20250420120200001-background-job.md → accepted/

3. Create Tasks:
   cortex/tasks/01-backlog/TASK-20250422143321029-sse-endpoint.md
   cortex/tasks/01-backlog/TASK-20250422143321030-data-generator.md

4. Delegate to subagents

5. User confirms: "LGTM" → git tag v0.3.0

6. Archive Epic to cortex/epics/02-archived/
```

## Tips

- Keep Epics **high-level** (the story)
- Keep ADRs **focused** (one decision per ADR)
- Keep Tasks **actionable** (specific steps)
- Use **checklists** for all acceptance criteria
- **Timestamp** all progress updates
- **Link** related items (Task ↔ Epic ↔ ADR)
- **Use numeric prefixes** for task/epic/adr directories (GTD workflow ordering)


---

## Wiki 知识库（可选增强）

在 ADR/Epic/Task 之外，可选增加 **Wiki** 系统沉淀成功经验：

```
Task 执行 → LGTM确认 → 沉淀为 Wiki → 未来 Task 参考
    │            │            │              │
    ▼            ▼            ▼              ▼
 具体工作      成功验证     抽象总结       快速检索
```

### Wiki 类型

| 类型 | 用途 | 示例 |
|------|------|------|
| **Pattern** | 可复用的解决方案 | CSS Flex 对齐模式 |
| **FAQ** | 常见问题解答 | 为什么 Grid 挤压标签 |
| **Lesson** | 经验教训总结 | Epic 回顾 |

### 使用场景

执行新 Task 前，检索 Wiki：

```bash
# 搜索相关 Pattern
ls cortex/wiki/01-patterns/ | grep layout

# 查看解决方案
cat cortex/wiki/01-patterns/css-flex-alignment.md
```

发现已有解决方案，直接在 Task 中引用：

```markdown
## Technical Approach

参考 cortex/wiki/01-patterns/css-flex-alignment.md：
使用 Flex + 固定宽度实现对齐...
```

### 沉淀原则

- **成功后才沉淀** - 需要 LGTM 确认
- **链接回源** - 始终关联 Task/Epic
- **搜索友好** - 清晰的文件名和标题

### 完整工作流

```
┌─────────────────────────────────────────────────────────────┐
│                  ENHANCED WORKFLOW                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📋 EPIC    🏛️ ADR    📄 TASK    ✅ LGTM    📚 WIKI        │
│   (Why)    (How)    (What)   (Verify)   (Knowledge)       │
│                                                             │
│     ↓         ↓         ↓         ↓          ↓            │
│  需求来源   技术决策   具体执行   验证成功    知识沉淀       │
│                                                             │
│  └───────────────────────────────────────┘                │
│              沉淀成功经验到 Wiki                           │
│                                                             │
│  ┌───────────────────────────────────────┐                │
│              未来 Task 检索参考                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```


---

## Session Handoff (Important!)

### When to Handoff

Update `HANDOFF.md` when:
- User says "let's continue tomorrow" / "先这样"
- Conversation exceeds 50 rounds
- User explicitly asks for handoff
- Long pause (possible session change)

### Handoff Document

**Location**: `HANDOFF.md` in project root

**Purpose**: Record latest state for next session

**Contents**:
- Last update time
- Epic/Task status summary
- Open issues
- Warnings for new subagent
- Startup checklist

### Handoff Process

```
User signals end → Update HANDOFF.md → Brief summary → New session reads HANDOFF.md
```

### Template

Copy this to your project root as `HANDOFF.md` and customize:

```markdown
# Session Handoff

> Record latest state when session ends, ensure smooth handoff to new session.

## Last Updated

- Date: YYYY-MM-DD
- Session Rounds: XX

## Current Epics

| Epic | Status | Key Progress |
|------|--------|--------------|
| EPIC-XXX | status | description |

## Key Tasks

### Completed
- TASK-XXX: description

### In Progress
- TASK-XXX: description + blockers

### Backlog
- TASK-XXX: description

## Open Issues

1. Issue description
2. Issue description

## Warnings for New Subagent

- Past mistake to avoid
- Critical check points

## Quick Links

- Current version: v0.X.X
- Branch: main
- Important files: AGENTS.md

## Startup Checklist

New subagent should:
- [ ] Read HANDOFF.md
- [ ] Check tasks/backlog/
- [ ] Check epics/active/
- [ ] Run status command
- [ ] Confirm with user if unclear
```

Quick start:
```bash
cp ./assets/HANDOFF-TEMPLATE.md HANDOFF.md
# Customize with current state
```

### 实际项目示例

查看当前项目的 `HANDOFF.md` 作为参考模板。

### For New Subagent

Always read `HANDOFF.md` first when starting new session!

Then:
1. Check `cortex/tasks/01-backlog/` for pending work (数字前缀排序)
2. Run `bunx @lythos/project-cortex stats`
3. Confirm with user if anything unclear

---

## Tips

- Keep Epics **high-level** (the story)
- Keep ADRs **focused** (one decision per ADR)
- Keep Tasks **actionable** (specific steps)
- Use **checklists** for all acceptance criteria
- **Timestamp** all progress updates
- **Handoff** properly when session ends

## 相关 Skill

- **lythoskill-project-scribe** — Session 记忆存档。如果项目使用 scribe，cortex 的 task/epic 状态会被 scribe 的 handoff 引用，但**不强制依赖**。cortex 独立运行，scribe 只是在其存在时顺手读取活跃 task 列表用于交接。
- **lythoskill-project-onboarding** — 项目入职复盘。如果项目使用 onboarding，新 session 会读取 scribe 产出的 handoff 来获取 cortex 任务状态，但**不强制依赖**。cortex 的 INDEX.md 和 task 目录本身就是自描述的，任何 agent 都能直接探索。