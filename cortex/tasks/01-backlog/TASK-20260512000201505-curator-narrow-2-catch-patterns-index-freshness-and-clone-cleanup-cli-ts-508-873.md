# TASK-20260512000201505: curator: narrow 2 catch patterns — index freshness and clone cleanup (cli.ts:508,873)

## Status History

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-12 | Created |

## 背景与目标

QA sweep medium findings in curator:
- **cli.ts:508** — DB error in index freshness check → empty catch, user never knows index is stale
- **cli.ts:873** — clone cleanup failure (empty dir removal) → empty catch, orphaned directories stay on disk

Both are display/cleanup operations, not data-path critical, but silent degradation harms debuggability.

## 需求详情
- [ ] cli.ts:508 — console.error or debug log on freshness DB query failure
- [ ] cli.ts:873 — log cleanup failure at debug level (safeRmSync can fail on permissions)

## 技术方案

Minimal change: add logging in catch blocks. Not structural — these are side operations.

## 验收标准
- [ ] Both locations log failure information (at least debug level)
- [ ] `bun test src/` passes (0 fail)

## 关联文件
- 修改: `packages/lythoskill-curator/src/cli.ts`
- 参考: playground/qa-sweep-2026-05-11/findings.jsonl (#20-21)
- Epic: EPIC-20260511235648324

## 备注

Severity: medium. Display/cleanup operations — lower blast radius than cold-pool data layer.
