# TASK-20260615221943775: Trailer prefix-to-kind routing: unify CLI command format to kind+verb+id

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-06-15 | Created |
| in-progress | 2026-06-15 | Started |
| review | 2026-06-15 | Deliverables committed |
| completed | 2026-06-15 | Done |

## Background & Goals

`trailer.ts` 的前缀分支（`Task:`/`Epic:`/`ADR:`/`Closes:`/`Review:`）和 `cli.ts` 的命令路由之间存在隐式耦合，没有显式映射表。当前 `buildDispatchCommands` 生成的命令格式不一致：

- `Task:` → `review TASK-xxx`（顶层动词命令，隐式 kind=task）
- `Epic:` → `epic resume EPIC-xxx`（子命令格式，显式 kind=epic）
- `ADR:` → `adr accept ADR-xxx`（子命令格式，显式 kind=adr）

这导致 `Task:` 前缀的 verb 和顶层命令动词共享同一个命名空间。如果未来 `review`/`resume`/`done` 等动词也用于 epic 或 adr，就会产生冲突。例如 `Task: EPIC-xxx resume` 会被错误路由到 `moveTask`（只搜索 `cortex/tasks/`），导致 "Task not found"。

2026-06-15 已做临时修复：`Task:` 分支强制要求 `TASK-` 前缀，并禁止 `task` 作为动词。但这只是防御性补丁，架构问题仍在。

## Requirements

- [ ] 统一 CLI 命令格式为 `kind verb id`（如 `task review TASK-xxx`、`epic resume EPIC-xxx`、`adr accept ADR-xxx`）
- [ ] `trailer.ts` 的 `buildDispatchCommands` 对所有前缀统一生成 `kind verb id` 格式
- [ ] `cli.ts` 添加 `task` 子命令路由（`task start`/`task review`/`task done`/`task complete`/`task suspend`/`task resume`/`task reject`/`task terminate`/`task archive`）
- [ ] 保留顶层动词命令作为向后兼容别名（`review TASK-xxx` 等价于 `task review TASK-xxx`）
- [ ] 更新 `trailer.test.ts` 期望输出
- [ ] 更新 SKILL.md / AGENTS.md / state-machines.md 文档中的 trailer 语法示例

## Technical Approach

1. **trailer.ts**: 统一所有前缀生成 `kind verb id` 格式
   - `Task:` → `task ${verb} ${id}`（如 `task review TASK-xxx`）
   - `Closes: TASK-*` → `task done ${id}`（保持严格语义 review→completed）
   - `Review: TASK-*` → `task review ${id}`
   - `Epic:` → `epic ${verb} ${id}`（已有，不变）
   - `ADR:` → `adr ${verb} ${id}`（已有，不变）
2. **cli.ts**: 添加 `task <verb>` 子命令路由
   - `task` 子命令动词白名单：`create`, `start`, `review`, `done`, `complete`, `suspend`, `resume`, `reject`, `terminate`, `archive`
   - `task "title"`（无动词或动词不在白名单）→ 创建新 task（legacy）
   - `task create "title"` → 创建新 task
   - `task review TASK-xxx` → 状态转移
   - 提取共享函数 `handleTaskTransition(verb, taskId, config)` 供顶层别名和子命令共用
3. **向后兼容**: 顶层 `case 'review':`/`case 'done':`/... 保留，内部调用 `handleTaskTransition`
4. **文档同步**: SKILL.md / AGENTS.md / state-machines.md 的 trailer 示例更新为 `task review TASK-xxx` 格式

### 动词映射表（trailer.ts → cli.ts）

| Trailer 前缀 | 生成的命令 | cli.ts 处理 |
|-------------|----------|------------|
| `Task: TASK-xxx review` | `task review TASK-xxx` | `handleTaskTransition('review', id)` |
| `Closes: TASK-xxx` | `task done TASK-xxx` | `handleTaskTransition('done', id)` |
| `Review: TASK-xxx` | `task review TASK-xxx` | `handleTaskTransition('review', id)` |
| `Epic: EPIC-xxx resume` | `epic resume EPIC-xxx` | `moveEpic(id, 'active')`（已有） |
| `ADR: ADR-xxx accept` | `adr accept ADR-xxx` | `moveAdr(id, 'accepted')`（已有） |

### `handleTaskTransition` 映射

| 动词 | 目标状态 | 选项 |
|-----|--------|------|
| `start` | `in-progress` | — |
| `review` | `review` | — |
| `done` | `completed` | — |
| `complete` | `completed` | `{ allowAny: true, note: 'Closed via trailer' }` |
| `suspend` | `suspended` | — |
| `resume` | `in-progress` | `{ note: 'Resumed' }` |
| `reject` | `in-progress` | `{ note: 'Re-work required' }` |
| `terminate` | `terminated` | `{ allowAny: true, note: 'Terminated' }` |
| `archive` | `archived` | `{ allowAny: true, note: 'Archived' }` |

## Acceptance Criteria

- [ ] `bun packages/lythoskill-project-cortex/src/cli.ts task review TASK-xxx` 成功移动 task 到 review
- [ ] `bun packages/lythoskill-project-cortex/src/cli.ts review TASK-xxx` 仍然成功（向后兼容）
- [ ] `bun packages/lythoskill-project-cortex/src/cli.ts task done TASK-xxx` 成功（严格 review→completed）
- [ ] `bun packages/lythoskill-project-cortex/src/cli.ts task complete TASK-xxx` 成功（any status→completed）
- [ ] `trailer.test.ts` 中 `Task:` 测试期望 `task review TASK-xxx` 而不是 `review TASK-xxx`
- [ ] `trailer.test.ts` 中 `Closes: TASK-*` 测试期望 `task done TASK-xxx` 而不是 `done TASK-xxx`
- [ ] `trailer.test.ts` 中 `Review: TASK-*` 测试期望 `task review TASK-xxx` 而不是 `review TASK-xxx`
- [ ] 所有 22+ trailer tests pass
- [ ] 所有 move.ts / cli.ts 相关 tests pass（通过手动 CLI 测试验证）
- [ ] SKILL.md trailer 示例更新
- [ ] AGENTS.md trailer 示例更新（如果不同）

## Related Files
- Modified:
  - `packages/lythoskill-project-cortex/src/lib/trailer.ts`
  - `packages/lythoskill-project-cortex/src/lib/trailer.test.ts`
  - `packages/lythoskill-project-cortex/src/cli.ts`
  - `packages/lythoskill-project-cortex/skill/SKILL.md`
  - `packages/lythoskill-project-cortex/skill/references/state-machines.md`
- Added:
  - (none)

## Git Commit Message
```
feat(cortex): unify trailer dispatch to kind+verb+id format (TASK-20260615221943775)

- trailer.ts: Task: prefix now generates 'task <verb> <id>' instead of '<verb> <id>'
- cli.ts: add 'task <verb>' subcommands for all state transitions
- Backward compat: top-level verbs (review/done/complete/...) still work
- Sync SKILL.md + state-machines.md trailer examples
```

## Notes
- 临时防御性补丁（Task: 前缀检查 + task 动词禁止）在 2026-06-15 已提交，本任务完成后保留作为额外安全层
- `moveTask` 签名: `moveTask(taskId, targetStatus, config, options?)`，`options: { note?: string, allowAny?: boolean }`
- `cli.ts` 和 `move.ts` 没有独立测试文件，验证通过 `trailer.test.ts` + 手动 CLI 测试
- `task start` 加入动词列表是为了完整性（CLI 直接调用场景），trailer 不生成 `task start`
- 参考 commit: 4c5d598（trailer.ts 初始引入，Claude 4.6 co-authored）
- 参考 commit: 4fb4401（Review: 前缀添加，Claude 4.6 co-authored）
