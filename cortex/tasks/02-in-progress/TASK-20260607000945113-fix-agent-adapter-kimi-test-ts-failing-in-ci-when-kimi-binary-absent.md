# TASK-20260607000945113: Fix agent-adapter kimi.test.ts failing in CI when kimi binary absent

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-06-06 | Created |
| in-progress | 2026-06-06 | Started |

## 背景与目标
`packages/lythoskill-agent-adapter/src/adapters/kimi.test.ts` fails in CI because `buildKimiCommand()` calls `detectKimiBinary()`, which relies on `Bun.which('kimi-cli')` / `Bun.which('kimi')`. In the GitHub Actions Ubuntu runner, neither binary is installed, so `buildKimiCommand()` throws:

```
No kimi binary found in PATH. Install: https://github.com/MoonshotAI/kimi-cli
```

This is a pre-existing failure (also failed on the 2026-06-04 commit) and blocks CI on unrelated changes.

Goal: make `buildKimiCommand` unit-testable without requiring the binary to be present in PATH.

## 需求详情
- [x] Make `buildKimiCommand` accept an injectable binary parameter for unit tests
- [x] Update `kimi.test.ts` to test command construction deterministically (no PATH dependency)
- [x] Keep `detectKimiBinary()` behavior unchanged for production code
- [x] Ensure CI `bun --filter='*' run test` passes for `@lythos/agent-adapter`

## 技术方案
Add an optional second parameter to `buildKimiCommand` that defaults to `detectKimiBinary()`:

```typescript
export function buildKimiCommand(
  _modelTier?: 'fast' | 'balanced' | 'deep',
  binary = detectKimiBinary(),
): string[] {
  if (!binary) {
    throw new Error('No kimi binary found in PATH. Install: https://github.com/MoonshotAI/kimi-cli')
  }
  return [binary, '--print', '--output-format', 'stream-json']
}
```

Tests call `buildKimiCommand(undefined, 'kimi-cli')` and `buildKimiCommand(undefined, 'kimi')` to verify command shape without relying on PATH.

Also add an explicit dormancy test: `buildKimiCommand()` throws when binary is absent.

## 验收标准
- [x] `bun --filter=@lythos/agent-adapter run test` passes locally when `kimi` / `kimi-cli` is NOT in PATH
- [ ] CI run `27066871911` class of failure no longer reproduces
- [x] Production call sites (`spawnKimi`, `kimiAdapter.spawn`) continue to work unchanged

## 进度记录
- 2026-06-07: Task registered after CI failure on push to main.
- 2026-06-07: Implemented optional `binary` parameter in `buildKimiCommand`; updated tests; full suite passes locally.

## 关联文件
- 修改: packages/lythoskill-agent-adapter/src/adapters/kimi.ts, packages/lythoskill-agent-adapter/src/adapters/kimi.test.ts
- 新增: none

## Git 提交信息建议
```
fix(agent-adapter): make buildKimiCommand testable without PATH binary (TASK-20260607000945113)

- Inject optional binary parameter defaulting to detectKimiBinary()
- Update tests to use injected binary, removing CI PATH dependency
- Add dormancy test: throws when binary absent
```

## 备注
Pre-existing failure; not caused by AGENTS.md v2 push.
