---
category: lesson
domain: testing
date: 2026-06-06
author: kimi
related:
  - TASK-20260606222341617
  - AGENTS.md § "Content-based gate > exit-code suppression"
  - AGENTS.md § "see a bug, fix a bug"
---

# bun test "Unhandled error between tests" = exit code 0 — Silent Test Failure

## Context

`bun test` 在测试之间发生未处理错误（如 `ReferenceError: test is not defined`）时，exit code 仍然是 0。错误不计入 `fail`，而是单独显示为 `error`。

这意味着：**exit code 0 不能保证所有测试都跑了**。

## Incident

- **2026-06-03**: Claude Opus 4.7 在 `packages/lythoskill-deck/src/add.test.ts` 中添加了 `test()` 调用，但文件 import 的是 `it`（bun:test 的 API）
- **结果**: `ReferenceError: test is not defined` — 但 bun test 显示 "35 pass, 0 fail, 1 error"，exit code 0
- **存活时间**: 2 天（CI、pre-commit、ZK Review 三轮均未发现）
- **发现方式**: 另一个 agent 用 sed 批量替换时，测试报错数量变化，才注意到异常

## Root Cause

1. **Agent 错误**: copy-paste 了 `test()` 代码，没检查 import 是否匹配
2. **ZK Review 盲区**: 三轮审计检查了测试结构、覆盖率、边界 case，但没检查"代码能不能跑"
3. **Guard 盲区**: `scripts/pre-commit-test.ts` 只解析 `(\d+) fail`，不解析 `(\d+) error`
4. **工具行为**: bun test 的 "Unhandled error between tests" 不算 fail，exit code 0

## Fix

### Guard 修复

**pre-commit-test.ts** — 同时检查 error 数量:
```ts
const errorMatch = stdout.match(/(\d+) error/);
const errors = errorMatch ? parseInt(errorMatch[1]) : 0;
if (fails > 0 || errors > 0) { block commit }
```

**adr-check.sh** — 新增 import/call 一致性检查:
```bash
# 遍历 packages/*/src/*.test.ts
# import it + call test() → error
# import test + call it() → error
```

### 文化修复

AGENTS.md 新增硬规则:
> **See a bug, fix a bug — no "not my code."** Git provenance tells you who introduced it; that information is for learning, not for excusing.

## When to Apply

- 任何解析测试输出、检查测试结果的脚本
- 任何依赖 exit code 判断"是否通过"的 CI 流程
- bun test、jest、vitest 等框架都有类似的 "error vs fail" 区分

## When NOT to Apply

- 如果测试框架本身在 error 时返回非零 exit code（如某些 jest 配置），则不需要额外解析 stdout
- 如果测试输出被重定向到文件且不再解析，则此 lesson 不适用

## Related

- [AGENTS.md § Content-based gate > exit-code suppression](../04-ssot/...)
- [AGENTS.md § see a bug, fix a bug](../...)
- [TASK-20260606222341617](../../tasks/04-completed/TASK-20260606222341617-...)
- ADR-20260511-test-infrastructure-audit-real-counts-dead-gates（同类问题：exit code 掩盖真实失败）
