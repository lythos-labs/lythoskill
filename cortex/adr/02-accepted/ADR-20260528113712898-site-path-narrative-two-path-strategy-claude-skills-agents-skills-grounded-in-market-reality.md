# ADR-20260528113712898: Site path narrative — two-path strategy (.claude/skills + .agents/skills) grounded in market reality

## Status History

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-05-28 | Created — market data validates two-path strategy; site narrative should reflect real usage patterns |
| accepted | 2026-05-28 | Accepted |

## 背景

EPIC-20260527212032856 (site narrative stabilization) 暴露了一个叙事问题：site 的路径描述在多平台和单一路径之间摇摆。之前的 draft 把 `.agents/skills` 统一写成 `.claude/skills`，抹杀了多平台叙事；修正后又面临另一个问题——到底重点写哪些路径？

2026-05-28 的市场调研（web search + skills.sh README 分析）提供了数据基础。同时，lythoskill 自己的 `deck add` 在 5 月初通过调研 skills.sh 已经确认了 `.agents/skills/` 的社区标准地位。

## 决策驱动

- Site 的路径叙事必须有事实依据——不是 "我们认为应该支持哪些"，而是 "大家实际在用哪些"
- 2026 年 5 月市场数据：Claude Code 32.4% 市占（开发者满意度 84%，占 coding agent 支出的 92%），Codex 34.1%，Copilot 19%
- skills.sh 的 agent→path 表显示：51 个 agent 中，14+ 共用 `.agents/skills/`，其余各有品牌路径
- 两个路径加起来覆盖了 ~85%+ 的实际用户（Claude Code + Codex + Cursor + Copilot + Gemini CLI + Kimi 等）
- 其他品牌路径（`.windsurf/skills/`、`.qwen/skills/` 等）用户自己换就行，不需要在 site 上枚举

## 选项

### 方案A: 只写 `.claude/skills/`（单一默认）

**优点**: 简单，不分散注意力，Claude Code 是 skill 概念起源
**缺点**: 抹杀多平台现实，Codex/Cursor/Kimi 用户看到会觉得 "这不是给我用的"，与 `also_link_to` 的代码实现矛盾

### 方案B: 枚举所有 51 个 agent 路径

**优点**: 完整覆盖，谁都不会觉得被遗漏
**缺点**: site 变成路径黄页，维护负担重（skills.sh 更新我们也要更新），用户不需要这么多信息——需要的人自己会查

### 方案C: 两路径策略 — `.claude/skills/`（默认）+ `.agents/skills/`（社区标准），其余提及可配置性（Selected）

**优点**:
- 有数据支撑——两个路径覆盖了绝大多数实际用户
- Claude Code 是起源 + 市场领导者，作为默认有事实依据
- `.agents/skills/` 作为社区标准，14+ agent 共用，一句 `also_link_to` 解决
- 其他路径一句 "根据你的 agent 平台修改" 带过——懂的人自然懂
- Site 信息密度高，不啰嗦
**缺点**:
- 需要维护 `.agents/skills/` 的 "社区标准" 叙事——但这个有 skills.sh README 作为权威来源，不靠我们自说自话

## 决策

**选择**: 方案C — 两路径策略。

**原因**:
1. **事实基础**：2026 年 5 月市场数据支撑（见 `cortex/wiki/02-research/2026-05-28-claude-code-market-position-and-path-strategy-validation.md`）
2. **覆盖充分**：`.claude/skills/` + `.agents/skills/` 覆盖 85%+ 实际用户
3. **可扩展**：其他路径用户自己配置，模式自明——不需要枚举
4. **代码一致**：`also_link_to` 设计本身就是这个心智——默认 Claude Code，fan-out 到社区标准
5. **信息密度**：site 说重点，详细表在 `agent-skills-path-reference.md`，想看的人自己点

## 影响

- 正面:
  - Site 路径叙事有了事实锚点，不是 "我们认为" 而是 "大家实际这么用"
  - 覆盖充分，但不过度——两个路径说清楚，其余留给用户
  - 和 `path-convention.md`、`agent-skills-path-reference.md` 形成文档链：site 说重点 → convention 说规范 → reference 给全表
- 负面:
  - 需要持续关注市场变化（如果 Codex 路径变了或新 agent 崛起，需要更新）
- 后续:
  - Site 的 index.md、guide/index.md、architecture.md 按此原则重写（已在 EPIC 中）
  - `agent-skills-path-reference.md` 定期 sync skills.sh README

## 相关

- 关联 ADR: ADR-20260517152850372 (also_link_to multi-CLI), ADR-20260511093900000 (skills.sh syntax sugar)
- 关联 Epic: EPIC-20260527212032856 (site narrative stabilization)
- 关联 Wiki: `2026-05-28-claude-code-market-position-and-path-strategy-validation.md`, `agent-skills-path-reference.md`, `path-convention.md`
