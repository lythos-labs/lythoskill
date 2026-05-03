# Hermes Skill 治理的真实痛点：来自社区一线报告

> 类型: 田野调查（基于社区真实报告） | 关联: [hermes-self-evolving-skill-field-notes](./hermes-self-evolving-skill-field-notes.md)
>
> 来源: Hermes GitHub Issues、官方迁移文档、社区教程、myclaw.ai 实践指南
>
> ⚠️ **本文档仅陈述社区已验证痛点及 lythoskill 当前已发布能力（v0.7.3）的对接。**
> 涉及未来设想的扩展能力，见 [hermes-deck-future-proposals](./hermes-deck-future-proposals.md)。

---

## 一、不是推演，是真实报告

以下痛点全部来自 Hermes 社区的真实文档、Issue 和指南，不是第一性原理推演。

### 1.1 Context 超限：Issue #4061

**来源**: `NousResearch/hermes-agent/issues/4061`

用户报告：当 context window 被耗尽且压缩无法缓解时，Hermes 输出：

```
Context length exceeded and cannot compress further.
The conversation has accumulated too much content.
```

**关键细节**：
- 错误信息**没有任何恢复建议**，不告诉用户可以用 `/new`、`/reset` 或 `/compress`
- 严重度被官方标记为 Medium，但用户描述是 "hit a dead end with no guidance"
- 这条 Issue 的修复建议只是"在错误信息里加一行提示"——治标不治本

**为什么是 skill 相关的**：Hermes 启动时会加载所有 working set skill 的 frontmatter（~3k tokens 覆盖 40+ skills）。skill 越多，context 的固定开销越大，用户还没发第一条消息，预算已经被吃掉一部分。

### 1.2 Skill 冲突：官方教程明确承认

**来源**: Hermes Agent Tutorial 3: Skills System（ququ123.top）

官方教程的 Troubleshooting 章节第一个条目就是 **Skill conflicts**：

> **Cause**: Multiple skills with same trigger.
> **Fix**: Disable one or modify triggers: `hermes skills disable @old/skill`

这说明 skill 冲突不是边缘 case，是**常见到需要写进入门教程**的问题。

官方提供的诊断命令：`hermes skills conflicts`

这意味着冲突已经频繁到需要专门 CLI 工具来检测。

### 1.3 "不要一次装太多 skills"：社区实践指南的警告

**来源**: myclaw.ai / "How to Use Hermes Agent Skills"

社区实践指南的明确警告：

> **Avoid installing too many skills at once. A small tested stack is easier to debug and trust.**

以及：

> **Another common mistake is installing community skills because they look useful in theory.**

这不是"可能有问题"的推测，是社区在血泪经验后写进最佳实践的忠告。

### 1.4 OpenClaw 迁移：四路 skills 汇流导致的冲突爆炸

**来源**: Hermes 官方迁移文档 `docs/guides/migrate-from-openclaw`

从 OpenClaw 迁移到 Hermes 时，skills 来自 **4 个独立来源**，全部被导入到同一个目录：

| 来源 | OpenClaw 位置 | Hermes 目的地 |
|------|--------------|--------------|
| Workspace skills | `workspace/skills/` | `~/.hermes/skills/openclaw-imports/` |
| Managed/shared skills | `~/.openclaw/skills/` | `~/.hermes/skills/openclaw-imports/` |
| Personal cross-project | `~/.agents/skills/` | `~/.hermes/skills/openclaw-imports/` |
| Project-level shared | `workspace/.agents/skills/` | `~/.hermes/skills/openclaw-imports/` |

**官方为此专门设计了 conflict 处理机制**：

```bash
# migration 时的冲突处理
--skill-conflict skip      # 保留现有 Hermes skill
--skill-conflict overwrite # 覆盖
--skill-conflict rename    # 创建 -imported 副本
```

**关键洞察**：一次迁移就可能把 4 个独立池子的 skills 倒进同一个目录。如果用户之前在不同项目装了不同组合的 skills（比如 A 项目装了 security skills，B 项目装了 creative skills），迁移后它们全部混在一起，运行时全部可见。

### 1.5 按平台禁用：权宜之计的局限

**来源**: Hermes 官方文档、`config.yaml` 的 `platform_disabled`

Hermes 提供了 `platform_disabled` 字段来按平台禁用 skill。但这只是**粗粒度过滤**（平台级），不是场景级。

用户的真实场景是：
- 写代码时需要 `github-code-review`、`test-driven-development`
- 做安全审计时需要 `owasp-top-10`、`pentest-checklist`
- 两类 skill 都装了，但不应该同时可见

`platform_disabled` 解决不了这个——它不是按任务场景切换的。

---

## 二、这些痛点如何被实际遇到

基于社区报告，还原三个真实场景：

### 场景 A：迁移后的技能混战

**用户画像**：从 OpenClaw 迁移到 Hermes 的开发者
**真实动作**：运行 `hermes claw migrate`
**结果**：
- 4 个来源的 skills 全部进入 `~/.hermes/skills/openclaw-imports/`
- 之前在不同项目装的 skills（security + frontend + mlops + creative）全部混在一起
- 运行 `hermes skills conflicts` 发现多个 skill trigger 重叠
- 做代码审查时，creative skill 的 trigger 被误激活，输出风格变成"营销文案"

**用户实际做的事**：不是"写一个 Flask API"，是**迁移后清理技能目录**。

### 场景 B：Hub 安装后的 context 膨胀

**用户画像**：按教程从 Skills Hub 安装 skills 的新用户
**真实动作**：
```bash
hermes skills install @nous/daily-report
hermes skills install @community/github-workflow
hermes skills install @community/aws-deploy
# ... 跟着教程装了 15+ 个
```
**结果**：
- 启动时加载全部 frontmatter，context 固定开销超过 3k tokens
- 用户发第一条消息时，有效上下文已经少了 20%
- 长对话后触发 Issue #4061 的 `Context length exceeded`
- 用户不知道是因为 skill 太多，以为是模型问题

**用户实际做的事**：不是"做数据分析"，是**按教程装了一堆 skills 后发现 agent 变卡了**。

### 场景 C：Skill-factory 的过度生产

**用户画像**：重度使用 Hermes 的开发者，装了 hermes-skill-factory
**真实动作**：正常工作 2 周，skill-factory 自动提议生成了 12 个 skills
**结果**：
- `~/.hermes/skills/` 从 8 个膨胀到 20 个
- 多个 factory-generated skill 的 trigger 相似（都是 "set up environment" 变体）
- 用户运行 `hermes skills conflicts` 看到 5 组冲突
- 用户想清理，但不确定哪些是自己写的、哪些是 factory 生成的、哪些还在用

**用户实际做的事**：不是"部署到 AWS"，是**管理 factory 自动生成的 skills**。

---

## 三、lythoskill 已有能力的直接对接

不是"lythoskill 能解决这个问题"，是"lythoskill 的**当前已发布命令/文件格式**如何用于上述真实场景"。

### 3.1 迁移后的技能混战 → `deck link` + deny-by-default

**Hermes 现状**：迁移后所有 skills 在一个目录，全部运行时可见。

**lythoskill 对接**：

```toml
# skill-deck.toml — 不是"推荐配置"，是用户真实需要的场景分割
[deck]
max_cards = 10
cold_pool = "~/.hermes/skills/openclaw-imports"
working_set = ".claude/skills"

# 代码工作时的 deck
[innate]
skills = [
  "github.com/lythos-labs/lythoskill/lythoskill-deck"
]

[tool]
skills = [
  "github.com/lythos-labs/lythoskill/lythoskill-arena",
  "github-code-review",
  "test-driven-development",
]
```

**对接效果**：
- 不在 `[tool]` 中声明的 skills（如 creative、mlops）物理不可见
- `hermes skills conflicts` 的冲突根源——多个 skill 同时可见——被消除
- 不需要 `hermes skills disable @old/skill`，不需要手动管理 enable/disable 状态

### 3.2 Hub 安装后的 context 膨胀 → `max_cards` 硬约束

**Hermes 现状**：用户按教程装了 15+ skills，context 被 frontmatter 吃掉。

**lythoskill 对接**：

```toml
[deck]
max_cards = 8
```

**对接效果**：
- 用户装第 9 个 skill 时，`deck link` 直接 exit 1，提示超出预算
- 用户被迫做选择：这 8 个里哪个最常用？哪些可以删掉？
- 不是"建议不要装太多"（社区指南的软性劝告），是"物理上装不进去"（硬性约束）

这与 myclaw.ai 的忠告形成互补：社区说"建议少装"，lythoskill 说"系统强制你少装"。

### 3.3 Skill-factory 的过度生产 → 临时补丁的自动退役

**Hermes 现状**：factory 生成的 skills 中，部分存在 regression 或 side effect。用户以往要么 disable 整个 skill，要么手动修改 skill 内容——两者都破坏了可复现性。

**lythoskill 对接**（基于 v0.7.3 已发布能力）：

```toml
# factory 生成的 deploy-v2 在特定场景下有 regression
# 不写回完整的 v1，也不直接修改 v2 内容
# 而是写一个极薄的 transient patch，只覆盖 regression 场景

[tool]
skills = [
  "github.com/lythos-labs/lythoskill/lythoskill-deck",
  "deploy-v2",
]

[transient.deploy-v2-cleanup-patch]
path = "./patches/deploy-v2-cleanup"
expires = "2026-05-20"
```

`./patches/deploy-v2-cleanup/SKILL.md` 内容示例（极薄，< 50 行）：

```markdown
---
name: deploy-v2-cleanup-patch
type: standard
description: |
  After deploy-v2 completes, check for leftover temp files in /tmp/hermes-build/
  and remove them. This is a temporary workaround for deploy-v2 regression #42.
  Do NOT use this skill after 2026-05-20 — the fix will be in deploy-v3.
---
# Deploy v2 Cleanup Patch
Run this immediately after any `deploy-v2` invocation:
```bash
rm -f /tmp/hermes-build/*
```
```

```bash
# 每次 deck link 后，lock 文件记录 patch 的过期时间
cat skill-deck.lock | jq '.skills[] | select(.type == "transient") | {name, expires, days_remaining}'
```

**对接效果**：
- patch 是**本地工作区**的薄 skill，不污染 cold pool 或上游生态
- `skill-deck.lock` 提供审计轨迹："这个 patch 是什么时候加的、什么时候过期"
- transient 过期时 `deck link` 输出警告，提醒用户评估是否仍需保留
- 用户确认后手动编辑 toml 移除 patch，重新 link 即可清理
- 如果 patch 在过期前被反复需要，这是一个信号：deploy skill 需要更根本的修复，应把 cleanup 逻辑 hardened 到 deploy package 本身

> **设计意图对齐**：`transient` 不是"候选 skill 试用槽"，而是**临时 workaround**。它的设计目标是 shrink until removable（`toml-format.md`）。如果反复需要，说明 agent 没有内化这个治理能力，应该 extract into a package（`ADR-20260501160000000`）。
>
> **当前限制**：transient 过期后不会自动删除 symlink，只输出 warning。自动清理已在 `ADR-20260501160000000` Phase 3 中设计，尚未实现。

---

## 四、关键洞察：软约束 vs 硬约束

Hermes 社区目前的治理手段全部是**软约束**：

| 手段 | 类型 | 效果 |
|------|------|------|
| "Avoid installing too many skills" | 文档劝告 | 用户可能不看 |
| `hermes skills conflicts` | 诊断工具 | 发现问题但不阻止 |
| `hermes skills disable` | 手动操作 | 需要用户知道该 disable 哪个 |
| `/compress` | 事后缓解 | 已经超载了再压缩 |
| `platform_disabled` | 粗粒度过滤 | 不是场景级 |
| Curator | 后台归档 | 只处理 agent-created，且是周期性而非实时 |

lythoskill 提供的是**硬约束**：
- `deny-by-default`：未声明的 skill 物理不可见（不是"建议不要加载"）
- `max_cards`：超出预算直接拒绝（不是"建议少装"）
- `skill-deck.lock`：状态可审计、可回滚（不是"记得清理"）
- `transient`：workaround 有明确过期时间，审计可追踪（不是"先这样凑合着"）

这不是替代 Hermes 的现有机制，是在软约束之上加一层硬边界。

---

## 五、来源索引

| 痛点 | 来源 | URL |
|------|------|-----|
| Context 超限无指导 | GitHub Issue #4061 | github.com/NousResearch/hermes-agent/issues/4061 |
| Skill conflicts 常见 | Hermes Tutorial 3 | ququ123.top/en/2026/04/hermes-skills-system-skill/ |
| "不要一次装太多" | myclaw.ai 实践指南 | myclaw.ai/blog/hermes-agent-skills |
| 迁移时 4 路 skills 汇流 | 官方迁移文档 | hermes-agent.nousresearch.com/docs/guides/migrate-from-openclaw |
| Conflict 处理机制 | 官方迁移文档 | 同上 |
| Skill 是 procedural knowledge | myclaw.ai | 同上 |

---

## 六、用户真实玩法：不是"写代码"，是"运营代理"

以下场景来自 Hermes 社区的真实 workflow 指南和生态推荐，不是推测。

### 6.1 产品管理自动化（Userorbit + Hermes）

**来源**: userorbit.com/blog/hermes-agent-userorbit-workflows

这是真实的商业场景，Hermes + Userorbit skill 被用作"AI 产品经理"。

**Daily 节奏**：
```
> Using the Userorbit skill, pull all new feedback from the last 24 hours.
> Group them by feature and segment. Highlight churn risks.
> Summarize in under 10 bullet points and propose follow-ups.
```

**Weekly 节奏**：
```
> Use the Userorbit skill to pull the current roadmap for the next two quarters,
> along with vote counts, comment volume, and associated feedback.
> Identify the top 5 items with the highest combined user demand and strategic impact.
```

**Release 节奏**：
```
> Review the drafts Userorbit generated for the last deploy.
> Make the changelog more user-friendly, ensure the help doc explains what changed.
> Craft a short in-app announcement for power users only.
> Mark everything ready for review — do not auto-publish.
```

**Always-on 节奏**：
```bash
# 每周一早上 9 点自动执行
hermes cron add "0 9 * * 1" \
  "pull all feedback from the past week, group by feature, send summary to #product Slack"
```

**Skill 组合需求**：
- Userorbit skill（核心）
- Slack/Telegram skill（消息网关）
- 可能还有 GitHub skill（关联代码变更）
- 可能还有文档生成 skill（help center 维护）

**治理痛点**：一个 PM 的 Hermes 实例可能同时装有：Userorbit + Slack + GitHub + Docs + 内部定制的 feedback-analysis skill + 自动生成的 release-workflow skill。这是真实的 skill 膨胀场景。

### 6.2 多 Agent 执行层（Fleet 模式）

**来源**: awesome-hermes-agent Level-Up Blueprints

社区推荐的"Multi-agent execution layer"组合：
- Hermes core delegation
- hermes-agent-acp-skill（Codex/Claude Code 路由）
- zouroboros-swarm-executors（本地 executor 交接）
- opencode-hermes-multiagent（专用 agent 角色）

**这意味着**：一个团队可能运行多个 Hermes 实例，每个实例装有不同的 skill 组合。
- 实例 A（前端）：React skill + UI review skill + Vercel deploy skill
- 实例 B（后端）：API design skill + DB migration skill + testing skill
- 实例 C（运维）：Incident commander skill + Monitoring skill + Cron skill

**治理痛点**：没有 deck 治理时，每个实例的 skill 集合是隐式的、不可声明的。团队成员不知道"这个 Hermes 实例现在装了哪些 skills"，也无法复现。

### 6.3 自我改进栈（Self-improvement stack）

**来源**: awesome-hermes-agent Level-Up Blueprints

社区推荐的组合：
- hermes-agent-self-evolution（DSPy+GEPA）
- lintlang（prompt/config linting）
- 第二遍评估（阻挡坏突变）

**真实警告**：
> "The trick is not 'evolve faster'; it's 'evolve without quietly getting weird.'"

**这意味着**：用户主动在管理"进化不要失控"，但工具层面只有 lint 和人工 review，没有运行时的 skill 可见性控制。

### 6.4 记忆栈组合（Memory stack）

**来源**: awesome-hermes-agent Level-Up Blueprints

社区推荐的多层记忆组合：
1. Built-in Hermes memory
2. honcho-self-hosted（跨 session user modeling）
3. hindsight（retain/recall/reflect workflows）
4. plur（portable shared memory artifacts）
5. flowstate-qmd（proactive recall）

**治理痛点**：每一层记忆都可能附带自己的 skill 或 plugin。用户按照蓝图组合后，skill 数量可能超过 20 个，但没有声明式清单来管理这些组合。

---

## 七、关键洞察：用户的真实需求不是"少装 skills"

从上述真实场景可以提炼出用户的实际需求：

| 场景 | 真实需求 | 社区现有手段的局限 | lythoskill 当前能力 |
|------|---------|-------------------|-------------------|
| PM 自动化 | 同一 Hermes 实例在不同时间做不同任务（daily triage vs weekly review vs release） | `platform_disabled` 是静态的，不能按任务切换 | 多个 `skill-deck.toml` + `link --deck` 手动切换；声明式清单可复现 |
| Fleet 模式 | 多个实例有明确的 skill 分工，团队成员能复现 | skill 集合是隐式的，没有声明式配置 | `skill-deck.toml` + `skill-deck.lock` 即基础设施即代码 |
| 自我改进 | 进化产物有 regression 时，能快速打补丁且补丁可追踪、可退役 | 没有 workaround 管理机制，要么忍要么 disable 整个 skill | `transient` + `path` + `expires` 提供薄 patch 的过期审计 |
| 记忆栈 | 组合多个插件后仍保持 context 可控 | 装得越多 context 越大，但没有预算硬约束 | `max_cards` 硬性拒绝 |

**用户不是在问"怎么少装 skills"，而是在问**：
- "我能不能早上用 PM skills，下午切到 coding skills？"
- "团队里这台 Hermes 装了什么，我怎么让另一台装一样的？"
- "GEPA 优化后的 deploy skill 有个 bug，我能不能只 patch 那个场景，等修复后自动清理 patch？"
- "我装了 15 个 skills 后 agent 变卡了，但我不知道具体是哪个吃的 context"

lythoskill-deck 已经能回答其中大部分：声明式复现、max_cards 硬约束、transient workaround（含过期警告）。

但社区不知道这些能力存在，因为展示场景不是用户真实在做的"运营代理"，而是抽象的"写 Flask API"。
