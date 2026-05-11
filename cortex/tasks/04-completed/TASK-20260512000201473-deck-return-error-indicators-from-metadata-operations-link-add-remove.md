# TASK-20260512000201473: deck: return error indicators from metadata operations (link.ts, add.ts, remove.ts)

## Status History

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-12 | Created |
| completed | 2026-05-11 | Closed via trailer |

## 背景与目标

QA sweep medium findings in deck — identical pattern across 3 files:
- **link.ts:426** — `lstatSync`/`rmSync` in catch swallows non-ENOENT errors (permission, broken symlink)
- **link.ts:568** — metadata reconcile failure → console.warn + continue, caller can't detect corruption
- **add.ts:415** — metadata recording failure → console.warn + continue, same pattern
- **remove.ts:110** — metadata cleanup failure → console.warn + continue, same pattern

All 4 log and continue. API callers receive no indication of metadata integrity issues.

## 需求详情
- [ ] link.ts:426 — check `err.code === 'ENOENT'`, re-throw unexpected errors
- [ ] link.ts:568 — return warning/error indicator from link function
- [ ] add.ts:415 — return warning/error indicator from add function
- [ ] remove.ts:110 — return warning/error indicator from remove function

## 技术方案

```typescript
interface OpResult { ok: boolean; warnings: string[] }
// Return structured results from metadata ops instead of console-only logging
```

## 验收标准
- [ ] All 4 locations have structured error reporting (not console-only)
- [ ] Callers can detect metadata operation failures
- [ ] `bun test src/` and `bun test/runner.ts` pass (0 fail)

## 关联文件
- 修改: `packages/lythoskill-deck/src/link.ts`, `add.ts`, `remove.ts`
- 参考: playground/qa-sweep-2026-05-11/findings.jsonl (#12-15)
- Epic: EPIC-20260511235648324

## 备注

Severity: medium. Consistent pattern across deck metadata layer. Metadata is "advisory" but silent corruption causes future reconcile failures.
