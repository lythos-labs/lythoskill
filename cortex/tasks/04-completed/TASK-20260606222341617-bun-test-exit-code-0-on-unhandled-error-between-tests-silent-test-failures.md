# TASK-20260606222341617: bun test exit code 0 on 'Unhandled error between tests' — silent test failures

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-06-06 | Created |
| in-progress | 2026-06-06 | Started |
| completed | 2026-06-06 | Fixed: guard added to pre-commit-test.ts + adr-check.sh |
| review | 2026-06-06 | Deliverables committed |
| completed | 2026-06-06 | Closed via trailer |

## 背景与目标

**Incident**: bun test 在发生 "Unhandled error between tests" 时 exit code 仍为 0，导致测试静默失败。pre-commit 的 test gate 只检查 `fail` 数量，不检查 `error` 数量，因此无法拦截。

**Root cause**: `scripts/pre-commit-test.ts` 第 56 行只解析 `(\d+) fail`，忽略了 `(\d+) error`。

**Impact**: Claude Opus 4.7 在 2026-06-03 引入的 `test()` / `it` import 不匹配 bug（packages/lythoskill-deck/src/add.test.ts 和 packages/lythoskill-cold-pool/src/git-hash.test.ts）存活了 2 天，期间所有 CI/pre-commit 都显示通过。

## 需求详情

- [x] 修复 pre-commit-test.ts：同时检查 fail 和 error 数量
- [x] 修复 adr-check.sh：新增 test 文件 import/call 一致性检查
- [x] 修复 33 个测试文件的 import/call 不匹配
- [x] 沉淀为 wiki lesson

## 技术方案

1. **pre-commit-test.ts**: 在 fail 检查旁增加 error 检查
   ```ts
   const errorMatch = stdout.match(/(\d+) error/);
   const errors = errorMatch ? parseInt(errorMatch[1]) : 0;
   if (fails > 0 || errors > 0) { ... }
   ```

2. **adr-check.sh**: 遍历所有 `packages/*/src/*.test.ts`，检查 import 和调用是否匹配
   - import `it` 但调用 `test()` → error
   - import `test` 但调用 `it()` → error

3. **测试修复**: 统一所有 `test()` → `it()`（bun:test 的 API 标准）

## 验收标准

- [x] pre-commit 能拦截 "0 fail, 1 error" 的情况
- [x] adr-check 能拦截 import/call 不匹配
- [x] 全量测试通过：13/13 packages, 0 fail, 0 error
- [x] wiki lesson 沉淀完成

## 进度记录

- 2026-06-06: 发现 bug（sed 批量替换时暴露）
- 2026-06-06: git provenance 追溯至 commit 659c026 (Claude Opus 4.7)
- 2026-06-06: 修复 33 个测试文件 + 2 个 guard 脚本
- 2026-06-06: AGENTS.md 新增 "see a bug, fix a bug" 硬规则

## 关联文件
- 修改: scripts/pre-commit-test.ts, scripts/adr-check.sh, AGENTS.md
- 修改: 33 × packages/*/src/*.test.ts
- 新增: cortex/wiki/02-research/2026-06-06-bun-test-error-exit-code-silent-failure.md

## Git 提交信息建议
```
guard: block commits with test import/call mismatches + test errors (TASK-20260606222341617)

docs(AGENTS.md): add 'see a bug, fix a bug' hard rule (TASK-20260606222341617)
```

## 备注

**Lesson**: exit code 0 ≠ 全部测试跑了。bun test 的 "Unhandled error between tests" 是语法/运行时错误，不是 assertion fail，因此 exit code 仍为 0。任何只检查 exit code 的 guard 都会漏掉这类错误。必须解析 stdout 中的 `error` 计数。

**Related**: AGENTS.md § "Content-based gate > exit-code suppression" — 这个原则再次验证。
