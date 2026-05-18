# TASK-20260518112246109: Refactor cold-pool/validate-plan — IO separation

## Status History

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-18 | Created — plan-mode audit found execute missing |
| in-progress | 2026-05-18 | Started |
| terminated | 2026-05-18 | Terminated |

## 背景
cold-pool/validate-plan.ts: `buildValidationPlan` exists but no `executeValidationPlan`. Validation IO (existsSync, readFileSync for lock file) is handled externally. Follow pattern: `buildValidationPlan` (pure) + `executeValidationPlan(plan, io?)`.

## 需求
- [ ] Extract `executeValidationPlan(plan, io?)` — IO: existsSync(statedFile), readFileSync(lockFile)
- [ ] Build function already pure — plan structure verified by existing tests (14)
- [ ] Tests: add plan-mode verify validation check structure + inject mock IO

## 关联
- 参考: `packages/lythoskill-cold-pool/src/reconcile-plan.ts` (pattern)
- Plan-mode standard: TESTING.md Layer 2
