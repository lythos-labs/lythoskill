# TASK-20260613190349815: Probe: suppress empty-shell warnings for completed tasks by default

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-06-13 | Created |
| in-progress | 2026-06-13 | Started |
| completed | 2026-06-13 | Closed via trailer |

## 背景与目标
`cortex probe` 当前会报告所有空壳任务（含 `04-completed/` 中的历史任务）。这些已完成但模板未填的任务是早期 `cortex task/epic create` 没有强制填充留下的历史负债，数量达 150+。持续爆出来会分散对真正活跃空壳（backlog/in-progress/review）的注意力。

本任务让 probe 默认不警告已完成状态目录里的空壳，但保留显式 flag 供需要时全量审计。

## 需求详情
- [x] 修改 probe：默认跳过 `04-completed/`、`06-terminated/`、`07-archived/` 中的空壳检测
- [x] 新增 `--include-completed-empty-shells` flag，需要时仍可全量扫描
- [x] 更新 CLI help 文案
- [ ] 更新相关测试

## 技术方案
- 在 `detectEmptyShells()` 调用处，根据 `filePath` 判断是否属于 terminal/stable 子目录
- 新增 CLI flag `--include-completed-empty-shells`，传入 probe 选项
- 默认行为改变：只报告活跃状态（backlog/in-progress/review/suspended/proposed）的空壳

## 验收标准
- [x] 默认 `cortex probe` 不再列出 `04-completed/` 中的空壳任务
- [x] `cortex probe --include-completed-empty-shells` 仍能列出所有空壳
- [x] 活跃状态的空壳仍被报告
- [ ] 单元测试覆盖默认行为和 flag 行为

## 进度记录
<!-- 执行时更新，带时间戳 -->

## 关联文件
- 修改:
- 新增:

## Git 提交信息建议
```
feat(scope): description (TASK-20260613190349815)

- Detail 1
- Detail 2
```

## 备注
