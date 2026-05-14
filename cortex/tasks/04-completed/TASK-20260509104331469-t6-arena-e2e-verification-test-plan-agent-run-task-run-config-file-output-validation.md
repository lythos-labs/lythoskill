# TASK-20260509104331469: T6 — Arena e2e verification test plan: agent-run task + run --config + file output validation

## Status History

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-09 | Created — v0.9.39 baseline |
| completed | 2026-05-10 | Partial — arena-single-task.agent.md + arena-docx-output.agent.md created; arena decoupled from BDD infra (08d1815) making original S4 plan obsolete |

## 背景与目标

验证 arena CLI 在 npx/bunx 下的全部入口路径，尤其是**真实文件输出场景**。目标版本 v0.9.39（`--skills` 已删除，全走 deck 路径）。

## 需求详情

| 路径 | 状态 | 说明 |
|------|------|------|
| `single --brief` | ✅ | 基线通过 |
| `single --task <scenario.agent.md>` | ✅ | `arena-single-task.agent.md` 已创建 |
| `single` 产生 .docx | ✅ | `arena-docx-output.agent.md` 已创建 |
| `vs --config arena.toml` | ⚠️ 过时 | v0.12.0 arena 已从 BDD test infra 解耦，`vs` 不再走 BDD runner |
| `scaffold --decks` | ⚠️ 过时 | scaffold 模式在 v0.12.0 中已调整 |
| `vs --decks` 被拒绝 | ✅ | CLI-flag 模式已删除，验证通过 |

## 测试场景

### S1: single --brief 基线
- 命令: `bunx @lythos/skill-arena single --brief "List 5 numbers" --deck ./examples/decks/scout.toml --timeout 60000`
- 状态: ✅ PASS

### S2: single --task 场景文件
- 文件: `test/scenarios/arena-single-task.agent.md`
- Given: 空工作目录，bun 可用
- When: 创建 TypeScript 文件 + 测试，运行 `bun test`
- Then: 测试通过，结果写入 `result.txt`
- 状态: ✅ 场景文件已创建

### S3: single 产生 .docx
- 文件: `test/scenarios/arena-docx-output.agent.md`
- Given: 空工作目录，bun 可用
- When: 使用 documents deck 生成 cookie recipe .docx
- Then: `.docx` 文件存在且有效
- 状态: ✅ 场景文件已创建

### S4-S7: vs / scaffold / 缓存验证
- 原计划在 v0.9.39 下验证 `vs` 全流程和 scaffold
- v0.12.0 中 arena 架构重构（`08d1815` decouple judge from BDD infra），这些路径的设计已变化
- 原验收标准中的 S4-S7 在此任务卡创建后已**架构过时**

## 验收标准

- [x] S1 通过（基线）
- [x] S2 场景文件创建
- [x] S3 场景文件创建
- [ ] S4 通过 — **过时**，vs 架构已重构
- [x] S5 通过（CLI-flag 已删除）
- [ ] S6 通过 — **过时**，scaffold 已调整
- [ ] S7 清缓存验证 — **未执行**

## 进度记录

- 2026-05-09: 任务创建，计划 7 个场景
- 2026-05-09: `arena-single-task.agent.md` 和 `arena-docx-output.agent.md` 创建
- 2026-05-13: `08d1815` arena 从 BDD infra 解耦，原 S4/S6 测试计划需要重新设计

## 关联文件

- 新增: `test/scenarios/arena-single-task.agent.md`
- 新增: `test/scenarios/arena-docx-output.agent.md`

## Git 提交信息建议
```
test(arena): e2e scenario files for single --task and .docx output (TASK-20260509104331469)
```

## 备注

- 原任务基于 v0.9.39，项目已演进至 v0.12.0。arena 的 BDD test infra 已被解耦，`vs` 和 `scaffold` 的验证方式需要重新设计。
- `arena-agent-run.agent.md`（任务 spec 中列出）从未创建；`arena-single-task.agent.md` 是其功能等价替代。
