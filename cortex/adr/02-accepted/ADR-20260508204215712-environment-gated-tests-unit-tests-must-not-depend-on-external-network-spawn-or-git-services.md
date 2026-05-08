# ADR-20260508204215712: Environment-gated tests

## Status History

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-05-08 | Created |
| accepted | 2026-05-08 | Accepted |

## 背景

2026-05-08 session 中运行全量 `bun test` 时发现 6 个测试失败，全部来自环境依赖：`git-hash.test.ts`（需要 git repo 和凭证）、`feed-adapters.test.ts`（需要 `@lobehub/market-cli`）、`curator-core.test.ts`（`git clone` 网络操作）。

这些测试在没有对应环境（CI runner、fresh install）时失败或超时，拉低了测试结果的可信度——643 pass / 6 fail 看起来像有 bug，实际是环境缺失。

核心问题：**`bun test` 没有区分纯单元测试和环境依赖的集成测试。**

## 决策驱动

- `bun test` 应该作为纯本地命令在任何环境中可靠通过
- CI 应该跑所有能跑的测试，但不应该因为缺失外部依赖而报红
- 不应该要求开发者安装 `@lobehub/market-cli` 或配置 git 凭证才能看到绿色

## 选项

### 方案A：将环境依赖测试移到 `test/integration/` 目录

**优点**: 物理分离，CI 可以选择性运行
**缺点**: 大改动，需要迁移现有测试文件

### 方案B：每个环境依赖测试加 guard（`if (canRun) { test(...) } else { test.skip(...) }`）

**优点**: 改动最小，原地修复
**缺点**: 分散在各处，没有统一规则

### 方案C：方案 B + pre-commit check 防止回归

## 决策

**选择**: 方案 C

**原因**:
1. 方案 B 改动最小，每个测试文件的改动范围不超过 5 行
2. Pre-commit hook 在 `packages/*/src/*.test.ts` 中检测 `fetch(`、`spawn(`、`git clone`、`simpleGit(` 等模式，如果发现且没有对应的 skip/guard，block 并提示
3. 不需要大范围重构，风险最低

## 影响

- **正面**: `bun test` 在任何环境都可靠通过；CI 不再因为缺失外部依赖而报红
- **负面**: 环境依赖测试在缺失环境时被 skip，需要手动运行验证
- **后续**:
  1. 修复 git-hash.test.ts：`beforeAll` 中检查 `git init` 是否可用
  2. 修复 feed-adapters.test.ts：LobeHub adapter 已有 `test.skipIf(!!process.env.CI)`，但需要 `try/catch` spawn 而非超时
  3. 修复 curator-core 中的网络测试：`git clone` 测试加 network guard
  4. Pre-commit hook 添加环境调用检测

## 相关

- 关联 TASK: `TASK-20260508204204714`
- 关联 TASK: `TASK-20260504231944285` (pure refreshes, no git IO)
