# TASK-20260511235909835: cortex: post-commit git() helper ignores spawnSync exit code and stderr (post-commit.ts:16)

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-11 | Created |

## 背景与目标

QA sweep (EPIC-20260511235648324) finding: `packages/lythoskill-project-cortex/src/hooks/post-commit.ts:16` — cortex: post-commit git() helper ignores spawnSync exit code (post-commit.ts:16)

**Source**: `packages/lythoskill-project-cortex/src/hooks/post-commit.ts:16`

## 需求详情
- [ ] Narrow catch to expected error types (ENOENT etc.)
- [ ] Log or propagate unexpected errors — do not silently discard
- [ ] Verify fix with `bun test` (0 fail)

## 技术方案

Return { ok, stdout, stderr } from git(). Check r.status. Silent git failures undermine governance workflow.

## 验收标准
- [ ] Error handling distinguishes expected from unexpected failures
- [ ] Callers receive accurate status (no silent fallback)
- [ ] `bun test` passes (0 fail)

## 关联文件
- 修改: `packages/lythoskill-project-cortex/src/hooks/post-commit.ts`
- 参考: playground/qa-sweep-2026-05-11/findings.jsonl
- Epic: EPIC-20260511235648324

## 备注

Severity: high. Found by arena single + qa-sweep deck.
