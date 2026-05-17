# TASK-20260517194318952: Move root test/scenarios to package-co-located test directories per TESTING.md

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-17 | Created |
| in-progress | 2026-05-17 | Started |
| review | 2026-05-17 | Deliverables committed |
| completed | 2026-05-17 | Closed via trailer |

## 背景与目标
Root `test/scenarios/` held 2 arena agent BDD files that belonged in `packages/lythoskill-arena/test/scenarios/`. Moved per TESTING.md co-location convention.

## 需求详情
- [x] Move arena-docx-output.agent.md → packages/lythoskill-arena/test/scenarios/
- [x] Move arena-single-task.agent.md → packages/lythoskill-arena/test/scenarios/
- [x] Remove empty root test/ directory

## 技术方案
<!-- 填写实现方案、关键决策、参考资源 -->

## 验收标准
- [ ] 标准1
- [ ] 标准2

## 进度记录
<!-- 执行时更新，带时间戳 -->

## 关联文件
- 修改:
- 新增:

## Git 提交信息建议
```
feat(scope): description (TASK-20260517194318952)

- Detail 1
- Detail 2
```

## 备注
