# ADR-20260613182316950: Clarify commit-trailer semantics — Closes is review-then-done, Review is dev-complete-to-review

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-06-13 | Created |
| accepted | 2026-06-13 | Accepted |

## 背景

ADR-20260503003314901 确立了 commit trailer 驱动 cortex 治理文档流转的机制，其中对 `Closes:` 的语义规定为：

> `Closes: TASK-...` → `task review` 然后 `task done`（若已 review，直接 done）

但在实现 TASK-20260503010229362 时，执行者发现该设计存在两个实际问题：

1. **缺少 "开发完成去 review" 的意图表达**。在 kanban 工作流中，commit 最常见的第一种意图是 "我做完了，请 review"（等价于内部提交 PR），而不是 "我已经被 review 并批准了"。原设计没有给这个高频意图一个简洁别名，导致 agent 要么误用 `Closes:`，要么不得不记住 `Task: TASK-xxx review` 这种完整动词形式。

2. **Agent 对 cortex 动词的幻觉风险**。`cortex` CLI 的顶层动词（`start/review/done/complete/...`）虽然对日常人工使用合理，但 agent 在压缩或跨 session 后容易"发明"不存在的动词（例如把 `create` 当成 title）。trailer 越依赖精确动词，出错面越大。

因此实现中新增了两个机制：
- `complete` CLI 命令：any status → completed（显式兜底）
- 把 `Closes: TASK-*` 映射到 `complete`

但这造成了**未经授权的语义漂移**：原 ADR 从未说过可以跳过 review，`Closes:` 被变相变成了 "任何状态直接关闭"。AGENTS.md 和 SSOT conventions.md 随后也沿用了这个漂移。

本 ADR 的目的不是推翻原 ADR 的 kanban 心智，而是**补齐缺失的 "dev complete → review" 语义**，并把 `Closes: TASK-*` 恢复为严格的 "review → done"。

## 决策驱动

1. **严格区分 "做完" 和 "关闭"**：kanban 中 "开发完成" 和 "review 通过" 是两个不同列，trailer 语义必须反映这一点。
2. **减少 agent 动词幻觉**：用意图别名（`Review:` / `Closes:`）替代精确 FSM 动词，降低记忆负担和幻觉面。
3. **保持向后兼容的 CLI 命令**：`complete` 命令继续作为显式 any-status → completed 工具存在，但 `Closes:` 不再偷偷使用它。
4. **可审计的非法状态**：trailer 映射必须文档化，使非法组合能被 CLI 明确拒绝并给出 HATEOAS 式指引，而不是静默成功或误解析。

## 选项

### 方案A: 维持现状（`Closes: TASK-*` → `complete`）

**优点**:
- 零代码改动
- 已有实现和文档一致

**缺点**:
- 违反原 ADR 的 review-then-done 设计
- "做完" 和 "关闭" 被混为一谈
- agent 容易在任何状态下直接关闭任务，缺少 review 关口

### 方案B: 严格执行原 ADR（`Closes: TASK-*` → `review` 然后 `done`）

**优点**:
- 完全符合原 ADR 文字

**缺点**:
- hook 需要在一个 trailer 内连续执行两次状态迁移，实现复杂
- 从 backlog/in-progress 直接 `Closes:` 会失败（backlog 不能 review）
- 没有给 "dev complete → review" 提供简洁别名

### 方案C（推荐）: 拆分意图别名

- `Review: TASK-*` → `review`（in-progress → review），表示 "开发完成，提交 review / 内部 PR"
- `Closes: TASK-*` → `done`（review → completed），表示 "review 通过 / LGTM，正式关闭"
- `Closes: ADR-*` → `adr accept`（不变）
- `Closes: EPIC-*` → `epic done`（不变）
- `complete` CLI 命令保留为显式 any-status → completed 的逃生口

**优点**:
- 语义与 kanban 列一一对应
- 两个高频意图都有简洁别名
- hook 仍只调一次 CLI，实现简单
- 非法状态会被 CLI 明确拒绝

**缺点**:
- 破坏当前 `Closes: TASK-*` 的 any-status-close 行为，需要用户/agent 学习 `Review:`
- 需要更新 AGENTS.md / conventions.md / SKILL.md / 测试

## 决策

**选择**: 方案C

**原因**:

1. **原 ADR 的意图是 review-then-done，不是 skip-review**。方案C 把 `Closes:` 恢复为严格的 review → done，符合原始设计精神。
2. **补齐缺失的 "dev complete → review" 别名**。`Review:` 直接对应 kanban 的 "move to review" 动作，也对应 agent 工作流中的 "内部 PR"。
3. **减少动词幻觉**。agent 不需要记住 `Task: TASK-xxx review` 这种动词形式，只需要在 "做完" 时写 `Review:`，在 "通过" 时写 `Closes:`。
4. **实现简单可靠**。每个 trailer 只触发一次 FSM 迁移，非法迁移由 CLI 拒绝并给出清晰错误。

## 影响

- 正面:
  - `Closes: TASK-*` 恢复为 review → done，符合原 ADR
  - 新增 `Review: TASK-*` 表达 "开发完成去 review"
  - trailer 语义与 kanban 列严格对齐
  - 非法 trailer 组合可被明确检测和拒绝
  - 减少 agent 对 cortex 顶层动词的依赖和幻觉
- 负面:
  - 当前 workflow 中 `Closes: TASK-*` 若 task 不在 review 会失败（这是预期行为）
  - 需要更新所有文档和测试
- 后续:
  - 更新 `packages/lythoskill-project-cortex/src/lib/trailer.ts`
  - 更新 `packages/lythoskill-project-cortex/src/lib/trailer.test.ts`
  - 更新 `AGENTS.md`、`cortex/wiki/04-ssot/conventions.md`、`packages/lythoskill-project-cortex/skill/SKILL.md`
  - 将 ADR-20260503003314901 标记为 superseded by 本 ADR

## 相关

- 关联 ADR:
  - ADR-20260503003314901 (superseded by this ADR on `Closes: TASK-*` semantics)
- 关联 Task:
  - TASK-20260503010229362 (original implementation that introduced the drift)
  - TASK-20260613182153447 (this cleanup)

## Appendix: Trailer → FSM Mapping

| Trailer | Valid ID prefix | Resolves to CLI command | Valid source state | Target state | Illegal source states |
|---------|-----------------|------------------------|-------------------|--------------|----------------------|
| `Review:` | `TASK-*` | `review <ID>` | `in-progress` | `review` | `backlog`, `review`, `completed`, `suspended`, `terminated`, `archived` |
| `Closes:` | `TASK-*` | `done <ID>` | `review` | `completed` | `backlog`, `in-progress`, `completed`, `suspended`, `terminated`, `archived` |
| `Closes:` | `ADR-*` | `adr accept <ID>` | `proposed` | `accepted` | `accepted`, `rejected`, `superseded` |
| `Closes:` | `EPIC-*` | `epic done <ID>` | `active` | `done` | `done`, `suspended`, `archived` |
| `Task:` | `TASK-*` | `<verb> <ID>` | 取决于 verb | 取决于 verb | 无效 verb 或前缀不匹配 |
| `ADR:` | `ADR-*` | `adr <verb> <ID>` | 取决于 verb | 取决于 verb | 无效 verb 或前缀不匹配 |
| `Epic:` | `EPIC-*` | `epic <verb> <ID>` | 取决于 verb | 取决于 verb | 无效 verb 或前缀不匹配 |

说明：`Task:` / `ADR:` / `Epic:` 是显式动词形式，保留给需要非默认迁移的场景（如 `reject`、`suspend`、`supersede`）。`Review:` 和 `Closes:` 是意图别名，覆盖 80% 的日常使用。
