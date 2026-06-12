# TASK-20260607233651845: Standardize scribe daily/weekly templates

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-06-07 | Created |
| completed | 2026-06-12 | Closed via trailer |

## 背景与目标
当前 `packages/lythoskill-project-scribe/skill/references/daily-template.md` 停留在 v0.15.5 的简版结构（Ground Truth 嵌在 Handoff 内部、无 Completed/Key Decisions/Temp Artifacts 区块），而实际 daily 文件（06-06、06-07）已演化为更成熟的格式。weekly 模板完全缺失，导致 W24 出现纯 YAML 退化（丢失 markdown body）。

目标是沉淀最佳实践到结构化模板，减少格式漂移，降低 agent 格式决策负担。

## 需求详情
- [ ] 升级 `daily-template.md`：顶部独立 Ground Truth（6 字段）→ Session Handoff（Completed/Key Decisions/Pitfalls/Next Steps/Temp Artifacts）→ Work Log
- [ ] 新建 `weekly-template.md`：YAML frontmatter（W22 字段 + W24 新增 parked_reasoning/next_week_anchors/docs_now_stale）+ markdown body（TL;DR + 4-Quadrant Retro + Quest DAG + Project Lessons）
- [ ] 更新 `SKILL.md`：添加 Template Usage 章节，引用两个模板，标注 Required/Optional sections
- [ ] 检查 `AGENTS.md`：同步 scribe 相关章节，添加模板路径引用
- [ ] ZK Review：零上下文 agent 验证模板可读性（能否理解每个区块意图）

## 技术方案
**设计原则**：
1. Daily = 事实密度（给下一个 agent 用）；Weekly = 叙事压缩（给人类复盘用）
2. YAML frontmatter + markdown body 混合，避免 W24 纯 YAML 退化
3. 模板文件本身即规范，不引入 JSON Schema 重工具

**关键决策**：
- Ground Truth 放在 daily 顶部独立区块（06-06/06-07 已验证）
- weekly 保留混合格式：frontmatter 结构化数据 + body 叙事和表格
- 多 session 同文件时追加新 Handoff 节（已有惯例）

## 验收标准
- [ ] daily-template.md 包含所有最佳实践区块，格式与 06-06/06-07 一致
- [ ] weekly-template.md 包含 YAML frontmatter + markdown body，与 W22 结构一致
- [ ] SKILL.md 有 Template Usage 章节，明确标注 Required/Optional
- [ ] ZK agent 能从零上下文理解两个模板的每个区块用途（≥90% 正确率）
- [ ] cortex probe 通过（无空壳字段）

## 进度记录
| Timestamp | Action |
|-----------|--------|
| 2026-06-07 23:36 | Task created |
| 2026-06-07 23:43 | Moved to in-progress |
| 2026-06-07 23:45 | daily-template.md upgraded, weekly-template.md created |
| 2026-06-07 23:50 | SKILL.md updated with Template Usage chapter |
| 2026-06-07 23:55 | ZK Review passed — zero-context agent scored 8-9/10, filled example correctly |

## 关联文件
- 修改: packages/lythoskill-project-scribe/skill/SKILL.md
- 修改: packages/lythoskill-project-scribe/skill/references/daily-template.md
- 新增: packages/lythoskill-project-scribe/skill/references/weekly-template.md
- 新增: cortex/adr/01-proposed/ADR-20260607233903985-cli-task-command-subcommand-inconsistency-between-create-and-state-transitions.md
- 新增:

## Git 提交信息建议
```
feat(scope): description (TASK-20260607233651845)

- Detail 1
- Detail 2
```

## 备注
