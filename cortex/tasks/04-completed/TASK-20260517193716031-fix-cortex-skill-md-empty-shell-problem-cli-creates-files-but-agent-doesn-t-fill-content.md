# TASK-20260517193716031: Fix cortex SKILL.md empty shell problem — CLI creates files but agent doesn't fill content

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-17 | Created |
| completed | 2026-05-17 | Closed via trailer |

## 背景与目标
cortex SKILL.md desc encourages agent to create CLI shells but has no pushy directive to fill content. Result: agent runs `cortex task "..."`, sees output, considers work done. The file exists but body is empty template — no requirements, no acceptance criteria, no technical plan. This creates invisible debt: the task exists (probe passes) but a subagent assigned to it has zero guidance.

Pitfall documented in daily/2026-05-17.md: "agent sees 'use CLI to create' and stops, not realizing they must also write substance."

This task itself is a counter-example — the fix is structural, not just filling one card.

## 需求详情
- [ ] Add pushy MUST FILL directive to cortex SKILL.md desc: "AFTER CLI: immediately Edit the file to fill 背景, 需求详情, 验收标准"
- [ ] Add probe check: detect tasks/epics with empty 需求详情 (still has `- [ ] 需求1` placeholder)
- [ ] Update task/epic templates to make emptiness more visible (e.g., `<!-- ⚠️ FILL THIS SECTION -->`)
- [ ] Rebuild SKILL.md output

## 技术方案
1. SKILL.md desc: add trigger line "AFTER creating: agent MUST fill body sections" in pushy format
2. probe: grep for `- [ ] 需求1` pattern — if found, flag as empty shell
3. Templates: replace `<!-- 填写... -->` with `<!-- ⚠️ REQUIRED: fill before delegating -->`

## 验收标准
- [ ] SKILL.md desc includes mandatory fill directive that triggers agent behavior
- [ ] probe detects empty 需求详情 sections
- [ ] Template placeholders are visibly "must fill" not "optional hint"
- [ ] Arena verify: zero-knowledge subagent fills content after CLI create

## 关联文件
- 修改: `packages/lythoskill-project-cortex/skill/SKILL.md`
- 修改: `packages/lythoskill-project-cortex/assets/TASK-TEMPLATE.md`
- 修改: `packages/lythoskill-project-cortex/assets/EPIC-TEMPLATE.md`
- 修改: `packages/lythoskill-project-cortex/src/` (probe logic)

## 备注
