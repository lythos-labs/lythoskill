# TASK-20260511235656113: cold-pool: fetch-plan git checkout failure silently returns wrong status

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-11 | Created |
| completed | 2026-05-11 | Closed via trailer |

## 背景与目标

QA sweep (EPIC-20260511235648324) finding #1: `fetch-plan.ts:60` — git checkout failure
silently returns success status. The `execFileSync('git', ['checkout', ...])` call is wrapped
in try/catch that falls through to "already-present" status on any error. Timeout, signal,
permission error, or disk-full all map to "already-present" — a lie that downstream code
consumes.

**Source**: `packages/lythoskill-cold-pool/src/fetch-plan.ts:58-60`
```typescript
execFileSync('git', ['-C', plan.targetDir, 'checkout', plan.ref], { stdio: 'pipe' })
```
Catch block treats ALL errors as "repo already at target ref."

## 需求详情
- [ ] Distinguish ENOENT-like errors from real failures (timeout, signal, EACCES, ENOSPC)
- [ ] Return structured result: `{ status: 'checkout-failed', message }` instead of falling through
- [ ] Callers must check status before proceeding

## 技术方案

Replace bare catch with error-type discrimination:
```typescript
try {
  execFileSync('git', ['-C', plan.targetDir, 'checkout', plan.ref], { stdio: 'pipe' })
} catch (e: any) {
  if (e.code === 'ENOENT') return { status: 'not-found' }
  return { status: 'checkout-failed', message: e.message }
}
```

## 验收标准
- [ ] `fetch-plan.ts:58-60` error handling distinguishes ENOENT from unexpected errors
- [ ] Callers handle `checkout-failed` status explicitly (no silent fallback)
- [ ] `bun test src/fetch-plan.test.ts` passes (0 fail)

## 关联文件
- 修改: `packages/lythoskill-cold-pool/src/fetch-plan.ts`
- 参考: [`playground/qa-sweep-2026-05-11/findings.jsonl:1`](../../playground/qa-sweep-2026-05-11/findings.jsonl)
- Epic: [EPIC-20260511235648324](../../cortex/epics/01-active/EPIC-20260511235648324-qa-sweep-empty-catch-hardening-across-core-packages.md)

## 备注

Severity: high. Cold-pool is data layer — downstream deck/curator/arena all consume its output.
