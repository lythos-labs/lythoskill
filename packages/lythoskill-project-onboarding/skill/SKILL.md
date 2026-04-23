---
name: lythoskill-project-onboarding
description: |
  项目入职复盘 — AI 进入项目时的自动复盘流程。

  基于 KV Cache 优化的加载顺序（稳定→多变）：
  Layer 1: 元技能 (AGENTS.md, ONBOARDING.md) → Layer 2: 领域知识 (P0 必读) → Layer 3: 任务状态 (quest status)

  触发词："先复盘"、"了解项目"、"看看历史"

type: standard
---

# 项目入职复盘

## 核心原则

> **AGENTS.md 是 SSOT，加载顺序基于 KV Cache 优化（稳定→多变）**

## 复盘流程（分层加载）

### Layer 1: 元技能 (最稳定)

```bash
# 长期缓存内容，项目启动期后极少修改
cat AGENTS.md
cat .agents/ONBOARDING.md
cat .agents/llm-notes/README.md
```

**获取：**
- 怎么工作 (元技能)
- 工作原则
- 索引结构

### Layer 2: 领域知识 (较稳定)

```bash
# 中期缓存内容，偶尔修改
cat .agents/llm-notes/project-specific/common-pitfalls.md
cat .agents/llm-notes/project-specific/user-collaboration-sop.md
cat .agents/llm-notes/agent-specific/kimi/self-observation-*.md
```

**获取：**
- 已知陷阱
- 协作 SOP
- 模型观察

### Layer 3: 任务状态 (多变)

```bash
# 每次加载，无缓存
quest status
```

**获取：**
- 当前版本
- 进行中的任务
- 今日待办
- 活跃风险

## 输出格式

```
已复盘项目上下文：

📋 项目：xxx（技术栈）
📌 版本：vX.Y.Z（git: hash）← Layer 3
📈 最近：最近 1-3 个变更 ← Layer 3
⚠️  坑点：关键陷阱 1-2 个 ← Layer 2
🎯 当前：进行中的任务 ← Layer 3
💡 待办：今日待办 ← Layer 3

详细历史：daily/YYYY/MM/YYYY-MM-DD.md
当前任务：docs/guide/current-quest.md
AI 知识：.agents/llm-notes/README.md

有什么可以帮你的？
```

## 正交分离

| 文档 | 层级 | 内容 | 修改频率 |
|-----|------|------|---------|
| ONBOARDING.md | Layer 1 | 怎么工作 | 极低 |
| common-pitfalls | Layer 2 | 已知陷阱 | 低 |
| quest status | Layer 3 | 现在做什么 | 高 |

**原则：** ONBOARDING.md 不包含"当前进度"，只包含"怎么工作"。

## 检查清单

- [ ] Layer 1: 读取元技能 (AGENTS.md, ONBOARDING.md)
- [ ] Layer 2: 读取领域知识 (P0 必读)
- [ ] Layer 3: 读取任务状态 (quest status)
- [ ] 输出复盘摘要

## 相关文档

- SSOT: AGENTS.md（项目根目录）
- 元技能: .agents/ONBOARDING.md
- 知识索引: .agents/llm-notes/README.md
