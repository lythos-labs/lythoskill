# TASK-20260517121808215: BDD: deck abc 基础 — link/add/phase-switch/restore

## Status History

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-17 | Created |
| completed | 2026-05-17 | 6/6 PASS, 23K tokens |

## 背景

优化后的 deck SKILL.md (247→181行) 需要验证 subagent 能否独立读懂基本操作。
用"零知识" subagent（不额外给 deck 使用提示），只看 SKILL.md。

## 测试环境

- Workdir: `/tmp/deck-abc-test/`
- 初始 deck: `skill-deck.toml` (only lythoskill-deck innate)
- Coldpool: `~/.agents/skill-repos`
- Subagent: general-purpose, 零 deck 使用提示

## BDD Scenario

### Step 1: link seed deck
- **Given**: workdir 有 skill-deck.toml 声明 lythoskill-deck
- **When**: `deck link --deck skill-deck.toml`
- **Then**: .claude/skills/lythoskill-deck symlink 创建
- **Result**: PASS ✅

### Step 2: add critique
- **Given**: 冷池已有 `github.com/nexu-io/open-design/skills/critique`
- **When**: `deck add github.com/nexu-io/open-design/skills/critique`
- **Then**: skill-deck.toml 增加 [tool.skills.critique]
- **Result**: PASS ✅ — subagent 发现 add 自动 link，不重复操作

### Step 3: verify working set
- **When**: `ls -la .claude/skills/`
- **Then**: lythoskill-deck + critique 两个 symlink
- **Result**: PASS ✅

### Step 4: create phase2.toml and switch
- **When**: 创建 phase2.toml (innate: deck, tool: baoyu-markdown-to-html)，排除 critique
- **Then**: `deck link --deck phase2.toml` → critique 移除，baoyu 进入
- **Result**: PASS ✅ — subagent 正确应用多文件 phase deck 模式，"The reconciler removes undeclared skills and creates new ones in a single operation -- no state leaks between phases"

### Step 5: restore
- **When**: `deck link --deck ./skill-deck.toml`
- **Then**: 恢复原始状态 (deck + critique)
- **Result**: PASS ✅

## 关键指标

| Metric | Value |
|--------|-------|
| Tokens | 23,457 |
| Tool calls | 17 |
| Duration | 166s |
| Steps | 6/6 PASS |

## 验收标准
- [x] Subagent 不依赖额外提示独立读懂 deck SKILL.md
- [x] Multi-File Phase Decks 章节被正确理解和应用
- [x] Seed Bootstrap 概念被正确理解
- [x] 所有 6 步操作正确

## 关联
- Epic: EPIC-20260517121757041
- 源文件: `packages/lythoskill-deck/skill/SKILL.md` (181 lines, optimized)
