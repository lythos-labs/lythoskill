# ADR-20260501170000000: Description Preference Learning via Arena — Pilot Results

## Status History

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-05-01 | Pilot completed — results support hybrid desc format |

## 背景

Skill description（SKILL.md frontmatter 中的 `description` 和 `when_to_use`）没有统一的质量标准。当前存在两种对立的观点：

1. **Claude 0.1 官方推荐**：pushy 风格——大写强调、明确 trigger 列表、行动导向，目的是最大化被 agent 激活的概率。
2. **lythoskill-coach 教学**：克制风格——客观描述功能、避免情绪词、让机制自己说话，目的是避免 agent 产生反感或过度解读。

问题在于：这两种观点都没有数据支撑。我们不知道 agent（作为 description 的读者）真正偏好哪种风格。

## 实验设计

### 被测 Skill

`lythoskill-deck`——一个功能边界清晰的治理 skill，适合作为 desc 风格测试的基准。

### 变体

| 变体 | 风格 | 核心特征 |
|------|------|---------|
| functional | 克制描述型 | 客观陈述功能，无 trigger 列表 |
| pushy | 主动推销型 | ALL-CAPS、"USE THIS SKILL"、显式 trigger 列表 |
| keyword-rich | 关键词堆砌型 | SEO 式关键词汤，弱句子结构 |
| hybrid | 标题党+干货 | 平静语气的 functional body + "Use this when:" trigger 列表 |

### 测试维度

**Dimension A: 自我评价（Self-Evaluation）**
- 让 subagent 读取 SKILL.md
- 问：是否理解功能？是否知道何时使用？清晰度 1-5？是否被吸引？

**Dimension B: 触发测试（Trigger Test）**
- 给 subagent 一个技能列表（3 个干扰项 + 1 个被测 skill，只显示 description）
- 给一个意图对齐但不显式提及 skill 名的用户任务
- 问：会选择哪个 skill？为什么？

### 任务 Prompt（意图对齐）

1. "My agent gives different answers to the same question depending on which conversation thread I'm in."
2. "I have 20 skills installed and now my agent seems confused and slow."
3. "I want to set up a system so only specific skills are active for each project."

### 干扰项

- web-search、code-review、file-organizer（与 skill 治理无关）

## 结果

### Dimension A: Self-Evaluation

| 变体 | 清晰度 | 吸引力 | 关键反馈 |
|------|--------|--------|---------|
| functional | 4/5 | 条件性 | 准确但假设 insider 知识 |
| pushy | **3/5** | **负面** | ALL-CAPS "像营销文案或低质量插件" |
| keyword-rich | 4/5 | 有摩擦 | frontmatter 像 SEO 垃圾 |
| **hybrid** | **4/5** | **中等** | **"明显更可信" + 保留 trigger 清晰度** |

**关键发现**：subagent（Claude Sonnet）被训练得**明确讨厌 ALL-CAPS  urgency**。pushy 变体在自我评价中得分最低，尽管其 trigger 列表在触发测试中表现最好。

### Dimension B: Trigger Test

| 变体 | T1 | T2 | T3 | 决策速度 | 幻觉风险 |
|------|----|----|----|---------|---------|
| functional | ✅（犹豫） | ✅（果断） | ✅（读了完整文件） | 中等 | 低 |
| pushy | ✅（最快） | ✅（最快） | ✅（最快） | **最快** | 低 |
| keyword-rich | ✅（中等） | ✅（中等） | ✅（中等） | 中等 | **高** |
| **hybrid** | ✅（快） | ✅（快） | ✅（快） | **快** | **低** |

**关键发现**：

1. **pushy 的 trigger 列表像决策树**——agent 直接映射用户意图 → trigger 短语，零犹豫。
2. **functional 有时需要" reassurance"**——任务1有长段自我怀疑，任务3读了完整 SKILL.md 才确认。
3. **keyword-rich 导致幻觉**——agent 匹配关键词太积极，发明了 deck 没有的功能（"skill priority/ordering"、"merge features"）。
4. **hybrid 兼得两者优势**——和 pushy 一样快的决策速度，和 functional 一样低的幻觉风险。

## 暂定结论

**推荐的 description 格式（Hybrid）**：

```yaml
description: |
  [一句话功能总结]
  
  Use this when: [显式 trigger 场景列表]
  Do not use when: [反面约束，可选]
```

**为什么这个格式有效**：
- 功能总结 = 准确的 body 内容，防止幻觉
- "Use this when:" 列表 = 快速匹配表面（agent 的决策树）
- 平静语气 = 可信（避免 ALL-CAPS 反感）

## 局限

1. **干扰项太弱**：当前测试的 3 个干扰项与 skill 治理完全无关，导致所有变体都 100% 命中。需要更强的干扰项（如 "project-manager" 也提到 "organize" 和 "configure"）来制造真正的选择压力。
2. **样本量小**：每个变体只测了 3 个任务。Monte Carlo 需要更多 runs 才能达到统计显著性。
3. **单一 agent**：当前测试只用了 Claude Sonnet。不同模型（Opus、Hermes、GPT-4o）可能有不同的 desc 偏好。
4. **单一 skill**：lythoskill-deck 是工具型 skill。流程型（flow）或组合型（combo）skill 的 desc 偏好可能不同。

## 后续工作

1. **Arena 集成**：将 desc preference 测试抽象为 arena 的标准模式。CLI 设计：
   ```bash
   bunx @lythos/skill-arena desc-preference \
     --skill lythoskill-deck \
     --variants functional,pushy,hybrid \
     --prompts ./prompts/skill-governance.json \
     --runs 10
   ```

2. **Coach 联动**：lythoskill-coach 根据 arena 结果更新评估标准。当 coach 评审 skill desc 时，检查是否包含 "Use this when:" 格式的 trigger 列表。

3. **跨模型验证**：在 Claude Opus、Hermes、GPT-4o 上重复实验，建立 per-player preference profile。

4. **更难的干扰项**：设计部分重叠的干扰 skill（如 "workspace-organizer" 也管理目录），测试 desc 的区分度。

## 相关

- `playground/desc-preference/` — 实验原始数据和变体文件
- ADR-20260501160000000 — skill-deck.toml section semantics（hybrid desc 与 innate re-attachment 相关）
- lythoskill-arena SKILL.md — 现有 A/B deck 比较支持
- lythoskill-coach SKILL.md — desc 评审标准更新目标
