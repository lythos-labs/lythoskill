# TASK-20260512000201534: cortex: fix 5 medium patterns — dispatch, ADR accept, git add, config parse, coupling

## Status History

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-12 | Created |

## 背景与目标

QA sweep medium findings in cortex, scattered across hooks and lib:
- **dispatch.ts:53** — spawnSync for follow-up git commit ignores exit code
- **pre-commit.ts:39** — spawnSync for ADR auto-accept ignores exit code
- **pre-commit.ts:44** — spawnSync for git add ignores exit code
- **config.ts:45** — JSON config parse failure → silent fallback to defaults (can't distinguish "no config" from "corrupt config")
- **coupling.ts:29,57** — readdir/readFile failure → silent return []/null (can't distinguish "empty dir" from "unreadable dir")

## 需求详情
- [ ] dispatch.ts:53 — check r.status, log if follow-up commit fails
- [ ] pre-commit.ts:39 — check r.status, log if ADR auto-accept fails
- [ ] pre-commit.ts:44 — check r.status, log if git add fails
- [ ] config.ts:45 — return parse error in config result (distinguish file-not-found from corrupt JSON)
- [ ] coupling.ts:29,57 — distinguish ENOENT from EACCES/other errors

## 技术方案

Same pattern as high-priority git() helper fix (TASK-20260511235909835/66): return structured results, check spawnSync status, distinguish expected from unexpected failures.

## 验收标准
- [ ] All 6 locations have error-type discrimination
- [ ] Hook failures are visible (not silent)
- [ ] `bun test src/` and `bun test/runner.ts` pass (0 fail)

## 关联文件
- 修改: `packages/lythoskill-project-cortex/src/hooks/dispatch.ts`, `pre-commit.ts`, `config.ts`, `lib/coupling.ts`
- 参考: playground/qa-sweep-2026-05-11/findings.jsonl (#8-11, 22-24)
- Epic: EPIC-20260511235648324

## 备注

Severity: medium. 6 findings across 4 files. The hook exit code issues are high-impact but lower blast radius since they're follow-up operations (ADR accept, git add) not primary gate logic.
