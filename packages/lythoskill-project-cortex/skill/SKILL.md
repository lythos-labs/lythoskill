---
name: lythoskill-project-cortex
description: |
  GTD-style project management for lythoskill projects.
  Cortex workflow: ADR + Epic + Task + Wiki with timestamp IDs.
  Thin skill wrapper around @lythos/project-cortex npm package.
---

# lythoskill-project-cortex

A project management skill for lythoskill monorepos. Uses timestamp-based IDs
(`PREFIX-yyyyMMddHHmmssSSS`) to avoid ID collision without a central database.

## Prerequisites

- Bun runtime (scripts use `bunx`)
- `@lythos/project-cortex` published to npm (or available via workspace link)

## Scripts

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

### List Items
```bash
bunx @lythos/project-cortex list   # list tasks
bunx @lythos/project-cortex stats  # project statistics
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
│   ├── 01-proposed/
│   ├── 02-accepted/
│   ├── 03-rejected/
│   └── 04-superseded/
├── epics/
│   ├── 01-active/
│   └── 02-archived/
├── tasks/
│   ├── 01-backlog/      # Capture + Clarify
│   ├── 02-in-progress/  # Engage
│   ├── 03-review/       # 待验收
│   ├── 04-completed/    # 正常完成
│   ├── 05-suspended/    # 悬置/阻塞（可恢复）
│   ├── 06-terminated/   # 终止/取消（非正常结束）
│   └── 07-archived/     # 最终归档
└── wiki/
    ├── 01-patterns/
    ├── 02-faq/
    └── 03-lessons/
```

## ID Format

All items use timestamp IDs:
- Task: `TASK-20250420120000000`
- Epic: `EPIC-20250420120100000`
- ADR:  `ADR-20250420120200000`

Format: `PREFIX-yyyyMMddHHmmssSSS` (17 digits)
