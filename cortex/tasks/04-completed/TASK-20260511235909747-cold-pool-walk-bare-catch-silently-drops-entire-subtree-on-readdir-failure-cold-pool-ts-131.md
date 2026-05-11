# TASK-20260511235909747: cold-pool: walk() bare catch silently drops entire subtree on readdir failure (cold-pool.ts:131)

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-11 | Created |
| completed | 2026-05-11 | Closed via trailer |

## 背景与目标

QA sweep (EPIC-20260511235648324) finding: `packages/lythoskill-cold-pool/src/cold-pool.ts:131` — cold-pool: walk() bare catch silently drops entire subtree (cold-pool.ts:131)

**Source**: `packages/lythoskill-cold-pool/src/cold-pool.ts:131`

## 需求详情
- [ ] Narrow catch to expected error types (ENOENT etc.)
- [ ] Log or propagate unexpected errors — do not silently discard
- [ ] Verify fix with `bun test` (0 fail)

## 技术方案

Distinguish ENOENT (skip) from EACCES/EIO (log + collect partial). Return { entries, errors } struct.

## 验收标准
- [ ] Error handling distinguishes expected from unexpected failures
- [ ] Callers receive accurate status (no silent fallback)
- [ ] `bun test` passes (0 fail)

## 关联文件
- 修改: `packages/lythoskill-cold-pool/src/cold-pool.ts`
- 参考: playground/qa-sweep-2026-05-11/findings.jsonl
- Epic: EPIC-20260511235648324

## 备注

Severity: high. Found by arena single + qa-sweep deck.
