---
name: lythoskill-project-onboarding
description: |
  项目入职复盘 — AI 进入项目时的自动复盘流程。

  核心理念：不要重新探索文件系统来"回忆"上下文。如果上一个 session 产出了 Handoff，直接读取。
  只有当 Handoff 不存在或明显过时时，才降级为文件系统探索。

  基于 KV Cache 优化的加载顺序（稳定→多变）：
  Layer 1: 元技能 (CLAUDE.md) → Layer 2: 当前状态 (daily/ 下最新日期文件) → Layer 3: 验证 (git status)

  触发词："先复盘"、"了解项目"、"看看历史"、"接手这个任务"、"继续之前的工作"

type: standard
---

# 项目入职复盘

## 核心原则

> **优先读取 Daily 中的 Handoff section，避免重复探索。加载顺序基于 KV Cache 优化（稳定→多变）**
>
> 上一个 agent 通过 project-scribe 将 handoff 写入 `daily/YYYY-MM-DD.md` 的第一个 section。
> 新 agent 如果重新探索文件系统，会浪费 token 且可能 hallucination。

## 复盘流程（分层加载）

### Layer 1: 元技能 (最稳定，长期缓存)

```bash
# 项目启动期后极少修改
cat CLAUDE.md
# HANDOFF-TEMPLATE.md 仅供参考结构，不必须读取
```

**获取：**
- 怎么工作 (元技能)
- 工作原则
- 项目架构

### Layer 2: 当前状态 (Daily 文件中的 Handoff section)

```bash
# 找 daily/ 下最新的日期文件（不是固定文件名）
LATEST_DAILY=$(ls daily/*.md 2>/dev/null | grep -E '^daily/[0-9]{4}-[0-9]{2}-[0-9]{2}\.md$' | sort | tail -1)
cat "$LATEST_DAILY" 2>/dev/null || echo "无 Daily 文件"
```

**读取策略：**
- 读取文件的第一个 section（`## Session Handoff`）
- 如果同一天有多个 session，scribe 会在同一个 daily 文件中 append，onboarding 读取最新的 handoff section 即可

**判断 Handoff 是否可用：**
- ✅ **可用**：存在 daily 文件，且其中的 `git_commit` 与当前 HEAD 匹配
- ⚠️ **可能过期**：daily 文件存在但日期较早（如 3 天前），或 `git_commit` 与 HEAD 不符
- ❌ **不可用**：daily 文件不存在，或 handoff section 明显 stale

**如果 Handoff 可用：**
- 直接读取 Handoff section 获取上下文
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

### 有 Daily Handoff 时（推荐路径）

```
已复盘项目上下文：

📋 项目：xxx（技术栈）
📌 版本：vX.Y.Z（git: hash）
📄 Daily: daily/2026-04-24.md（git_commit: abc1234）
⚠️  坑点：Handoff section 中记录的关键陷阱 1-2 个
🎯 当前：进行中的任务
💡 待办：下一步

验证状态：✅ git 状态与 Handoff 一致 / ⚠️ 不一致，Handoff 可能过期

有什么可以帮你的？
```

### 无 Daily Handoff 时（降级路径）

```
已复盘项目上下文：

📋 项目：xxx（技术栈）
📌 版本：vX.Y.Z（git: hash）
⚠️  坑点：关键陷阱 1-2 个（来自 PITFALLS.md 或 common-pitfalls）
🎯 当前：进行中的任务（来自 CURRENT-QUEST.md）
💡 待办：今日待办（来自 task list）

⚠️ 警告：未发现 Daily Handoff，部分 session 专属信息可能丢失

有什么可以帮你的？
```

## 正交分离

| 文档 | 层级 | 内容 | 修改频率 | 读取优先级 |
|-----|------|------|---------|-----------|
| CLAUDE.md | Layer 1 | 怎么工作 | 极低 | 必须 |
| daily/YYYY-MM-DD.md | Layer 2 | 当前 session 状态（第一个 section） | 每次 session | **最高** |
| git status | Layer 3 | 真实状态验证 | 实时 | 必须 |
| CURRENT-QUEST | 降级 | 任务状态 | 高 | Daily 缺失时 |
| PITFALLS | 降级 | 已知陷阱 | 低 | Daily 缺失时 |

**原则：** ONBOARDING.md 不包含"当前进度"，只包含"怎么工作"。当前进度在 Daily 文件的第一个 section 中。

## 检查清单

- [ ] Layer 1: 读取元技能 (CLAUDE.md)
- [ ] Layer 2: 查找 daily/ 下最新的日期文件，读取第一个 section (Session Handoff)
- [ ] 判断 Handoff 是否 fresh（git_commit 匹配、日期合理）
- [ ] Layer 3: 验证 Ground Truth (`git status`, `git log`)
- [ ] 如果 Daily Handoff 可用：直接基于 Handoff 开始工作
- [ ] 如果 Daily Handoff 缺失/stale：降级探索（CURRENT-QUEST, PITFALLS, DECISIONS, skill-deck.toml, cortex/INDEX.md）
- [ ] 输出复盘摘要

## 相关 Skill

- **lythoskill-project-scribe** — 写 Daily（含 Handoff section）。与 onboarding 形成 CQRS 读写分离。scribe 独立可用（daily 可被人工阅读），onboarding 也独立可用（无 daily 时降级为文件探索）。二者组合时效果最佳。
- **lythoskill-project-cortex** — GTD 项目治理。如果项目使用 cortex，onboarding 在降级探索时会读取 `cortex/INDEX.md` 获取任务状态，但**不强制依赖**。cortex 独立运行，onboarding 只是在其存在时顺手读取。
