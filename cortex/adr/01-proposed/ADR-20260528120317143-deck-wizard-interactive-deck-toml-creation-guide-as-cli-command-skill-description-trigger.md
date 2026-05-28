# ADR-20260528120317143: Deck creation guide — formalize "agent is the wizard, CLI is the guardrail"

## Status History

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-05-28 | Created — thin-skill pattern: agent asks user, guide informs agent, CLI validates output |

## 背景

当前创建 `skill-deck.toml` 三种方式都有摩擦：

1. 手动复制 `examples/decks/` 模板 → 22 个 deck，不知道选哪个
2. 从零手写 → 需要知道 FQ locator、path 约定、`working_set` 平台差异
3. Agent 凭记忆写 → **今天 session 证实了 agent 会瞎编**（mermaid skill 不存在、`deck link` 当字面命令写进 site）

没有一个正规化的 "帮我创建 deck" 的 agent 工作流。用户说 "我需要一个新 deck for X"，agent 要么找 example、要么凭记忆编——没有可信赖路径。

**关键洞察**：这是 thin skill pattern 的经典场景。用户 ↔ agent ↔ SKILL.md ↔ CLI 四层协作：guide 告诉 agent 怎么问用户 → agent 理解需求 → agent 写 toml → CLI validate 做护栏。**Agent 就是 wizard**，CLI 不需要做交互式 UI。

## 决策驱动

- "Agent scan → 学不到位 → 瞎写" 是系统性失败模式，需要结构性解法
- **user-agent-skill-CLI 架构**：CLI 是配合 agent 的工具，不是面向人的交互式 UI
- description 是 agent 的第一接触点（SEO 战场），pushy trigger 在这里最有效
- HATEOAS 原则（ADR-20260507014124191）：CLI 输出告诉 agent "下一步做什么"

## 选项

### 方案A: 传统 CLI 交互式向导 (`deck init --wizard`)

人机交互式：用户运行命令 → CLI 逐题询问 → 生成 toml。类似 `npm init`。

**优点**: 用户自助，不依赖 agent
**缺点**: 
- 违背 user-agent-skill-CLI 架构——用户通常不直接操作 CLI，agent 是中介
- CLI 做交互式 UI 是重复发明 agent 的能力（问问题、理解需求）
- 和 thin skill pattern 的 "肥 agent / 熟基建" 心智冲突

### 方案B: 纯文档 guide（无 description trigger）

只写 guide，不加 description pushy trigger。依赖 agent 自己发现 guide。

**优点**: 零改动
**缺点**: agent 不知道 guide 存在——今天是靠 cortex task + 手动干预才知道的

### 方案C: Thin-skill 模式 — guide + description trigger + CLI guardrail（Selected）

```
User: "帮我做一个安全审计用的 deck"
  ↓
Agent (via SKILL.md description pushy trigger):
  → 读 references/deck-building-guide.md
  → 确认主力 player: "Claude Code? Codex? 还是其他?"
     Claude Code → .claude/skills/
     Codex / Cursor / Kimi / etc. → .agents/skills/
     小众/定制 agent → mapping 一下路径
  → 问用户: "最多几个 skill？"
  → 查 examples/decks/INDEX.md: "qa-sweep.toml 匹配"  
  → 写 skill-deck.toml（格式正确、路径有效、注释齐全）
  → deck validate --deck ./skill-deck.toml
  ↓
CLI (HATEOAS output):
  ✅ Validation passed: 7 skill(s), max_cards = 10
  或
  ❌ Skill not found: github.com/xxx → try: curator add <locator> first
```

**确认主力 player 是自然的一步**——deck 需要知道 skill 链接到哪个 `working_set`。对于 Claude Code 和 Codex/社区标准，两路径策略已覆盖。对于小众/定制 agent，agent 引导用户 mapping 路径即可。这和 Vercel `skills add --agent <name>` 的心智一致：告诉工具你的主力 agent，路径自动对齐。

三层各司其职：

| 层 | 做什么 | 载体 |
|----|--------|------|
| **Guide** | use case → deck 映射 + 创建规范 + agent 该问用户的 checklist | `references/deck-building-guide.md` |
| **Description trigger** | 让 agent 在用户说 "创建 deck" 时主动触发读 guide | SKILL.md frontmatter `description` |
| **CLI guardrail** | 验证 agent 写的 toml 没有瞎编路径，HATEOAS 输出下一步 | `deck validate`（已有，需修 warn-vs-error 语义） |

**优点**:
- 和 thin skill pattern 的 user-agent-skill-CLI 架构完全一致
- Agent 承担 "问问题、理解需求" 的智能工作，CLI 承担 "验证、防瞎编" 的护栏工作
- 零新 CLI 命令——利用已有 `deck validate`
- Guide 是 agent 的可信参考，不是用户要读的手册

**缺点**:
- 依赖 agent 的 description 触发机制（已验证有效）
- Guide 需随 example decks 增删同步（维护负担 = deck 维护负担，同源）

## 决策

**选择**: 方案C — Thin-skill 模式：guide + description trigger + CLI guardrail。

**原因**:
1. **架构一致**：user-agent-skill-CLI 是这个项目的基础心智模型。Agent 是 wizard，CLI 是 agent 的工具。不要倒退到人机交互式 CLI
2. **止血精准**：description trigger 直接打断 "agent 凭记忆瞎写" 的路径。Agent 被强制引导读 guide → 基于真实数据创建 → validate 兜底
3. **复用而非新增**：`deck validate` 已有，只需修 warn-vs-error 语义。Guide 只是 organize 已有的 example decks 知识。不增加 CLI 维护面
4. **HATEOAS-native**：guide 的输出告诉 agent "问用户这些问题"；validate 的输出告诉 agent "下一步做什么"——每一步都有 actionable 反馈

## 影响

- 正面:
  - Agent 创建 deck 有可信赖路径：trigger → guide → write → validate
  - 新用户说 "帮我做 deck" 时 agent 能主动引导，不需要人看 22 个 example
  - 和 thin skill pattern 心智一致，不引入新的架构模式
- 负面:
  - Guide 需随 example decks 增删同步（在 "Before claiming done" checklist 已有 `deck validate` 提醒）
  - Description pushy 语句增加 ~50 tokens skill 开销
- 后续:
  - Phase 2（如果 guide 驱动的 agent 工作流被验证有效）: 可考虑 `deck recommend --use-case <x>` 作为 guide 的 CLI 可查询版本（agent 可直接查询而不必读全文）
  - `deck validate` warn-vs-error 语义修正（独立 task）

## 相关

- 关联 ADR: ADR-20260507014124191 (HATEOAS), ADR-20260511093900000 (skills.sh syntax sugar), ADR-20260423101938000 (thin-skill-pattern)
- 关联 Epic: EPIC-20260527212032856 (site narrative stabilization)
- 关联: `desc-is-agent-seo-battlefield`, `arena-validates-desc-not-just-function`
- 根因: 今天 session 的 "agent scan → 学不到位 → 瞎写" 失败模式
