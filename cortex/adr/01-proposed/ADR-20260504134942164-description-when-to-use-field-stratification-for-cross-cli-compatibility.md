# ADR-20260504134942164: description-when-to-use-field-stratification-for-cross-cli-compatibility

## Status History

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-05-04 | Created — fills gap in ADR-20260501170000000 |

## 背景

ADR-20260501170000000 通过 arena 实验验证了 **hybrid description 格式** 的有效性：

```yaml
description: |
  [一句话功能总结]
  Use this when: [显式 trigger 场景列表]
```

但该 ADR 有两个未回答的问题：

1. **不是所有 agent CLI 都解析 `when_to_use`** — Claude Code 支持，但其他 CLI（Kimi, Copilot, Gemini CLI 等）可能只读取 `name` + `description`。如果 trigger 信息只在 `when_to_use` 里，这些 CLI 下的 agent 看不到触发条件。
2. **`when_to_use` 字段的存在意义** — 既然 description 里已经放了 trigger 列表，还要 `when_to_use` 干什么？

本次决策回答：description 与 `when_to_use` 之间如何分层，以及为什么 hybrid 不是 redundancy 而是 **defensive stratification**。

## 决策驱动

- **跨 CLI 兼容性**：lythoskill 是跨平台的 skill 治理层，不能假设消费端支持完整的 frontmatter 字段集。
- **信息分层**：Tier 1（description）承载核心触发信息，Tier 1+（when_to_use）承载扩展触发信息，避免 description 膨胀。
- **不违反 DRY**：description 里的 trigger 是摘要版，when_to_use 里是完整版，不是简单复制。

## 选项

### 方案 A：description-only（极简兼容）

所有触发信息都放在 `description` 里，`when_to_use` 字段废弃或留空。

**优点**：
- 零兼容性问题，所有 CLI 都能看到完整信息
- 字段最少，维护简单

**缺点**：
- description 容易膨胀，超出 1,536 字符 truncation 上限
- 不支持 `when_to_use` 的 CLI 也无法享受到"扩展信息"的好处
- 违反了渐进式披露原则（所有信息挤在 Tier 1）

### 方案 B：when_to_use-only（字段纯净）

description 只放功能总结，所有触发信息都放在 `when_to_use` 里。

**优点**：
- description 最精简，符合 Claude Code 的 truncation 预算
- 字段语义最清晰：what / when 严格分离

**缺点**：
- 不支持 `when_to_use` 的 CLI 下，agent 完全不知道何时使用该 skill
- lythoskill 的跨平台承诺被破坏

### 方案 C：hybrid stratification（description fallback + when_to_use expansion）

- **description**：功能总结 + **核心 trigger 场景**（1-2 句概括），作为不支持 `when_to_use` 的 CLI 的 fallback
- **`when_to_use`**：完整 trigger 短语列表、反面约束、边缘场景

**优点**：
- 所有 CLI 都能看到"何时使用"的核心信息
- 支持 `when_to_use` 的 CLI 获得更丰富的触发上下文
- description 不会过度膨胀（核心 trigger 控制在 1-2 句）
- 符合渐进式披露：Tier 1 够用，Tier 1+ 更好

**缺点**：
- 需要维护两层信息的同步（但非重复——摘要 vs 完整版）
- 对 skill 作者的要求略高

## 社区实践调研

为了验证"并非所有 CLI 都解析 `when_to_use`"这一假设，对主流 skill 仓库进行了 frontmatter 字段分析。

### 1. Anthropic 官方 (agentskills.io, ~73k stars)

官方 spec 的**必需字段只有两个**：`name` 和 `description`。

> "The `description` field enables Skill discovery and should include **both what the Skill does and when to use it**."
> — [Anthropic Skills Best Practices](https://github.com/Orchestra-Research/AI-research-SKILLs/blob/main/anthropic_official_docs/best_practices.md)

官方示例：
```yaml
description: Extract text and tables from PDF files, fill forms, merge documents.
  Use when working with PDF files or when the user mentions PDFs, forms, or document extraction.
```

**关键发现**：官方 spec **没有 `when_to_use` 字段**。description 必须同时承担 what + when 的职责。

### 2. Claude Code (平台扩展)

Claude Code 在官方 spec 基础上做了平台扩展：

```yaml
when_to_use: Use when the user wants to commit and push changes
```

> "`when_to_use`: Included in system prompt so the model can suggest the skill"
> — [claude-rust Skills 文档](https://github.com/maulanasdqn/claude-rust)

**关键发现**：`when_to_use` 是 **Claude Code 的专有扩展**，不是 cross-platform 标准。

### 3. gstack (garrytan, 最流行的第三方 skill 集)

gstack 是目前 skill 生态中最具影响力的第三方实现，其 frontmatter 设计极具参考价值：

```yaml
name: review
description: |
  Pre-landing PR review. Analyzes diff against the base branch for SQL safety, LLM trust
  boundary violations, conditional side effects, and other structural issues. Use when
  asked to "review this PR", "code review", "pre-landing review", or "check my diff".
  Proactively suggest when the user is about to merge or land code changes. (gstack)
triggers:
  - review this pr
  - code review
  - check my diff
  - pre-landing review
```

**关键发现**：gstack 的 `triggers` 字段 ≈ lythoskill 的 `when_to_use`，是扩展 trigger 列表；description 里保留完整的 trigger fallback。gstack 没有选择"description 纯功能 + triggers 纯触发"的纯净分层，而是 description 里直接写 trigger——**因为 trigger 是 discovery 的关键信息，不能放到可选字段里**。

### 4. 其他社区仓库

| 仓库 | `description` 风格 | `when_to_use` / 等价物 |
|------|-------------------|----------------------|
| aaron-he-zhu/seo-geo-claude-skills | "Include what it does, trigger phrases, scope boundaries" | 有 `when_to_use`: "Trigger scenarios for auto-invocation" |
| factorial-io/skills | "Brief description of when to use this skill" | **无** frontmatter when_to_use；body 里有 "## When to Use" |
| treasure-data/td-skills | 极简 ~50 tokens，无 trigger | **无** |
| claude-mpm | 推荐 "Include when_to_use guidance" | 支持 frontmatter 和 body 两种形式 |
| awesome-agent-skills | "A clear description of what this skill does" | **无** frontmatter；body 里 "## When to Use This Skill" |

### 5. 调研结论

1. **description-only 是跨平台最小公分母**：agentskills.io 官方 spec、factorial-io、awesome-agent-skills 都不依赖 `when_to_use` frontmatter。如果 skill 的 trigger 信息只放在 `when_to_use` 里，这些平台下的 agent **完全看不到触发条件**。
2. **hybrid 是社区共识**：官方、factorial-io、aaron-he-zhu、gstack 都在 description 里放 trigger 信息。区别只是有的放得多（gstack 放完整 trigger 列表），有的放得少（官方放概括性场景）。
3. **扩展字段百花齐放**：Claude Code 用 `when_to_use`，gstack 用 `triggers`，aaron-he-zhu 用 `metadata.triggers`。没有跨平台统一的"扩展 trigger"标准字段名。
4. **这反而强化了 description fallback 的必要性**：由于扩展字段名不统一（when_to_use / triggers / metadata.triggers），即使有扩展字段，不同平台也可能不认识。description 作为唯一被**所有平台保证解析**的字段，必须是 trigger 信息的最低 fallback。

## 决策

**选择**：方案 C（hybrid stratification）

**原因**：

1. **兼容性优先于字段纯净**

   lythoskill 的定位是跨平台 skill 治理层。如果 skill 在不支持 `when_to_use` 的 CLI 下变成"功能存在但不知道什么时候用"的幽灵 skill，治理层就失去了意义。

2. **摘要 vs 完整版不是冗余**

   description 里的 trigger 是**概括性场景**（如 "Use when implementing features or fixing bugs with BDD"），when_to_use 里的 trigger 是**具体短语列表**（如 "write a test for this", "Given/When/Then", "red-green-refactor"）。两者粒度不同，不是 copy-paste。

3. **控制 description 膨胀**

   方案 A 的失控风险是真实存在的。ADR-20260501170000000 的 arena 结果显示 keyword-rich（堆砌型）会导致幻觉。方案 C 通过在 description 里只放**概括性** trigger，在 when_to_use 里放**具体性** trigger，既保留了 hybrid 的决策速度优势，又避免了 keyword soup。

4. **与 coach 标准不冲突**

   lythoskill-coach 的教学是：
   - description 公式 = `[What it does] + [When to use it] + [Key capabilities]`
   - `when_to_use` = "additional trigger context beyond description"

   方案 C 完全符合这个分层：description 里的 "when to use it" 是必要成分，when_to_use 字段是 additional context。

## 影响

### 正面

- 所有 agent CLI 都能获得 minimally viable 的触发信息
- 支持 `when_to_use` 的 CLI 获得 richer context
- 与 ADR-20260501170000000 的 hybrid desc 结论兼容，不推翻只补充
- coach 评审标准可更新：description 必须包含至少一个概括性 trigger 场景

### 负面

- skill 作者需要理解"摘要 vs 完整版"的区别，学习成本微增
- description 和 when_to_use 之间需要人为保持语义一致（非逐字一致）

### 后续

1. **更新 coach SKILL.md**：在 "Description + when_to_use" 评估标准中增加一条：
   > "Description must contain a minimal trigger fallback for CLIs that do not parse `when_to_use`. `when_to_use` provides the expanded trigger list."

2. **更新 bump/align 检查**：在 `lythoskill-creator` 的 align 规则中，检查 description 是否包含 "Use when" 或等效 trigger 短语（如果 when_to_use 非空）。

## 相关

- ADR-20260501170000000: Description Preference Learning via Arena — Pilot Results（hybrid desc 格式起源）
- lythoskill-coach SKILL.md — desc 评审标准更新目标
- ADR-20260423101938000: thin-skill pattern — frontmatter 作为 agent-visible metadata 的设计原则
