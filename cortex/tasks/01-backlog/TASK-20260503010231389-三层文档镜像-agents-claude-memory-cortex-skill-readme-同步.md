# TASK-20260503010231389: 三层文档镜像(AGENTS/CLAUDE/memory)+ cortex skill/README 同步

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-03 | Created |

## 背景与目标

ADR-20260503003314901 后续 T4 + T5,ADR-20260503003315478 后续 4。

把 trailer 语法、lane 双轨、5 题 checklist、cortex CLI 新增动词命令(T1/T2 引入)落地到三层镜像,跨压缩可恢复(参考 memory: `feedback_compaction_safe_doc_visibility.md`):

- AGENTS.md(SSOT,所有 CLI 都读)
- CLAUDE.md(Claude Code 跨压缩存活)
- auto-memory(自动加载)
- 同步到 cortex skill 包内 SKILL.md / README

## 需求详情

- [ ] `AGENTS.md` 加节 "Cortex Lifecycle Integration":trailer 语法、verb 列表、failure-fallback、lane 上限规则
- [ ] `AGENTS.md` 加节 "Cortex Granularity":epic 双轨、5 题 checklist、何时该是 ADR 而不是 epic
- [ ] `CLAUDE.md` 加 compaction-safe 一段:trailer 不要写错、lane 不要超
- [ ] `~/.claude/projects/.../memory/feedback_cortex_trailer_lane.md`(新)— rule + Why + How to apply
- [ ] `~/.claude/projects/.../memory/MEMORY.md` 索引更新
- [ ] `packages/lythoskill-project-cortex/skill/SKILL.md`:trailer 语法、命令清单(`{{PACKAGE_VERSION}}` 占位符保留)
- [ ] `packages/lythoskill-project-cortex/README.md`:用户视角的 trailer 用例 + 双轨说明

## 技术方案

- AGENTS.md 是 SSOT,先写它;其他文档引用 AGENTS.md anchor
- CLAUDE.md 不复述,只放"compaction-safe 提醒 + 链接"
- memory 文件用 ADR-B 推荐结构:rule 一句话 + **Why:** + **How to apply:**
- skill/SKILL.md 与 README 用例驱动(其他 CLI agent 是受众)

## 验收标准

- [ ] 新 agent 不读历史,仅读 AGENTS.md → 知道 trailer 语法、知道 lane = 1+1
- [ ] 跨 Claude Code 压缩后,只看 CLAUDE.md → 不会误用 trailer 或超 lane
- [ ] cortex skill 包发布后 SKILL.md 帮助文本含 trailer 例子
- [ ] memory 文件可被 next session 自动 load

## 进度记录

(执行时追加)

## 关联文件

- 修改: `AGENTS.md`、`CLAUDE.md`、`packages/lythoskill-project-cortex/skill/SKILL.md`、`packages/lythoskill-project-cortex/README.md`
- 新增: `~/.claude/projects/-Users-chariots-Downloads-lythoskill-main/memory/feedback_cortex_trailer_lane.md`
- 修改: `~/.claude/projects/-Users-chariots-Downloads-lythoskill-main/memory/MEMORY.md`

## 引用

- ADR: ADR-20260503003314901(后续 T4+T5)、ADR-20260503003315478(后续 4)
- Epic: EPIC-20260503010218940(主题D)
- Memory 范例: `feedback_compaction_safe_doc_visibility.md`(三层镜像规则)
- Sibling: TASK-20260503010227902(T1)、TASK-20260503010228602(T2)— 命令清单参照

## Git 提交信息建议

```
docs(cortex): three-layer mirror for trailer + lane discipline (TASK-20260503010231389)

Closes: TASK-20260503010231389
```

## 备注

- 软依赖 T1+T2(命令清单参照)
- 可在 T3/T4 完成前先写 90%,T1-T4 完成后做最后校对
