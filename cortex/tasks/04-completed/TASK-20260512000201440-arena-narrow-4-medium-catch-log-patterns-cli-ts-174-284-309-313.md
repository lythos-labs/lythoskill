# TASK-20260512000201440: arena: narrow 4 medium catch/log patterns (cli.ts:174,284,309,313)

## Status History

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-12 | Created |
| completed | 2026-05-11 | Closed via trailer |

## 背景与目标

QA sweep medium findings in arena — all in cli.ts:
- **:174** — URL parse failure silently ignored when interpreting user-provided deck path
- **:284** — skill existence check failure → console.warn + continue, no distinction from "cold pool not initialized"
- **:309** — per-file copy failure silently skipped inside loop, caller gets incomplete output
- **:313** — entire agent workdir copy failure → console.warn (cells silently empty, no indication why)

All 4 are "best effort by design" but lack caller-visible error indicators.

## 需求详情
- [ ] :174 — log parse failure at debug level, not silent swallow
- [ ] :284 — distinguish expected "cold pool not initialized" from unexpected errors (TypeError, file corruption)
- [ ] :309 — aggregate failed copy filenames, report after loop
- [ ] :313 — escalate to console.error (this means zero agent output captured for a cell)

## 技术方案

Pattern: collect structured warnings during operation, report after. Replace console.warn-only with aggregated warning list.

## 验收标准
- [ ] All 4 locations distinguish expected from unexpected failures
- [ ] Callers can detect partial/incomplete output
- [ ] `bun test src/` passes (0 fail)

## 关联文件
- 修改: `packages/lythoskill-arena/src/cli.ts`
- 参考: playground/qa-sweep-2026-05-11/findings.jsonl (#16-19)
- Epic: EPIC-20260511235648324

## 备注

Severity: medium. 4 findings, single file. Arena outputs are consumed programmatically — silent incompleteness matters.
