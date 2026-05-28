# TASK-20260528112402418: Research: Agents Skills ABC in 2026 — .agents/skills community standard scan-path landscape

## Status History

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-28 | Created |
| terminated | 2026-05-28 | Terminated — task scope merged into broader research epic |

## 背景与目标

Path convention 工作暴露了一个知识盲区：我们对 `.agents/skills` 作为社区标准路径的认知不够精确。现有 wiki 条目（`2026-05-02-agent-skills-spec.md`、`2026-05-07-ai-agent-skills-ecosystem.md`）有大量生态数据，但缺少一个**聚焦于 "各 CLI 实际扫描什么路径、`.agents/skills` 如何成为社区共识"** 的专门条目。

目标：产出一份权威的 "Agents Skills ABC in 2026" wiki，以**事实表格**为核心——每个支持 Agent Skills 的 CLI/平台，它扫描哪些路径，这些路径选择的来龙去脉，以及 `.agents/skills` 作为社区标准的证据链。

## 需求详情

### 核心问题（必须回答）

- [ ] **Path matrix**: 2026 年支持 Agent Skills 的主要 CLI/平台及其实际扫描路径（不是文档说扫描什么，是代码实际扫描什么）
- [ ] **`.agents/skills` 溯源**: 这个路径首次出现在哪个规范/cli？它如何从 "某个 cli 的 path" 变成 "社区共识 path"？
- [ ] **agentskills.io 规范说什么**: `agentskills.io` 是否定义了标准路径？如果有，是什么？
- [ ] **各 CLI 的双路径策略**: 哪些 CLI 同时支持自己的品牌路径（如 `.kimi/skills`）**和** `.agents/skills`？哪些只支持一个？
- [ ] **Agent Skills 标准的 governance 现状**: 目前由谁维护？是 Anthropic 主导还是已经移交社区？Linux Foundation Agentic AI Foundation 在这里的角色？
- [ ] **lythoskill 位置**: 在这个生态中的准确位置——我们遵循什么、增强什么、不重复什么

### 研究范围

- **一级来源**（优先）: 各 CLI 源代码中的路径常量/扫描逻辑、agentskills.io 规范文本、GitHub 上的 SKILL.md 约定
- **二级来源**: 已有的 ecosystem 报告（已有 `2026-05-07` 条目）、agentskill.sh 的 PLATFORM_SKILL_DIRS 映射
- **验证方法**: 对关键 claim 做交叉验证（两个独立来源确认），标记置信度

## 技术方案

### 执行方式

1. **使用 deep-research deck**（`examples/decks/deep-research.toml`）驱动 ZK subagent
2. **Player 模型**: 要求 subagent 使用 pro/high 级别模型（opus/sonnet），确保研究深度
3. **工作目录**: `/tmp/agents-skills-abc-research/`
4. **研究输入**:
   - 已有 wiki 条目作为基线（`2026-05-02-agent-skills-spec.md`、`2026-05-07-ai-agent-skills-ecosystem.md`）
   - agentskill.sh 的 PLATFORM_SKILL_DIRS 映射（`mcp-server/src/index.ts`）
   - agentskills.io 规范页面
5. **产出**: wiki entry → `cortex/wiki/02-research/2026-05-28-agents-skills-abc-in-2026.md`

### 研究步骤

1. Outline: 从上述 6 个核心问题生成结构化研究大纲
2. Deep agents: 每个大纲项启动独立 agent 搜索（WebSearch + WebFetch）
3. Report: 合成结构化报告，每个 claim 标注来源和置信度

## 验收标准

- [ ] Path matrix 覆盖 ≥10 个 CLI/平台，每个标注来源（代码引用 > 文档 > 二级报告）
- [ ] `.agents/skills` 的 "社区标准" 地位有至少两个独立来源的证据支持
- [ ] 标注每个 claim 的置信度（high/medium/low）
- [ ] Wiki entry 写入 `cortex/wiki/02-research/2026-05-28-agents-skills-abc-in-2026.md`
- [ ] `cortex probe` 通过
- [ ] 研究结果可以支撑修正 `path-convention.md` 中不准确的措辞

## 进度记录

## 关联文件
- 修改: (无)
- 新增: `cortex/wiki/02-research/2026-05-28-agents-skills-abc-in-2026.md`

## Git 提交信息建议
```
docs(wiki): Agents Skills ABC in 2026 — scan-path landscape and .agents/skills community standard (TASK-20260528112402418)

- Path matrix: ≥10 CLI/platforms with verified scan paths
- .agents/skills community standard provenance
- governance status of Agent Skills spec in 2026
- Confidence-labeled claims with cross-verified sources
```

## 备注

Refs: EPIC-20260527212032856 (site narrative), path-convention.md, TASK-20260528111848232 (P1/P2 cleanup)
Blocked by: None
Blocks: path-convention.md language refinements
