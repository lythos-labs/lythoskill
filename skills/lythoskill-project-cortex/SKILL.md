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
  
  **Key Feature**: Numeric prefixes (01-inbox, 02-backlog, etc.) ensure directories 
  appear in GTD workflow order in file listings.
---

# Project Cortex: ADR + Epic + Task + Wiki

> **核心原则: 自动化优于记忆 (Automation > Memory)**
>
> 不要依赖记忆，使用自动化脚本确保一致性：
> - `task-cli.ts` - 自动分配 ID，避免冲突
> - `generate-index.ts` - 自动生成项目索引
> - `.task-id-db.json` - 自增 ID 数据库

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

## Directory Structure

```
project/
├── cortex/adr/
│   ├── ADR-TEMPLATE.md
│   ├── 01-proposed/        # Proposed ADRs
│   ├── 02-accepted/        # Accepted ADRs
│   ├── 03-rejected/        # Rejected ADRs
│   └── 04-superseded/      # Superseded ADRs
├── cortex/wiki/
│   ├── README.md
│   ├── 01-patterns/        # Reusable solutions
│   ├── 02-faq/             # Common questions
│   └── 03-lessons/         # Retrospectives
├── cortex/epics/
│   ├── EPIC-TEMPLATE.md
│   ├── 01-active/          # Active epics
│   └── 02-archived/        # Archived epics
├── cortex/tasks/                   # GTD workflow (数字前缀排序)
│   ├── 01-inbox/           # Capture - 新想法
│   ├── 02-backlog/         # Clarify - 待办任务
│   ├── 03-in-progress/     # Engage - 进行中
│   ├── 04-review/          # 待验收
│   ├── 05-completed/       # 已完成
│   └── 06-archived/        # 归档
├── build/
│   └── coverage/           # Coverage reports
└── skills/lythoskill-project-cortex/  (this skill)
```

**Note**: 使用数字前缀（01-, 02-）确保目录按 GTD 流程排序显示。

## Quick Start

### 1. Initialize Workflow

```bash
# Create directory structure
mkdir -p cortex/adr/{01-proposed,02-accepted,03-rejected,04-superseded}
mkdir -p cortex/wiki/{01-patterns,02-faq,03-lessons}
mkdir -p cortex/epics/{01-active,02-archived}
mkdir -p cortex/tasks/{01-inbox,02-backlog,03-in-progress,04-review,05-completed,06-archived}

# Copy templates
cp ./assets/ADR-TEMPLATE.md cortex/adr/
cp ./assets/EPIC-TEMPLATE.md cortex/epics/
cp ./assets/TASK-TEMPLATE.md cortex/tasks/
```

### 2. Start with an Epic

Create `cortex/epics/01-active/EPIC-001-feature-name.md`:

```markdown
# EPIC-001: Feature Description

## Background Story
Why does this feature exist? What problem does it solve?

## Requirement Tree

### User Story #in-progress
- **Trigger**: What event triggered this need?
- **Requirement**: What needs to be built?
- **Implementation**: How was it solved?
- **Output**: TASK-XXX
- **Validation**: How to verify?

## Related Tasks
| Task | Status | Description |
|------|--------|-------------|
| TASK-001 | ⬜ | ... |

## Lessons Learned

## Archive Criteria
- [ ] All tasks completed
- [ ] Validated in production
```

### 3. Make Technical Decisions (ADR)

When facing technical choices, create an ADR in `cortex/adr/01-proposed/`:

```bash
# Create ADR
cat > cortex/adr/01-proposed/ADR-001-technology-choice.md << 'EOF'
# ADR-001: Technology Choice

## Status
- [ ] Proposed
- [ ] Accepted
- [ ] Rejected
- [ ] Superseded

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
EOF
```

Move to `cortex/adr/02-accepted/` once decided.

### 4. Create and Delegate Tasks

From Epic or ADR, create executable tasks in `cortex/tasks/02-backlog/`:

```bash
cat > cortex/tasks/02-backlog/TASK-001-specific-work.md << 'EOF'
# TASK-001: Specific Work

## Status
- [x] backlog

## Background
Link to EPIC-001 / ADR-001

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
feat(scope): description (TASK-001)

- Detail 1
- Detail 2
```
EOF
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

- [ ] 不在本次范围的功能 X → 移至 TASK-XXX
- [ ]  perfectionism 陷阱："更好"但不是"必须"的 Y → 明确放弃

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
Please execute: cortex/tasks/02-backlog/TASK-001-specific-work.md

Steps:
1. Move to cortex/tasks/03-in-progress/
2. Implement according to requirements
3. Update progress with timestamps
4. Commit with "(TASK-001)" in message
5. Move to cortex/tasks/04-review/
```

## Workflow Rules

### Role Separation

| Role | Permissions | Directories |
|------|-------------|-------------|
| **System (You)** | Create Epics/ADRs, archive completed | `cortex/epics/01-active/`, `cortex/adr/02-accepted/`, `cortex/tasks/05-completed/` |
| **Subagent** | Execute tasks, update progress | `cortex/tasks/03-in-progress/`, `cortex/tasks/04-review/` |

### Status Flow

```
Epic:    01-active → 02-archived (when criteria met)
ADR:     01-proposed → 02-accepted/03-rejected/04-superseded
Task:    02-backlog → 03-in-progress → 04-review → 05-completed → 06-archived
```

### Git Integration (⚠️ Critical)

**Commits MUST include task ID**: `(TASK-XXX)` in commit message title

✅ Good: `git commit -m "feat(api): add endpoint (TASK-001)"`  
❌ Bad:  `git commit -m "feat(api): add endpoint"`

**Why required**:
- Traceability: Link code changes to tasks
- Audit: Easy to find related commits
- Rollback: Revert by task if needed
- Automation: Tools can parse the ID

**Subagent checklist before commit**:
- [ ] Message title contains `(TASK-XXX)`
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

1. Create Epic: cortex/epics/01-active/EPIC-002-realtime.md
   └─ Background: Need real-time updates
   └─ Requirements: SSE, backend job, UI updates

2. Create ADRs:
   cortex/adr/ADR-001-sse-vs-websocket.md → accepted/
   cortex/adr/ADR-002-background-job.md → accepted/

3. Create Tasks:
   cortex/tasks/TASK-005-sse-endpoint.md
   cortex/tasks/TASK-006-data-generator.md

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
ls cortex/wiki/patterns/ | grep layout

# 查看解决方案
cat cortex/wiki/patterns/css-flex-alignment.md
```

发现已有解决方案，直接在 Task 中引用：

```markdown
## Technical Approach

参考 cortex/wiki/patterns/css-flex-alignment.md：
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

## CLI 工具 (Hexo-like)

Skill 提供命令行工具来自动化常见操作：

### 可用命令

```bash
# 初始化工作流
bash ./scripts/init.sh

# 创建 Task（自动分配 ID，放入 02-backlog/）
bunx @lythos/project-cortex task "修复登录bug"
# 输出: ✅ Created: cortex/tasks/02-backlog/TASK-009-fix-login-bug.md

# 创建 Epic
bunx @lythos/project-cortex epic "用户认证系统"

# 创建 ADR
bunx @lythos/project-cortex adr "选择数据库方案"

# 查看项目统计
bunx @lythos/project-cortex stats

# 查看下一个可用 ID
bunx @lythos/project-cortex next-id

# 生成索引页面 (类似 Hexo)
bunx @lythos/project-cortex index
# 生成: INDEX.md, wiki/INDEX.md
```

### 自增 ID 数据库

`.task-id-db.json`:

```json
{
  "lastTaskId": 10,
  "lastEpicId": 3,
  "lastAdrId": 5,
  "tasks": [
    {"id": "TASK-001", "title": "...", "status": "completed", "createdAt": "..."}
  ]
}
```

自动维护 ID 递增，避免冲突。

### 生成的索引

`INDEX.md`:

```markdown
# Project Index

## 概览
| 类型 | 总数 | 状态 |

## Epics
- **EPIC-001**: 大屏优化

## Tasks
- [ ] **TASK-010**: 新功能
- ✅ ~~TASK-001~~: 已完成

## ADRs
- ✅ **ADR-001** (accepted): SSE 方案
```

类似 Hexo 的归档页面，自动生成项目全貌。


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

See `HANDOFF-TEMPLATE.md` for full template.

Quick start:
```bash
cp ./HANDOFF-TEMPLATE.md HANDOFF.md
# Customize with current state
```

### 实际项目示例

查看当前项目的 `HANDOFF.md` 作为参考模板。

### For New Subagent

Always read `HANDOFF.md` first when starting new session!

Then:
1. Check `cortex/tasks/02-backlog/` for pending work (数字前缀排序)
2. Run `bun run scripts/task-cli.ts stats`
3. Confirm with user if anything unclear

---

## Tips

- Keep Epics **high-level** (the story)
- Keep ADRs **focused** (one decision per ADR)
- Keep Tasks **actionable** (specific steps)
- Use **checklists** for all acceptance criteria
- **Timestamp** all progress updates
- **Handoff** properly when session ends
