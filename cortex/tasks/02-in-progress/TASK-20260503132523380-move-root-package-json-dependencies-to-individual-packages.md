# TASK-20260503132523380: Move root package.json dependencies to individual packages

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-03 | Created |
| in-progress | 2026-05-03 | Started |

## 背景与目标

Bun 官方 monorepo 规范明确：根 `package.json` 不应承载具体包的依赖。当前根目录有 `@iarna/toml`、`zod` 和 `husky`，其中 `@iarna/toml`/`zod` 实际只在 `packages/lythoskill-deck` 中使用，`husky` 是 workspace 级 git hooks 工具。

根依赖下沉能消除包边界模糊，避免「根装了但包没声明」导致的隐性依赖问题。

## 需求详情
- [ ] 将 `@iarna/toml` 从根 `package.json` 移除，确认 `packages/lythoskill-deck/package.json` 已声明
- [ ] 将 `zod` 从根 `package.json` 移除，确认 `packages/lythoskill-deck/package.json` 已声明
- [ ] 评估 `husky`：若仅用于 workspace git hooks，保留在根 `devDependencies`；若某包需要独立 hooks，则下沉
- [ ] 运行 `bun install` 验证无 broken import
- [ ] 检查 `packages/lythoskill-arena`/`creator`/`cortex`/`hello-world`/`test-utils` 的 `package.json` 是否需补充各自运行时依赖（当前为 null）

## 技术方案

1. **根 package.json**：删除 `dependencies` 和 `devDependencies` 中的包级依赖，只保留 workspace 元数据
2. **Deck 包**：确认 `@iarna/toml`、`zod` 已在 `packages/lythoskill-deck/package.json` 中
3. **其他包**：逐个检查 `src/` 中的 `import`，把实际使用的外部依赖补到对应包的 `package.json`
4. **验证**：运行 `bun install` 后，每个包的 `node_modules` 能正确解析

## 验收标准
- [ ] 根 `package.json` 无 `dependencies`，`devDependencies` 仅存 workspace 级工具（如 `husky`，若保留）
- [ ] `bun install` 成功，无 unresolved import
- [ ] `bun packages/lythoskill-deck/src/cli.ts link` 能正常执行（验证 `@iarna/toml` 可用）
- [ ] 各包 `package.json` 的 `dependencies` 非 null，且与实际 import 对齐

## 进度记录
<!-- 执行时更新，带时间戳 -->

## 关联文件
- 修改: `package.json`, `packages/lythoskill-deck/package.json`, 各子包 `package.json`
- 新增: 无

## Git 提交信息建议
```
chore(monorepo): move root deps to individual packages (TASK-20260503132523380)

- Remove @iarna/toml, zod from root package.json
- Confirm deck package already declares them
- Add missing deps to arena/creator/cortex/hello-world/test-utils
```

## 备注

> **关联 Epic**: EPIC-20260430011158241 Monorepo tooling consistency and config debt cleanup
