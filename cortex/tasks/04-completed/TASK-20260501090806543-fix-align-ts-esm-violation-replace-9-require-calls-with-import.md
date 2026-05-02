# TASK-20260501090806543: Fix align.ts ESM violation: replace 9 require() calls with import

## Status History

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-01 | Created |
| in-progress | 2026-05-02 | Work completed |
| completed | 2026-05-02 | Done |
| completed | 2026-05-01 | Fixed: replaced all require() with top-level ESM imports |

## 背景与目标

ADR-20260423101950000 规定 ESM-only。`packages/lythoskill-creator/src/align.ts` 在 fix lambda 中内联使用了 `require('node:fs')` 和 `require('node:path')`，共 8 处，违反此政策。

## 修改详情

- 将 `writeFileSync`, `appendFileSync`, `mkdirSync`, `chmodSync` 提升到文件顶部 `import { ... } from 'node:fs'`
- 移除所有内联 `require('node:fs')` 和 `require('node:path')` 调用
- `join` 已在顶部导入，移除内联重复导入

## 关联文件

- 修改: `packages/lythoskill-creator/src/align.ts`
