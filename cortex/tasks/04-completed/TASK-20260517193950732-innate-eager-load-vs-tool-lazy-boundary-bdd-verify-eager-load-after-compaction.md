# TASK-20260517193950732: Innate eager-load vs tool lazy boundary BDD — verify eager-load after compaction

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-17 | Created |
| completed | 2026-05-17 | Closed via trailer |

## 背景与目标
Innate vs tool skill loading boundary is critical: after context compaction, innate skills must remain eagerly loaded while tool skills stay lazy. This BDD scenario verifies the boundary survives compaction — agent introspects skill-deck.toml and correctly identifies tool skills.

Epic: EPIC-20260517121757041 Theme A (Deck Core Behavior)

## 需求详情
- [x] BDD: agent reads skill-deck.toml, counts tool skills, writes checkpoint
- [x] Scenario: `packages/lythoskill-deck/test/scenarios/skills-introspection.agent.md`
- [x] DeepSeek smoke: `packages/lythoskill-deck/test/scenarios/deepseek-smoke.agent.md`

## 技术方案
Agent BDD: subagent reads skill-deck.toml in isolated workdir, counts [tool.skills.*] sections, writes checkpoint JSONL. Verifies innate/tool boundary by confirming only tool skills are introspected via toml parsing.

## 验收标准
- [x] `skills-introspection.agent.md`: agent correctly counts 2 tool skills from toml
- [x] `deepseek-smoke.agent.md`: DeepSeek agent can write hello world + discover linked skills
- [x] Checkpoint shape: `{step:"deck.introspection", final_state:{tool_skill_count:N}}`

## 关联文件
- 新增: `packages/lythoskill-deck/test/scenarios/skills-introspection.agent.md`
- 新增: `packages/lythoskill-deck/test/scenarios/deepseek-smoke.agent.md`
- Epic: EPIC-20260517121757041
