# TASK-20260527220921728: Fix P0 path narrative contradictions — remove 'sole location' language and align docs with code ground truth

## Status History

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-27 | Created from TASK-20260527212829974 deviation report |
| in-progress | 2026-05-27 | Started |
| review | 2026-05-27 | Deliverables committed |

## 背景与目标

T2 (path-convention sweep) 发现 11 个 P0 级叙事矛盾：文档声称 `.claude/skills/` 是 "sole location"，但代码层（`also_link_to`、path-guard、schema）明确支持多平台。文档与代码 ground truth 冲突。本 task 修复所有非 site/ 的 P0 项，site/ 的 P0 由 T1 处理。

## 需求详情

- [ ] Fix `showcase/sober-journalist-evolution/reproduce.sh`: `working_set = "skills"` → `.claude/skills`
- [ ] Fix `packages/lythoskill-deck/skill/SKILL.md`: remove "sole location" language, genericize path references
- [ ] Fix `packages/lythoskill-deck/skill/references/glossary.md`: remove "sole location" language
- [ ] Rebuild `skills/lythoskill-deck/` to sync built output with source fixes
- [ ] Verify no other built skills have similar contradictions

## 技术方案

1. 修改 skill source（`packages/lythoskill-deck/skill/`）
2. `lythoskill build lythoskill-deck` 或 `bunx @lythos/skill-creator@latest build lythoskill-deck`
3. 验证 built output 同步

## 验收标准

- [ ] `skills/lythoskill-deck/SKILL.md` 不再包含 "sole" 或 "only" 路径描述
- [ ] `skills/lythoskill-deck/references/glossary.md` 不再包含 "sole" 描述
- [ ] `showcase/sober-journalist-evolution/reproduce.sh` 的 `working_set` 不是 `"skills"`
- [ ] `bun --filter='lythoskill-deck' run test` passes
- [ ] `cortex probe` passes

## 进度记录

## 关联文件
- 修改: `packages/lythoskill-deck/skill/SKILL.md`, `packages/lythoskill-deck/skill/references/glossary.md`, `showcase/sober-journalist-evolution/reproduce.sh`
- 新增: (none)

## Git 提交信息建议
```
fix(deck,showcase): remove "sole location" path contradictions, align docs with code (TASK-20260527220921728)

- SKILL.md: genericize working_set references; remove "sole location" claim
- glossary.md: same fix
- showcase/reproduce.sh: fix forbidden working_set = "skills"
- rebuild skills/lythoskill-deck/ output
```

## 备注

Refs: TASK-20260527212829974, EPIC-20260527212032856
Scope excludes site/ P0 — those are owned by T1.
