# EPIC-20260501091716524: Onboarding friction reduction — boost README and AGENTS.md UX from 6.5 to 8.5

> Onboarding friction reduction — boost README and AGents.md UX from 6.5 to 8.5.

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| active | 2026-05-01 | Created from subagent onboarding UX test |

## 背景故事

2026-05-01，通过 subagent 模拟全新 AI agent 进入项目，执行了完整的 onboarding 测试（读 README → 读 AGENTS.md → 执行命令 → 评估阻抗）。

测试结论：
- **综合阻抗 6.5/10** — 概念解释满分，但存在多个"仅需 30 秒即可修复"的摩擦点
- **7 个核心命令中 6 个一次通过** — 文档与代码基本同步
- **最大痛点**：开发者刚 clone 仓库后，README Quick Start 只有 `bunx` 用户视角，没有开发者分支

目标：通过 7 个低成本的文档和 CLI 修复，把 onboarding 阻抗从 6.5 提升到 8.5+。

## 需求树

### README Quick Start 双入口 #backlog
- **触发**: 新开发者 clone 仓库后，README 只有 `bunx @lythos/...` 命令，本地跑不通
- **需求**: Quick Start 明确区分"终端用户"和"开发者"两个入口
- **实现**: README 中 Quick Start 增加 `### For developers (you just cloned this repo)` 分支
- **产出**: README.md 修改
- **验证**: 新 subagent 能在 3 分钟内找到开发者入口

### README 前置条件 #backlog
- **触发**: "Zero install" 表述误导，实际开发需要 Bun + pnpm
- **需求**: 在 README 开头或 Quick Start 前列出 Prerequisites
- **实现**: 增加 `**Prerequisites:** Bun ≥1.0, pnpm ≥8.0`
- **产出**: README.md 修改
- **验证**: 新来者不再困惑是否需要 `npm install`

### AGENTS.md HANDOFF-TEMPLATE 路径补全 #backlog
- **触发**: AGENTS.md 提到 `HANDOFF-TEMPLATE.md` 但没给路径，新 agent 找 30 秒
- **需求**: 补全绝对路径或相对路径
- **实现**: 改为 `skills/lythoskill-project-cortex/HANDOFF-TEMPLATE.md`
- **产出**: AGENTS.md 修改
- **验证**: 新 agent 能直接定位文件

### deck link 输出文案优化 #backlog
- **触发**: `8/10 skills` 被误解为"丢了 2 个"，实际是 `max_cards = 10`
- **需求**: 输出文案消除歧义
- **实现**: 改为 `8 skill(s) linked (max_cards: 10)`
- **产出**: `packages/lythoskill-deck/src/link.ts` 输出修改
- **验证**: 新用户不再困惑

### init 命令副作用预警 #backlog
- **触发**: `init <name>` 直接在当前目录创建文件夹，无预警
- **需求**: 文档和 CLI 都提示副作用
- **实现**: README/AGENTS.md 加提示 + CLI 执行前打印确认
- **产出**: README.md、AGENTS.md、`packages/lythoskill-creator/src/init.ts` 修改
- **验证**: 新用户不会意外污染工作区

### AGENTS.md 命令失败提示 #backlog
- **触发**: `bunx @lythos/...` 在开发环境失败时，文档没有告诉用户换 `bun packages/...`
- **需求**: 增加 troubleshooting 提示
- **实现**: Common Commands 章节顶部增加提示
- **产出**: AGENTS.md 修改
- **验证**: 新 agent 能自助解决命令失败

### deck CLI status 子命令 #backlog
- **触发**: `skills/lythoskill-deck/scripts/deck-status.sh` 存在，但 CLI 本身不支持 `status`
- **需求**: CLI 路由增加 `status` 子命令
- **实现**: `packages/lythoskill-deck/src/cli.ts` 增加 case 'status'
- **产出**: `packages/lythoskill-deck/src/cli.ts` 修改
- **验证**: `bun packages/lythoskill-deck/src/cli.ts status` 正常输出

## 技术决策

| ADR | 标题 | 状态 |
|-----|------|------|
| ADR-20260423130348396 | deck 治理移植 | accepted |
| ADR-20260423182606313 | Template Variable Substitution | accepted |

## 关联任务

| 任务 | 状态 | 描述 |
|------|------|------|
| TASK-20260501091722647 | backlog | README Quick Start: add developer branch for repo clone context |
| TASK-20260501091724005 | backlog | README: add Prerequisites section (Bun + pnpm) at top |
| TASK-20260501091725299 | backlog | AGENTS.md: fix HANDOFF-TEMPLATE.md missing path |
| TASK-20260501091726708 | backlog | deck link output: clarify 8/10 skills wording to avoid confusion |
| TASK-20260501091727690 | backlog | init command: add side-effect warning in docs and CLI prompt |
| TASK-20260501091728793 | backlog | AGENTS.md: add bunx vs local path troubleshooting hint |
| TASK-20260501091729644 | backlog | deck CLI: add status subcommand routing |

## 经验沉淀

## 归档条件
- [ ] 所有任务完成
- [ ] 重新运行 onboarding subagent 测试，综合评分 ≥ 8.5
