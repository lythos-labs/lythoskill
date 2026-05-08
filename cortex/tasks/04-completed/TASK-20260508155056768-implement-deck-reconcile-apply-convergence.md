# TASK-20260508155056768: Implement deck reconcile --apply convergence

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-08 | Created |
| completed | 2026-05-08 | Closed via trailer |

## 背景与目标

当前 `deck reconcile` 是纯 plan-first：分析 lock file 与 cold-pool 实际状态的 drift（missing / behind / extra），输出报告并提示手动命令。用户需要逐条复制粘贴执行，体验断裂。

目标：实现 `--apply` 标志，让 reconcile 从"报告"升级为"自动收敛"，同时保留 plan-only 作为默认安全行为。

## 需求详情

- [ ] `deck reconcile --apply` 读取 `buildReconcilePlan()` 输出并自动执行修复动作
- [ ] `deck reconcile --dry-run` 显式保留 plan-only 预览模式（与默认行为一致）
- [ ] 三种 drift 的自动修复映射：
  - **missing** → `deck add <locator>`（添加到 lock + working set）
  - **behind** → `deck refresh <alias>`（更新到 cold-pool HEAD）
  - **extra** → `cold-pool prune` 或 `deck remove <alias>`（清理孤儿）
- [ ] 执行前展示完整 plan，要求用户确认（TTY 下 interactive prompt；CI 下用 `--yes` 跳过）
- [ ] 部分失败不中断：单个子操作失败记录错误，继续执行剩余操作，最后汇总

## 技术方案

- 复用 `packages/lythoskill-cold-pool/src/reconcile-plan.ts` 的纯函数输出 `{ missing, behind, extra }`
- 在 `packages/lythoskill-deck/src/reconcile.ts` CLI 层新增 `--apply` 分支
- 调用已有 CLI 子命令的 programmatic API（避免 shell spawn 引入新的 async/错误处理复杂度）
- 参考 `packages/lythoskill-cold-pool/src/validate-plan.ts` 的 drift 分类逻辑

## 验收标准

- [ ] `deck reconcile --apply` 在无 drift 时输出 "✅ No drift detected, nothing to apply"
- [ ] 有 drift 时先打印 plan 表格，提示 "Apply these changes? [y/N]"
- [ ] `--yes` 标志跳过确认直接执行（CI 场景）
- [ ] 单个子操作失败时不中断整体流程，最后输出失败汇总
- [ ] 单测覆盖 apply 路径（mock plan 输入，验证执行顺序和错误处理）
- [ ] Agent BDD 场景：`test/scenarios/deck-reconcile-apply.agent.md`

## 进度记录
<!-- 执行时更新，带时间戳 -->

## 关联文件

- 修改: `packages/lythoskill-deck/src/reconcile.ts`
- 修改: `packages/lythoskill-deck/src/cli.ts`（添加 --apply / --yes 参数）
- 新增: `packages/lythoskill-deck/src/reconcile-apply.test.ts`
- 参考: `packages/lythoskill-cold-pool/src/reconcile-plan.ts`
- 参考: `packages/lythoskill-cold-pool/src/validate-plan.ts`
- 参考: `test/scenarios/deck-reconcile.agent.md`

## Git 提交信息建议

```
feat(deck): reconcile --apply auto-convergence (TASK-20260508155056768)

- Apply missing/behind/extra drift fixes automatically
- Interactive confirmation + --yes for CI
- Partial failure tolerance: log and continue

Closes: TASK-20260508155056768
```

## 备注

当前 reconcile plan 已由独立 subagent 验证通过（BDD agent test PASS）。apply 层只负责执行，不改动 plan 纯函数逻辑。
