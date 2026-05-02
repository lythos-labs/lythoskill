# TASK-20260503010230554: 实现 husky pre-commit 软提醒(in-progress 非空)

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-03 | Created |

## 背景与目标

ADR-20260503003314901 后续 T3。当 `cortex/tasks/02-in-progress/` 非空时,pre-commit hook 打印一行提醒:"你有 N 张 in-progress task,记得加 trailer"。**仅提醒,不阻塞**。

降低 trailer 遗忘率,且不增加摩擦。

## 需求详情

- [ ] `.husky/pre-commit` 增加(或新增)一段:扫描 `cortex/tasks/02-in-progress/` 下 .md 文件数
- [ ] 数量 > 0 → 打印一行 reminder + 含 task ID 短列表 + trailer 语法示例
- [ ] 不阻塞 commit(exit 0)
- [ ] 已存在的 pre-commit 逻辑(skills 同步等)不影响
- [ ] 数量 = 0 → 静默,无输出

## 技术方案

- 实现:`.husky/pre-commit`(已存在,叠加段落)
- 用 ls / find 统计目录下 .md 文件数
- 提示样板:
  ```
  💡 你有 2 张 in-progress task,如果本次 commit 完成了某张,在 message 末尾加 trailer:
       Closes: TASK-<id>
     或 Task: TASK-<id> review/done
     当前 in-progress: TASK-A, TASK-B
  ```

## 验收标准

- [ ] 在 in-progress 非空时 commit,看到 reminder
- [ ] reminder 不阻塞 commit
- [ ] in-progress 空时 commit,无 reminder 输出
- [ ] 与现有 pre-commit 逻辑共存

## 进度记录

(执行时追加)

## 关联文件

- 修改: `.husky/pre-commit`

## 引用

- ADR: ADR-20260503003314901(后续 T3)
- Epic: EPIC-20260503010218940(主题C)
- Sibling: TASK-20260503010229362(T3 — post-commit;两者互补)

## Git 提交信息建议

```
chore(cortex): pre-commit reminder for in-progress tasks (TASK-20260503010230554)

Closes: TASK-20260503010230554
```

## 备注

- 不依赖 T1-T3,可独立 ship
