# ADR-20260615222023418: Unify trailer dispatch to kind+verb+id CLI format

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-06-15 | Created |
| accepted | 2026-06-15 | Accepted |

## Background

`trailer.ts` 的前缀分支（`Task:`/`Epic:`/`ADR:`/`Closes:`/`Review:`）和 `cli.ts` 的命令路由之间存在隐式耦合，没有显式映射表。当前 `buildDispatchCommands` 生成的命令格式不一致：

- `Task:` → `review TASK-xxx`（顶层动词命令，隐式 kind=task）
- `Epic:` → `epic resume EPIC-xxx`（子命令格式，显式 kind=epic）
- `ADR:` → `adr accept ADR-xxx`（子命令格式，显式 kind=adr）

`Task:` 前缀的 verb 和顶层命令动词共享同一个命名空间。`Task: EPIC-xxx resume` 会被错误解析为 `resume EPIC-xxx`，然后 `cli.ts` 的 `case 'resume':` 硬编码调用 `moveTask`（只搜索 `cortex/tasks/`），导致 "Task not found" 报错。

2026-06-15 已做临时防御性补丁：`Task:` 分支强制要求 `TASK-` 前缀，并禁止 `task` 作为动词。但这只是防御性补丁，架构层面的隐式耦合问题仍在。

## Decision Drivers

1. **前缀应该决定 kind，动词决定 action** — 当前 `Task:` 前缀不生成 `task` 前缀的命令，导致前缀和 CLI 路由之间信息丢失
2. **未来扩展性** — 如果 `review`/`resume`/`done` 等动词也用于 epic 或 adr，顶层命令冲突不可避免
3. **一致性** — `Epic:` 和 `ADR:` 已经使用 `kind verb id` 格式（`epic resume EPIC-xxx`），`Task:` 应该对齐
4. **明确性优于简洁性** — `task review TASK-xxx` 比 `review TASK-xxx` 更冗长但更明确，不容易出错

## Options

### Option A: 统一为 `kind verb id` 格式，保留顶层动词作为向后兼容别名

**Pros**:
- 前缀和 CLI 路由之间显式映射，无信息丢失
- 所有 kind 的命令格式一致
- 未来扩展不会冲突（`task review`、`epic review`、`adr review` 可以共存）
- 错误使用 `Task: EPIC-xxx resume` 时，生成的 `task resume EPIC-xxx` 会被 `cli.ts` 的 `task` 子命令检查前缀，给出明确错误

**Cons**:
- 需要修改 `cli.ts` 添加 `task` 子命令路由
- 需要更新文档中的示例
- 顶层动词保留作为别名，增加一点维护负担

### Option B: 保持现状，仅在 `trailer.ts` 加强防御性检查

**Pros**:
- 改动最小
- 顶层动词命令更简洁（`review TASK-xxx` vs `task review TASK-xxx`）

**Cons**:
- 隐式耦合问题仍在，未来扩展时必然冲突
- 前缀和 CLI 路由之间的映射靠人脑记住，容易出错
- 防御性检查无法覆盖所有错误组合（如 `Task: TASK-xxx epic resume` 这种奇怪组合）

## Decision

**Choice**: Option A

**Rationale**:
- 明确性优于简洁性。`task review TASK-xxx` 虽然多打 5 个字符，但消除了 "前缀和动词共享命名空间" 的整类 bug
- 与 `epic resume EPIC-xxx` 和 `adr accept ADR-xxx` 对齐，三者格式统一
- 向后兼容别名（`review TASK-xxx` 仍然工作）降低迁移成本
- 防御性补丁（2026-06-15）可以作为额外安全层保留，不冲突

## Impact

- Positive:
  - 消除前缀-路由隐式耦合的整类 bug
  - 未来扩展（如 `epic review`）不会冲突
  - 新用户从 `Epic:`/`ADR:` 示例自然理解 `Task:` 的格式
- Negative:
  - 需要修改 `cli.ts`、`trailer.ts`、测试、文档
  - 顶层动词别名需要长期维护
- Follow-up:
  - TASK-20260615221943775: 实施本 ADR 的具体开发任务
  - 更新 AGENTS.md 的 trailer 示例（如果不同）
  - 更新 SKILL.md 和 state-machines.md

## Related
- Related ADR: ADR-20260503003314901（cortex governance documents via commit trailer，被本 ADR 扩展）
- Related Epic: EPIC-20260503010218940（cortex state machine + trailer flow，本 ADR 是其架构演进）
- Related Task: TASK-20260615221943775（实施本 ADR）
- 参考 commit: 4c5d598（trailer.ts 初始引入，Claude 4.6 co-authored）
- 参考 commit: 4fb4401（Review: 前缀添加，Claude 4.6 co-authored）
