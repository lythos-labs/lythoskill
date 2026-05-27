# TASK-20260527212829974: Global path alignment sweep — establish working_set/cold_pool usage convention across repo

## Status History

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-27 | Created |
| in-progress | 2026-05-27 | Started |
| review | 2026-05-27 | Deliverables committed |

## 背景与目标

Site 未提交 diff（8 files）暴露了全局路径叙事不一致：`.claude/skills` 和 `.agents/skills` 的使用在不同文件（site/、examples/、packages/、showcase/）中存在矛盾或暗示唯一性。本任务的目标是建立一份「路径使用规范」，作为后续 T1（site 重写）的依据。

## 需求详情

- [ ] 全局扫描：`working_set`、`cold_pool`、`.claude/skills`、`.agents/skills` 在全仓的使用情况
- [ ] 分类统计：按「正确」「需修正」「需注释」「需删除」分类
- [ ] 建立规范：写一份 `cortex/wiki/01-patterns/path-convention.md`，定义什么场景用什么路径
- [ ] 列出偏离清单：具体到文件路径 + 行号 + 建议修改

## 技术方案

1. `grep -rn` 扫描 `examples/`、`showcase/`、`site/`、`packages/`、`skills/`、`scripts/`
2. 按文件类型和受众分类（site=用户文档、examples=deck toml、packages=代码/template、showcase=测试场景）
3. 规范原则：
   - 默认 `.claude/skills`（Claude Code 优先）
   - `.agents/skills` 仅在 Codex 专用场景或 also_link_to 中使用
   - 所有用户可见示例必须注明「根据你的 agent 平台修改」
   - `~/.agents/skill-repos` 作为 cold_pool 默认值（已统一）
4. 产出：规范文档 + 偏离清单（供 T1 使用）

## 验收标准

- [ ] `path-convention.md` 文档完成，被 epic owner 确认
- [ ] 偏离清单覆盖全仓，无遗漏
- [ ] 清单中每个偏离项有明确修改建议（keep/change/annotate）
- [ ] `cortex probe` 通过

## 进度记录

## 关联文件
- 修改: (本 task 以 read + report 为主，可能不改文件)
- 新增: `cortex/wiki/01-patterns/path-convention.md`

## Git 提交信息建议
```
docs(cortex): establish path usage convention for working_set and cold_pool (TASK-20260527212829974)

- Global grep sweep across examples/, showcase/, site/, packages/
- Define default (.claude/skills) vs multi-platform (.agents/skills) usage rules
- Catalog deviations with line-level references
```

## 备注

Refs: EPIC-20260527212032856 T2
Blocked by: None
Blocks: T1 (Site path narrative audit & rewrite)
