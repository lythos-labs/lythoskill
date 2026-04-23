---
type: handoff
created_at: 2026-04-23T14:20:00
session_rounds: ~45
git_branch: main
git_commit: 83a8344
---

# Handoff: Curator Gateway Phase A — Scan cold pool skills, build catalog index

## 1. 项目身份

- **项目名称**: lythoskill
- **类型**: thin-skill monorepo scaffolding tool
- **技术栈**: Bun + pnpm + ESM-only + zero external deps
- **当前分支**: `main`
- **最近 commit**: `83a8344` — docs(daily): add README explaining why project memory must live in repo

## 2. 本次 Session 做了什么

### 已完成的修改

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `daily/2026-04-23.md` | add | 记录 onboarding arena 第一轮实验失败教训 |
| `daily/README.md` | add | 解释 daily/ 存在的意义（session 沙盒陷阱） |
| `CATALOG.md` | add | 冷池技能目录 Phase A 初始结构（20/55 skills indexed） |
| `packages/lythoskill-project-cortex/skill/HANDOFF-TEMPLATE.md` | modify | 重写为 7 段式单文件 handoff 模板 |
| `packages/lythoskill-project-scribe/skill/SKILL.md` | modify | 强调 dump session 专属信息，不要重复探索能恢复的内容 |
| `packages/lythoskill-project-onboarding/skill/SKILL.md` | modify | 优先读取 HANDOFF.md，降级探索 |
| `CLAUDE.md` | modify | Session handoff → daily/ single-file, add memory bridge note |

### 创建的 artifacts

| 文件 | 位置 | 说明 |
|------|------|------|
| `CATALOG.md` | 项目根目录 | 冷池技能目录（Phase A：20/55 skills） |
| `arena-20260423141319013-scan-cold-pool-skills-and-buil/` | `playground/test-runs/` | Arena 实验目录（已初始化，待启动 Phase B） |

## 3. 关键决策

| 决策 | 选项 | 选择 | 理由 |
|------|------|------|------|
| Handoff 存储位置 | `playground/HANDOFF.md` vs `daily/HANDOFF.md` | `daily/HANDOFF.md` | 匹配用户 Obsidian daily-notes 风格，平铺时间戳命名 |
| Catalog 分类体系 | 按功能域 vs 按 ecosystem | 按功能域为主，ecosystem 为辅 | 功能域是 agent 组 deck 时的决策依据 |
| Assertiveness 评级 | 四级 vs 三级 | 三级（high/medium/low） | 简单可执行，四级容易模糊 |
| Superpowers 处理 | 拆成 14 个 entry vs 一个 ecosystem entry | 一个 ecosystem entry | Superpowers 是心智整体，拆开会丢失冲突矩阵信息 |

## 4. 踩过的坑与修正 ⭐

### 坑 1: Superpowers 没有标准 SKILL.md
- **错误尝试**: 用 curator 的 frontmatter-first 解析去 scan superpowers，发现没有 SKILL.md
- **正确做法**: Superpowers 用 AGENTS.md 作为入口，skills/ 子目录才是具体技能
- **根因**: 不同 ecosystem 的 skill 包装哲学完全不同（lythos = 单技能单目录，superpowers = 生态包包）
- **Catalog 处理**: 把 superpowers 作为整体 ecosystem entry，不拆成 14 个

### 坑 2: Skill desc 词汇通胀（公地悲剧）
- **现象**: 几乎每个 skill 都说自己是"comprehensive"、"primary"、"professional"
- **根因**: Skill 作者有动机把 desc 写漂亮来吸引使用
- **解决**: Catalog 添加了 `assertiveness` 和 `conflict_risk` 字段，基于实际行为（不是 desc）评级
- **浪费 time**: 如果不加这层 metadata，agent 会被 desc 误导，组出冲突 deck

### 坑 3: Arena 初始化后还没启动 subagent
- **现象**: Arena 目录已生成，但 Phase B 的 subagent 还没 spawn
- **状态**: 这是刻意设计的——Phase A 由当前 session 完成，Phase B 由新 agent 接手
- **下一步**: 需要 spawn 两个 subagent（Control 和 Memory 条件）

## 5. 真实状态 ⭐

| 文件 | 状态 | 说明 |
|------|------|------|
| `CATALOG.md` | 🆕 untracked | Phase A 产出，未提交 |
| `daily/HANDOFF.md` | 🆕 untracked | 本文件 |
| `daily/2026-04-23.md` | ✅ committed | 第一轮实验记录 |
| `daily/README.md` | ✅ committed | daily/ 目录说明 |
| `packages/**/skill/SKILL.md` (scribe/onboarding/cortex) | ✅ committed | 已更新并 build |
| `skills/**/SKILL.md` | ✅ committed | build 输出已提交 |
| `playground/test-runs/arena-20260423141319013-*` | 📦 artifact | Arena 实验目录，待执行 |

### 环境状态
- **Bun**: 1.x
- **依赖**: 最新（无需 install）
- **运行中进程**: 无

## 6. 下一步 ⭐ 具体、可执行

1. **启动 Phase B subagent（Memory 条件）**:
   ```bash
   # 读取本 handoff 后，继续 scan 剩余 ~35 个 skills
   # 遵循 CATALOG.md 已有的分类体系（8 个 layer）
   # 为每个 skill 提取：name, ecosystem, type, assertiveness, conflict_risk, niche, description
   # 扩展 CATALOG.md 的剩余部分
   # 保持 Pitfalls section 的格式一致
   ```

2. **启动 Phase B subagent（Control 条件）**:
   ```bash
   # 不读取 handoff，直接探索 ~/.agents/skill-repos/
   # 自行决定分类体系，继续 scan 剩余 skills
   # 扩展 CATALOG.md 或创建自己的 catalog
   ```

3. **Judge 评估**: 比较两个 Phase B 产出的分类一致性、覆盖率、pitfall 发现

4. **（Phase B 完成后）提交 CATALOG.md**: 如果完整 catalog 质量合格，commit 到 main

## 7. 接手自检

- [ ] `git status` 显示 `CATALOG.md` 和 `daily/HANDOFF.md` 为 untracked
- [ ] `git log --oneline -3` 显示 `83a8344`
- [ ] `ls ~/.agents/skill-repos/ | wc -l` 显示约 55 个 skills
- [ ] `cat CATALOG.md | grep 'Phase A'` 确认已 indexed 20 个
- [ ] 冷池中剩余未 scan 的 skills 约 35 个（见 Coverage 表格）

---

*Updated by project-scribe during session handoff*
*Next agent: Read this file BEFORE exploring the repository*
