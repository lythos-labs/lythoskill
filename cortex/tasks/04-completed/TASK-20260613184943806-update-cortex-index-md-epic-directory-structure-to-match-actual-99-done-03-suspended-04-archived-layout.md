# TASK-20260613184943806: Update cortex/INDEX.md epic directory structure to match actual 99-done/03-suspended/04-archived layout

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-06-13 | Created |
| in-progress | 2026-06-13 | Started |
| completed | 2026-06-13 | Closed via trailer |

## 背景与目标
`cortex/INDEX.md` 的 "Self-Described Structure" 仍显示 epics 只有 `01-active/` 和 `02-archived/`，但实际目录结构为 `01-active/`、`03-suspended/`、`04-archived/`、`99-done/`（由 `packages/lythoskill-project-cortex/src/config.ts` 定义）。这会导致新 agent 按 INDEX.md 探索时找不到 done/suspended 目录，也会误将 probe 对空壳 epic 的警告理解为目录错误。

## 需求详情
- [x] 更新 `cortex/INDEX.md` 中 epics 目录结构描述，与实际一致
- [x] 说明各目录含义：active / suspended / archived / done
- [x] 更新 "Last updated" 日期

## 技术方案
- 直接编辑 `cortex/INDEX.md` 的 Self-Described Structure 代码块
- 参考 `packages/lythoskill-project-cortex/src/config.ts` 中的 `epicSubdirs`

## 验收标准
- [x] `cortex/INDEX.md` 中的目录树与 `ls cortex/epics/` 一致
- [x] `cortex probe` 无新增不一致
- [x] 语义清晰，新 agent 不会把空壳警告当成目录错误

## 进度记录
<!-- 执行时更新，带时间戳 -->

## 关联文件
- 修改:
- 新增:

## Git 提交信息建议
```
feat(scope): description (TASK-20260613184943806)

- Detail 1
- Detail 2
```

## 备注
