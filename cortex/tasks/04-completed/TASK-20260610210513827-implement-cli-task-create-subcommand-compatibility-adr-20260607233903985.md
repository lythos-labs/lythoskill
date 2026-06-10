# TASK-20260610210513827: Implement CLI task create subcommand compatibility (ADR-20260607233903985)

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-06-10 | Created |
| completed | 2026-06-10 | Closed via trailer |

## 背景与目标
ADR-20260607233903985 已接受：CLI `task` 命令在"创建"和"状态流转"两个场景下接口不一致。创建用 `task "title"`（扁平），状态流转用 `task start/review/done <id>`（subcommand）。这导致 agent 误用 `task create "title"`，CLI 将 `create` 解析为 title，生成无意义文件。

目标：实现方案 C（兼容模式）— `task create "title"` 和 `task "title"` 都支持，消除误用模式。

## 需求详情
- [ ] cli.ts `task` case 增加 `arg === 'create'` 分支，使用 `restArgs[0]` 作为 title
- [ ] 更新 help 文本，标注两种用法
- [ ] 测试：`task "title"` 仍工作，`task create "title"` 也工作
- [ ] 更新 AGENTS.md 中的 cortex task 示例

## 技术方案
修改 `packages/lythoskill-project-cortex/src/cli.ts` 的 `task` case：

```typescript
case 'task': {
  let title: string;
  if (arg === 'create' && restArgs[0]) {
    title = restArgs[0];
  } else if (arg) {
    title = arg;
  } else {
    // show help
  }
  createTask(title, config);
  break;
}
```

向后兼容，无破坏性变更。

## 验收标准
- [ ] `bunx @lythos/project-cortex task "Test title"` 正常创建 task
- [ ] `bunx @lythos/project-cortex task create "Test title"` 正常创建 task（title = "Test title"，不是 "create"）
- [ ] `task start/review/done` 等状态流转不受影响
- [ ] AGENTS.md 示例已更新

## 进度记录
<!-- 执行时更新，带时间戳 -->

## 关联文件
- 修改:
- 新增:

## Git 提交信息建议
```
feat(scope): description (TASK-20260610210513827)

- Detail 1
- Detail 2
```

## 备注
