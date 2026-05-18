# TASK-20260518112246074: Refactor arena/preflight — IO separation

## Status History

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-18 | Created — plan-mode audit found IO inlined |

## 背景
arena/preflight.ts: `buildCopyPlan`, `buildArchiveSidePlan`, `buildPreparePlan` — 3 plan builders without execute counterparts. IO (readdirSync, copyFileSync, writeFileSync) mixed with plan logic. Can't be plan-mode tested cleanly.

Follow the pattern: `buildXPlan` (pure) + `executeXPlan(plan, io?)` (injectable IO). Already done in cold-pool (fetch/reconcile/prune/validate) and deck (refresh-plan).

## 需求
- [ ] Extract `executeCopyPlan(plan, io?)` — IO: readdirSync, copyFileSync
- [ ] Extract `executeArchiveSidePlan(plan, io?)` — IO: readdirSync, mkdirSync, copyFileSync
- [ ] Extract `executePreparePlan(plan, io?)` — IO: writeFileSync, mkdirSync
- [ ] Build functions become pure — accept config, return plan structure
- [ ] Tests: plan-mode verify plan shape + inject mock IO to verify execution path

## 关联
- 参考: `packages/lythoskill-cold-pool/src/reconcile-plan.ts` (pattern reference)
- Plan-mode standard: TESTING.md Layer 2
