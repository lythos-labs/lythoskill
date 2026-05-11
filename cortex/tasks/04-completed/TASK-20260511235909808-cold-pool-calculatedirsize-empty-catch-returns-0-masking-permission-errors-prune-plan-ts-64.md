# TASK-20260511235909808: cold-pool: calculateDirSize() empty catch returns 0 masking permission errors (prune-plan.ts:64)

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-11 | Created |
| completed | 2026-05-11 | Closed via trailer |

## 背景与目标

QA sweep (EPIC-20260511235648324) finding: `packages/lythoskill-cold-pool/src/prune-plan.ts:64` — cold-pool: calculateDirSize() empty catch returns 0 masking permission errors (prune-plan.ts:64)

**Source**: `packages/lythoskill-cold-pool/src/prune-plan.ts:64`

## 需求详情
- [ ] Narrow catch to expected error types (ENOENT etc.)
- [ ] Log or propagate unexpected errors — do not silently discard
- [ ] Verify fix with `bun test` (0 fail)

## 技术方案

Distinguish ENOENT (return 0 OK) from EACCES (return -1 or throw). 0 from permission error → incorrect prune.

## 验收标准
- [ ] Error handling distinguishes expected from unexpected failures
- [ ] Callers receive accurate status (no silent fallback)
- [ ] `bun test` passes (0 fail)

## 关联文件
- 修改: `packages/lythoskill-cold-pool/src/prune-plan.ts`
- 参考: playground/qa-sweep-2026-05-11/findings.jsonl
- Epic: EPIC-20260511235648324

## 备注

Severity: high. Found by arena single + qa-sweep deck.
