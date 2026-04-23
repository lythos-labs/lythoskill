---
name: lythoskill-project-onboarding
description: |
  项目入职复盘 — AI 进入项目时的自动复盘流程。

  核心理念：不要重新探索文件系统来"回忆"上下文。如果上一个 session 产出了 Handoff，直接读取。
  只有当 Handoff 不存在或明显过时时，才降级为文件系统探索。

  基于 KV Cache 优化的加载顺序（稳定→多变）：
  Layer 1: 元技能 (AGENTS.md, HANDOFF-TEMPLATE.md) → Layer 2: 当前状态 (HANDOFF.md) → Layer 3: 验证 (git status)

  触发词："先复盘"、"了解项目"、"看看历史"、"接手这个任务"、"继续之前的工作"

type: standard
---

# 项目入职复盘

## 核心原则

> **优先读取 Handoff，避免重复探索。加载顺序基于 KV Cache 优化（稳定→多变）**
>
> 上一个 agent 通过 project-scribe 产出的 `HANDOFF.md` 已经包含了文件探索无法恢复的信息。
> 新 agent 如果重新探索，会浪费 token 且可能 hallucination。

## 复盘流程（分层加载）

### Layer 1: 元技能 (最稳定，长期缓存)

```bash
# 项目启动期后极少修改
cat CLAUDE.md
cat HANDOFF-TEMPLATE.md  # 了解 handoff 结构
```

**获取：**
- 怎么工作 (元技能)
- 工作原则
- 项目架构

### Layer 2: 当前状态 (Handoff，每次加载)

```bash
# 如果存在 Handoff，这是最重要的信息源
cat playground/HANDOFF.md 2>/dev/null || echo "无活跃 Handoff"
```

**判断 Handoff 是否可用：**
- ✅ **可用**：存在 `playground/HANDOFF.md`，且 `created_at` 在合理范围内
- ⚠️ **可能过期**：Handoff 存在但 `session_rounds` 很少，或 `git_commit` 与当前 HEAD 不符
- ❌ **不可用**：Handoff 不存在或明显 stale

**如果 Handoff 可用：**
- 直接读取 Handoff 获取上下文
- 跳到 Layer 3 验证 Ground Truth State
- **不需要**重新探索 `cortex/`、`skills/` 等目录

**如果 Handoff 不可用：**
- 降级为文件系统探索（见下方的"降级探索路径"）

### Layer 3: 验证 (Ground Truth)

```bash
# 无论 Handoff 是否存在，都必须验证
git status
git log --oneline -5
```

**验证清单：**
- [ ] `git status` 输出与 Handoff 中的 Ground Truth State 一致
- [ ] `git log --oneline -5` 与 Handoff 中记录的最近 commit 匹配
- [ ] 如果 Handoff 说某个文件已提交，确认它在 HEAD 中
- [ ] 如果 Handoff 说某个文件未提交，确认它在 working tree 中

**如果验证失败（Handoff 与 git 状态不一致）：**
- Handoff 已过期，标记为 stale
- 降级为文件系统探索

## 降级探索路径（Handoff 不可用时）

只有以下情况才需要完整探索：

```bash
# 1. 当前任务指针
cat playground/CURRENT-QUEST.md 2>/dev/null

# 2. 已知陷阱
cat playground/PITFALLS.md 2>/dev/null

# 3. 关键决策记录
cat playground/DECISIONS.md 2>/dev/null

# 4. 当前 deck 状态
cat skill-deck.toml

# 5. 项目治理索引
cat cortex/INDEX.md

# 6. 最近变更
git log --oneline -10
```

## 输出格式

### 有 Handoff 时（推荐路径）

```
已复盘项目上下文：

📋 项目：xxx（技术栈）
📌 版本：vX.Y.Z（git: hash）
📄 Handoff: playground/HANDOFF.md（created_at: 2026-04-23）
⚠️  坑点：Handoff 中记录的关键陷阱 1-2 个
🎯 当前：Handoff 中的进行中的任务
💡 待办：Handoff 中的下一步

验证状态：✅ git 状态与 Handoff 一致 / ⚠️ 不一致，Handoff 可能过期

有什么可以帮你的？
```

### 无 Handoff 时（降级路径）

```
已复盘项目上下文：

📋 项目：xxx（技术栈）
📌 版本：vX.Y.Z（git: hash）
⚠️  坑点：关键陷阱 1-2 个（来自 PITFALLS.md 或 common-pitfalls）
🎯 当前：进行中的任务（来自 CURRENT-QUEST.md）
💡 待办：今日待办（来自 task list）

⚠️ 警告：未发现 Handoff，部分 session 专属信息可能丢失

有什么可以帮你的？
```

## 正交分离

| 文档 | 层级 | 内容 | 修改频率 | 读取优先级 |
|-----|------|------|---------|-----------|
| CLAUDE.md | Layer 1 | 怎么工作 | 极低 | 必须 |
| HANDOFF.md | Layer 2 | 当前 session 状态 | 每次 session | **最高** |
| git status | Layer 3 | 真实状态验证 | 实时 | 必须 |
| CURRENT-QUEST | 降级 | 任务状态 | 高 | Handoff 缺失时 |
| PITFALLS | 降级 | 已知陷阱 | 低 | Handoff 缺失时 |

**原则：** ONBOARDING.md 不包含"当前进度"，只包含"怎么工作"。当前进度在 Handoff 中。

## 检查清单

- [ ] Layer 1: 读取元技能 (CLAUDE.md)
- [ ] Layer 2: 查找并读取 Handoff (`playground/HANDOFF.md`)
- [ ] 判断 Handoff 是否 fresh（git_commit 匹配、created_at 合理）
- [ ] Layer 3: 验证 Ground Truth (`git status`, `git log`)
- [ ] 如果 Handoff 可用：直接基于 Handoff 开始工作
- [ ] 如果 Handoff 缺失/stale：降级探索（CURRENT-QUEST, PITFALLS, DECISIONS, skill-deck.toml, cortex/INDEX.md）
- [ ] 输出复盘摘要

## 相关文档

- SSOT: CLAUDE.md（项目根目录）
- Handoff 模板: HANDOFF-TEMPLATE.md
- 写记忆: lythoskill-project-scribe
