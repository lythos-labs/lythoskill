# Session Handoff Template

Copy this to your project root as `HANDOFF.md` and customize.

This template is designed based on arena experiment findings:
- File exploration alone recovers ~70% of context (project identity, task content, decisions)
- Scribe's value is capturing the ~30% that exploration CANNOT recover
- **Pitfalls, true working-tree state, and specific next steps** are the critical gaps

---

---
type: handoff
created_at: YYYY-MM-DDTHH:mm:ss
session_rounds: 0
git_branch: main
git_commit: abc1234
---

# Handoff: <一句话描述当前进行中的任务>

## 1. 项目身份（Project Identity）

> 文件探索可恢复，但提供快速确认

- **项目名称**: xxx
- **类型**: xxx（如 thin-skill monorepo / web app / CLI tool）
- **技术栈**: Runtime + Package Manager + Module System
- **当前分支**: `main`
- **最近 commit**: `abc1234` — commit message

## 2. 本次 Session 做了什么（Session Work）

> 浓缩版本，减少下一个 agent 的探索成本

### 已完成的修改

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `path/to/file` | add / modify / delete | 做了什么 |

### 创建的 artifacts（非 working tree）

> ⚠️ 如果这些文件不在 git working tree 中，明确说明它们的位置和用途

| 文件 | 位置 | 说明 |
|------|------|------|
| `report.md` | `playground/test-runs/xxx/` | 实验报告，非提交目标 |

## 3. 关键决策（Decisions）

| 决策 | 考虑过的选项 | 最终选择 | 理由 |
|------|-------------|---------|------|
| 选 A 还是 B | A, B, C | A | 为什么 |

## 4. 踩过的坑与修正（Pitfalls & Corrections）⭐

> **这是文件探索永远无法恢复的部分。必须记录。**
> 下一个 agent 看不到你走过的弯路，只会看到最终结果。

### 坑 1: <简短描述>

- **错误尝试**: 我做了什么，导致了什么问题
- **正确做法**: 最终怎么解决的
- **根因**: 为什么会走弯路
- **浪费 time**: X 分钟

### 坑 2: <简短描述>

- **错误尝试**:
- **正确做法**:
- **根因**:
- **浪费 time**:

## 5. 真实状态（Ground Truth State）⭐

> **防止 hallucination 的核心 section**
> 明确区分：committed / unstaged / untracked / 仅存在于 artifact 中

| 文件 | 状态 | 说明 |
|------|------|------|
| `skill-deck.toml` | ✅ committed | combo section 已提交 |
| `README.md` | 📝 unstaged | 文档更新，待提交 |
| `HANDOFF.md` | 🆕 untracked | 本文件，session 交接用 |
| `playground/xxx.diff` | 📦 artifact only | 仅存在于实验目录，不在 working tree |

### 环境状态

- **Node/Bun 版本**: bun 1.x.x
- **依赖是否最新**: 是 / 否（如否，说明需要 pnpm install）
- **是否有运行中的进程**: 无 / 有（如有，说明 PID 和如何停止）

## 6. 下一步（Next Steps）⭐ 具体、可执行

> 不要写"测试一下"或"看看有没有问题"
> 要写"运行 `bun xxx` 验证 YYY"或"修改 `path/to/file` 中的 ZZZ"

1. **<具体动作>**: 运行 `bun packages/xxx/src/cli.ts link` 验证 combo 解析是否正常
2. **<具体动作>**: 在 `README.md` 第 N 行添加 Quick Start 中的 combo 使用示例
3. **<具体动作>**: 创建 `packages/lythoskill-meta-governance/skill/SKILL.md` 以验证 combo 模式
4. **<可选>**: ...

## 7. 接手自检（Handoff Checklist）

> 新 agent 应该先验证这些，确认 handoff 信息没有过时

- [ ] `git status` 输出与 Ground Truth State 一致
- [ ] `git log --oneline -3` 与记录的最近 commit 匹配
- [ ] 运行 `<验证命令>` 确认环境正常
- [ ] 阅读本 handoff 后，不需要重新探索目录结构即可开始工作

---

*Updated by project-scribe during session handoff*
*Next agent should read this file BEFORE exploring the repository*
