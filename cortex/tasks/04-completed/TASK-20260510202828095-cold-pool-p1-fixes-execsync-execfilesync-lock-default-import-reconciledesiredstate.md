# TASK-20260510202828095: cold-pool P1 fixes — execSync→execFileSync, --lock default, import ReconcileDesiredState

## Status History

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-10 | Created |
| completed | 2026-05-10 | Completed — commit bdd8069 |

## 背景与目标

Cold-pool CLI 在 v0.9.x 阶段有三处 P1 级工程债务，影响安全性和可维护性：

1. `execSync('git pull', ...)` 使用 shell 字符串拼接，存在命令注入风险
2. `--lock` 参数没有默认值，用户每次都必须显式传递
3. `ReconcileDesiredState` 类型定义在 `reconcile-plan.ts` 中，但 CLI 入口没有正确 import

## 需求详情

- [x] 将所有 `execSync('git ...')` 替换为 `execFileSync('git', [...args])`
- [x] `--lock` 默认值设为 `'./skill-deck.lock'`
- [x] `cli.ts` 正确 import `ReconcileDesiredState` 类型

## 技术方案

| 修复项 | 原代码 | 修复后 | 文件 |
|--------|--------|--------|------|
| execSync→execFileSync | `execSync('git pull', {cwd: dir})` | `execFileSync('git', ['pull'], {cwd: dir})` | `git-io.ts:44` |
| --lock default | 无默认值，必填 | `'./skill-deck.lock'` | `cli.ts:115` |
| ReconcileDesiredState import | 未 import | `import type { ReconcileDesiredState } from './reconcile-plan.js'` | `cli.ts:16` |

## 验收标准

- [x] `git-io.ts` 中无 `execSync` 调用，全部使用 `execFileSync`
- [x] `cli.ts --lock` 不传参时默认指向 `./skill-deck.lock`
- [x] `cli.ts` 编译通过，`ReconcileDesiredState` 被正确使用于 `buildReconcilePlan` 调用
- [x] 所有 cold-pool 单元测试通过

## 进度记录

- 2026-05-10: 三处修复合并入 sweep commit `bdd8069`

## 关联文件

- 修改: `packages/lythoskill-cold-pool/src/git-io.ts`
- 修改: `packages/lythoskill-cold-pool/src/cli.ts`

## Git 提交信息建议
```
fix(cold-pool): P1 — execFileSync, --lock default, ReconcileDesiredState import (TASK-20260510202828095)
```
