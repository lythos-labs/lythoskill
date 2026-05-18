# TASK-20260518112246144: Refactor curator/curator-core — IO separation

## Status History

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-18 | Created — plan-mode audit found IO inlined |
| in-progress | 2026-05-18 | Started |
| terminated | 2026-05-18 | Terminated |

## 背景
curator/curator-core.ts: `buildCuratorPlan`, `buildAddPlan`, `buildRefreshPlan` — 3 plan builders without execute counterparts. IO (readdirSync, readFileSync, writeFileSync for REGISTRY.json/catalog.db) mixed with plan logic.

## 需求
- [ ] Extract `executeCuratorPlan(plan, io?)` — IO: scan directories, write REGISTRY.json
- [ ] Extract `executeAddPlan(plan, io?)` — IO: git clone, write additions.jsonl
- [ ] Extract `executeRefreshPlan(plan, io?)` — IO: git pull, re-scan
- [ ] Build functions become pure
- [ ] Tests: plan-mode verify curator plan structure

## 关联
- 参考: `packages/lythoskill-cold-pool/src/reconcile-plan.ts` (pattern)
- Plan-mode standard: TESTING.md Layer 2
