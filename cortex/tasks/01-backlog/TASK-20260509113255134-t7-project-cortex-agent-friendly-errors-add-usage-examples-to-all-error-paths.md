# TASK-20260509113255134: T7 — project-cortex agent-friendly errors: add Usage + examples to all error paths

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-09 | Created |
| backlog | 2026-05-09 | Inventory 完成 — 实际 cortex 错误信息覆盖**不均**(epic.ts 已 ✅,cli.ts 顶层 + move.ts/wiki.ts 多处 🔴/🟡),起因是急行军式增量加命令 |

## 背景与目标

原始假设(daily 历史段写的)是"project-cortex 错误信息最重 🔴"。本次盘点发现这个判断**部分过时**:`commands/epic.ts` 内部错误已经写得相当 HATEOAS(lane-full 给 4 个修复方案 + override + 列出现有 epic;非 TTY checklist 给 skip 路径)。

实际未拉齐的是**两组**:
1. `cli.ts` 顶层 switch 的 9+ 处"❌ Please provide X"型一行错误(随增量加命令复制粘贴出来,从未升级)
2. `commands/move.ts` 和 `commands/wiki.ts` 里的几处 partial / bare 错误

目标: 把这两组拉齐到 epic.ts 的 HATEOAS 标准 — 每条 error 含**问题 + Usage + 具体可执行示例 + 列出/查询现有项的命令**(≈ T9 playbook 的 S2-S5 基线)。

## 错误路径全文盘点

| 文件:行 | 触发点 | 当前文本 | 分类 | 备注 |
|---|---|---|---|---|
| `cli.ts:126` | `task` 无 title | `❌ Please provide a task title` | 🔴 bare | |
| `cli.ts:134` | `epic` 无 args | `❌ Please provide an epic title or subcommand (done\|suspend\|resume)` | 🔴 bare | 没列 `--lane` 必填 |
| `cli.ts:141` | `epic <verb>` 无 ID | `❌ Please provide an epic ID for "epic ${arg}"` | 🔴 bare | |
| `cli.ts:168` | epic 创建 catch | `❌ Epic creation failed: ${err.message}` | 🔴 bare | "通用 catch" 反模式 — 未提常见原因 |
| `cli.ts:176` | `adr` 无 args | `❌ Please provide an ADR title or subcommand (accept\|reject\|supersede)` | 🔴 bare | |
| `cli.ts:182` | `adr <verb>` 无 ID | `❌ Please provide an ADR ID for "adr ${arg}"` | 🔴 bare | |
| `cli.ts:243` | `wiki` 无 title | `❌ Please provide a wiki title` | 🔴 bare | 未提 `--category` |
| `cli.ts:261-303` | 9 处 task state-machine 无 ID(`start`/`review`/`done`/`complete`/`suspend`/`resume`/`reject`/`terminate`/`archive`) | `❌ Please provide a task ID` | 🔴 bare ×9 | 同模式 9 次,可抽 helper |
| `commands/epic.ts:24-26` | 缺/无效 `--lane` | Usage + main vs emergency 含义 | ✅ HATEOAS | 不动 |
| `commands/epic.ts:35-46` | lane 已满 | 4 修复方案 + override + 列出 active | ✅ HATEOAS | 不动 |
| `commands/epic.ts:58-59` | 非 TTY 但需 checklist | 给 `--skip-checklist` 提示 | ✅ HATEOAS | 不动 |
| `commands/epic.ts:67-69` | checklist 失败 | 重新考虑 + bypass 路径 | ✅ HATEOAS | 不动 |
| `commands/move.ts:168` | doc not found | `❌ ${kind.label} not found: ${docId}` | 🔴 bare | 未建议跑 `list` 查 ID |
| `commands/move.ts:182-184` | 非法 transition | 列 allowed targets,但 `Use --force to override` **是错的**(CLI 没有 `--force` 这个 flag) | 🟡 misleading | 修文案 + 移除 `--force` 错误指示 |
| `commands/move.ts:190` | 未知状态 | bare | 🔴 rare/internal | 改不改皆可 |
| `commands/move.ts:197` | config 缺 subdir | bare | 🔴 rare/internal | 改不改皆可 |
| `commands/wiki.ts:25` | 未知 category | `❌ Unknown category: X. Use: pattern, faq, or lesson` | 🟡 partial | 加 example + index 提示 |
| `commands/{adr,task,init,list,flow,stats,probe}.ts` | 无错误路径 | — | — | 这些命令是创建/列出型,前置由 cli.ts 顶层挡掉 |

**总计**:
- 🔴 bare: 17 处(cli.ts 16 + move.ts 3 + 部分 misleading)
- 🟡 partial / misleading: 2 处
- ✅ 已 HATEOAS: 4 处(全在 epic.ts)

## 技术方案

### 拆分 / 不拆分
- **拆 helper**: `cli.ts` 9 处 task state-machine "缺 ID" 完全同模式,抽一个 `requireDocId(arg, command, kind, hint?)` 减少重复 + 保证内容一致(`Usage` / `Example` / `cortex list` 提示)。
- **不拆 helper**: 顶层 `task`/`epic`/`adr`/`wiki` 4 处入口错误每条都有独有上下文(lane / category / 文件命名规则),inline 写更清晰。

### 错误模板(每处统一三段)
```
❌ <精确问题>

Usage:    <copy-pastable command pattern>
Example:  <带真实 ID/标题的具体示例>

<下一步提示: cortex list / cortex --help / 等>
```

### move.ts:184 必须修
"Use --force to override" 描述了一个**不存在的 flag** — 用户复制就会失败。要么去掉这一行,要么把 `--force` 的语义真正实现(目前用 `complete`/`terminate`/`archive` 通过 `allowAny: true` 实现 any-status 转换,但这是隐式的)。最小改动: 去掉那行 + 引导用户去用 `complete` / `terminate` / `archive` 这些 any-status 子命令。

### Out of scope(留给 T8)
- `commands/move.ts` 内部的 internal-only error(line 190 / 197):config 损坏才会触发,agent 也救不了
- `commands/template.ts:32` 的 `throw new Error()`:开发时硬错误,不是用户能修的

## 验收标准

- [ ] cli.ts 17 处 🔴 bare 全部升级到三段 HATEOAS 模板
- [ ] cli.ts state-machine 9 处共用 `requireDocId` helper
- [ ] move.ts:168 (not found) 加 `cortex list` 提示
- [ ] move.ts:182-184 (invalid transition) 修掉 `--force` 谎言,引导到正确的 any-status 子命令
- [ ] wiki.ts:25 (unknown category) 加 example + index 提示
- [ ] T9 playbook 的 cortex 适配版 subagent 跑过(每个 🔴/🟡 行有对应场景)
- [ ] 既有 cortex 单元测试(若有)继续 pass

## 进度记录

- 2026-05-09 ~13:30: 任务创建(stub)
- 2026-05-09 ~16:00 (此次会话): 全文盘点完成,实际 17 🔴 + 2 🟡 + 4 ✅,改写假设 — 不再当作"全 cortex 大改"

## 关联文件

- 修改:
  - `packages/lythoskill-project-cortex/src/cli.ts`(顶层 switch + helper)
  - `packages/lythoskill-project-cortex/src/commands/move.ts`(not-found / invalid-transition)
  - `packages/lythoskill-project-cortex/src/commands/wiki.ts`(unknown-category)
- 不修改:
  - `packages/lythoskill-project-cortex/src/commands/epic.ts`(已 ✅ HATEOAS,本次 baseline 范例)
- 复用:
  - `cortex/wiki/01-patterns/2026-05-09-dormancy-property-test-for-fallback-hints.md`(检查 cortex CLI 是否有 fallback hint — 目前没有,但 probe 命令未来可能加)
  - T9 playbook 的 S1-S5 模板(无参错误 + Usage + Example + list pointer)

## Git 提交信息建议
```
feat(project-cortex): HATEOAS errors in cli.ts top-level switch + move.ts/wiki.ts (TASK-20260509113255134)

- cli.ts 17 bare errors升级到三段模板(问题/Usage+Example/list提示)
- 抽 requireDocId helper 复用 9 处 task state-machine 入口
- move.ts:184 修掉不存在的 --force 引用,导向正确的 any-status 子命令
- wiki.ts:25 加 example + index regenerate 提示
- 不动 epic.ts(已是 HATEOAS baseline)
- T9 playbook 的 cortex 适配场景全 ✅
```

## 备注

- daily 顶部历史段把 project-cortex 标为"🔴 最重"是**急行军时刻**的判断 — 当时 epic.ts 还没改。本次盘点修正这个判断: 实际**最重的是 cli.ts 顶层一行错误**(数量多 + 都是 bare + 复制粘贴出来),而 epic.ts 已经先一步达成 HATEOAS 标准
- T9 playbook 的 dormancy 维度(`feedback_dormancy_property_test_for_fallbacks.md`)在 cortex 上**目前不直接适用** — cortex 没有 fallback / mirror 类提示。但 `probe` 命令未来若加"自动修复 / 静默回滚"类 fallback,需补 dormancy 测试
- 多平台路径(`~/.claude/skills` vs `~/.agents/skills`)与 T7 无直接关系,挂在另一个 task 处理
