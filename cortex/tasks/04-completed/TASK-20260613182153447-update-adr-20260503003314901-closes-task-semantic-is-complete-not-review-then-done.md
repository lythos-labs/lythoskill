# TASK-20260613182153447: Update ADR-20260503003314901: Closes: TASK semantic is complete not review-then-done

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-06-13 | Created |
| in-progress | 2026-06-13 | Started |
| review | 2026-06-13 | Deliverables committed |
| completed | 2026-06-13 | Done |

## 背景与目标
用户明确：ADR-20260503003314901 的原始意图必须保持——`Closes: TASK-xxx` 应严格表示 "review 后的 LGTM 完成"，即 review → done。实现中把 `Closes: TASK-*` 映射到 `complete`（any status → completed）是一次未经授权的偏离。

本任务要纠正这一偏离：恢复 `Closes: TASK-*` 的严格语义，并新增一个 trailer 语义来对应 kanban 中 "开发完成、提交 review"（内部 PR）的状态迁移。

## 需求详情
- [x] 修改 trailer 解析器：`Closes: TASK-*` 映射到 `done`（必须已在 review）
- [x] 新增 trailer：`Review: TASK-*` 映射到 `review`（in-progress → review）
- [x] 更新 trailer 单元测试覆盖新语义
- [x] 更新 AGENTS.md、SSOT conventions.md、SKILL.md、state-machines.md 中的 trailer 表格
- [x] 创建新 ADR，追认并锁定上述语义
- [x] 将 ADR-20260503003314901 标记为 superseded，指向新 ADR

## 技术方案
- `trailer.ts`: 在 `Closes` switch 分支里把 TASK 动词从 `complete` 改为 `done`；新增顶层 `Review` key，映射到 `review`
- `trailer.test.ts`: 更新 `Closes: TASK-*` 期望为 `done`；新增 `Review: TASK-*` 测试
- 文档同步：所有提到 "Any status → completed" 的地方改为 "review → completed"，并新增 `Review:` 说明
- 保留 `complete` CLI 命令作为显式工具（不破坏既有命令），但 `Closes:` 不再使用它

## 验收标准
- [x] `bun test packages/lythoskill-project-cortex/src/lib/trailer.test.ts` 全绿
- [x] `cortex probe` 无新增不一致
- [x] 新 ADR 被接受，旧 ADR 标记 superseded
- [x] AGENTS.md / conventions.md / SKILL.md / state-machines.md 与新语义一致

## 进度记录
<!-- 执行时更新，带时间戳 -->

## 关联文件
- 修改:
- 新增:

## Git 提交信息建议
```
feat(scope): description (TASK-20260613182153447)

- Detail 1
- Detail 2
```

## 备注
