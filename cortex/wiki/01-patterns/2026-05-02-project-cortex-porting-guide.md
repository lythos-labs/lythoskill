# Pattern: Porting a Skill to lythoskill — project-cortex Example

> 状态: 🔄 实践中 | 以 project-cortex 迁移为例

## 背景

project-cortex 原本是一个独立的 skill，直接放在 `~/.claude/skills/project-cortex/` 下，包含：

```
~/.claude/skills/project-cortex/
├── SKILL.md                 # 技能描述（旧编号风格）
├── scripts/
│   ├── task-cli.ts          # 创建 Task/Epic/ADR 的 CLI
│   ├── generate-index.ts    # 生成项目索引
│   └── init-workflow.sh     # 初始化工作流目录
└── assets/
    ├── ADR-TEMPLATE.md
    ├── EPIC-TEMPLATE.md
    └── TASK-TEMPLATE.md
```

问题：
1. **开发态与发布态混在一块**：源码、模板、脚本全挤在 skill 目录里
2. **版本治理靠手工**：没有 semver，没有依赖管理
3. **无 build pipeline**：改完代码直接 copy 到 `~/.claude/skills/`，容易把测试文件、dev 配置带进去
4. **编号风格不一致**：文档里用 `ADR-001`，CLI 已经改成了时间戳

## 移植目标

用 lythoskill 的 Thin Skill Pattern 重新组织：

```
lythoskill/
├── packages/
│   └── lythoskill-project-cortex/    # npm 包：实现层
│       ├── package.json              # bin: lythoskill-project-cortex
│       ├── tsconfig.json
│       └── src/
│           ├── cli.ts                # 命令路由（task / epic / adr / index）
│           ├── task-cli.ts           # 创建 Task/Epic/ADR（原逻辑）
│           ├── generate-index.ts     # 生成 INDEX.md（原逻辑，适配时间戳）
│           └── init-workflow.ts      # 初始化目录（原 init-workflow.sh）
│
├── skills/
│   └── lythoskill-project-cortex/    # Skill 层：极薄的路由
│       ├── SKILL.md                  # Agent 可见的意图描述
│       └── scripts/
│           ├── task.sh               # bunx lythoskill-project-cortex task "..."
│           ├── epic.sh               # bunx lythoskill-project-cortex epic "..."
│           ├── adr.sh                # bunx lythoskill-project-cortex adr "..."
│           ├── init.sh               # bunx lythoskill-project-cortex init
│           └── index.sh              # bunx lythoskill-project-cortex index
│
└── dist/
    └── lythoskill-project-cortex/    # build 输出
        ├── SKILL.md
        └── scripts/
```

## 三层拆解

### Layer 1: Starter (packages/lythoskill-project-cortex/)

**职责**：所有实现逻辑、依赖治理、CLI 入口。

```json
// package.json
{
  "name": "@lythos/project-cortex",
  "version": "0.1.0",
  "type": "module",
  "bin": {
    "lythoskill-project-cortex": "./src/cli.ts"
  },
  "files": ["src"]
}
```

```typescript
// src/cli.ts — 命令路由
const command = process.argv[2]
switch (command) {
  case 'task':  // 委托 task-cli.ts
  case 'epic':
  case 'adr':
  case 'init':
  case 'index':
  // ...
}
```

这里放原 project-cortex 的全部 TS 实现：
- `task-cli.ts`：时间戳 ID 生成器 + 文件模板
- `generate-index.ts`：扫描 cortex 目录生成 INDEX.md（需适配 `\d{17}` 时间戳正则）
- `init-workflow.ts`：创建 `cortex/{adr,epics,tasks,wiki}/` 目录结构

**零外部依赖**：只用 `node:fs`、`node:path`，保持 lythoskill 零依赖原则。

### Layer 2: Skill (skills/lythoskill-project-cortex/)

**职责**：仅保留 SKILL.md + 薄脚本。脚本里不写逻辑，只写 `bunx @lythos/project-cortex <cmd>`。

```markdown
<!-- SKILL.md -->
---
name: lythoskill-project-cortex
description: |
  GTD-style project management for lythoskill projects.
  Cortex workflow: ADR + Epic + Task + Wiki with timestamp IDs.
---

# lythoskill-project-cortex

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
```bash
bunx @lythos/project-cortex init
```

### Generate Index
```bash
bunx @lythos/project-cortex index
```
```

```bash
# scripts/task.sh
#!/bin/bash
bunx @lythos/project-cortex task "$@"
```

 Skill 层不知道 `task-cli.ts` 的存在，也不知道时间戳怎么生成。它只知道："有一个 npm 包叫 `@lythos/project-cortex`，run 它就完事了。"

### Layer 3: Dist (dist/lythoskill-project-cortex/)

**职责**：发布给 agent 的最终产物。

由 `bunx lythoskill build lythoskill-project-cortex` 自动生成：

1. 读取 `skills/lythoskill-project-cortex/`
2. 验证 `SKILL.md` 有 `---` frontmatter
3. 过滤掉 `__tests__`、`.DS_Store`、`.test.ts` 等 dev 文件
4. 输出到 `dist/lythoskill-project-cortex/`

agent 最终看到的只有：
```
dist/lythoskill-project-cortex/
├── SKILL.md
└── scripts/
    ├── task.sh
    ├── epic.sh
    ├── adr.sh
    ├── init.sh
    └── index.sh
```

## 关键改动清单

| 原 project-cortex | lythoskill 模式 | 说明 |
|---|---|---|
| `scripts/task-cli.ts` 直接放 skill 目录 | 移到 `packages/.../src/` | 重逻辑进 npm 包 |
| `assets/*.md` 模板硬编码 | 模板字符串内嵌到 `src/task-cli.ts` | 零外部文件依赖 |
| `init-workflow.sh` bash 脚本 | 改写成 `src/init-workflow.ts` | ESM-only，Bun 原生运行 |
| `generate-index.ts` 匹配 `\d+` | 改为匹配 `\d{17}` 时间戳 | 与 task-cli.ts 保持一致 |
| 编号示例 `ADR-001` | 全部改为 `ADR-yyyyMMddHHmmssSSS` | 文档与代码一致 |
| `.task-id-db.json` 自增 ID | 删除，改用时间戳 | 无需状态文件 |
| skill 目录混合代码+文档 | 严格三层分离 | Starter / Skill / Dist |

## 开发工作流

```bash
# 1. 改实现（packages 层）
vim packages/lythoskill-project-cortex/src/task-cli.ts

# 2. 本地验证（Bun 直接跑 TS，无编译）
bun packages/lythoskill-project-cortex/src/cli.ts task "测试"

# 3. build 发布产物
bunx lythoskill build lythoskill-project-cortex

# 4. 检查 dist/
ls dist/lythoskill-project-cortex/
# → SKILL.md + scripts/ （干净，无源码）
```

## 为什么这样分

| 问题 | 解决方式 |
|---|---|
| 改代码时不小心把测试文件带进 skill | `build` 命令显式过滤 dev 文件 |
| 多个 skill 依赖同一个工具函数 | 抽成 npm 包，skill 只保留 router |
| 想给 project-cortex 加新命令 | 改 `packages/.../src/cli.ts`，Skill 层不需要动 |
| 用户环境不干净 | `bunx` 按需拉包，无需全局安装 |
| 技能文档与实现版本不一致 | Skill 层 immutable，npm 包版本独立演进 |

## 相关

- ADR-20260423101938000: Thin Skill Pattern 决策记录
- Wiki: thin-skill-pattern.md — 通用模式说明
- EPIC-20260423102000000: lythoskill MVP（含 project-cortex 迁移任务）
