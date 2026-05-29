# Curator CLI IO Injection — Agent BDD

> **Status**: Active — validates T4 completion (TASK-20260529214622541)
> **Epic**: EPIC-20260529214429614
> **Date**: 2026-05-29

## What This Tests

Curator CLI 的完整 IO 注入改造：

1. **所有 CLI 入口函数**接受 `CuratorIO` 参数（`runCurator`, `runAdd`, `runTag`, `runQuery`, `runAudit`, `runFind`, `runRefreshPlan`, `runRefreshExecute`, `backupIndex`, `restoreIndex`, `printHelp`）
2. **零直接 IO** — 函数体内没有 `console.log` / `console.error` / `process.exit`
3. **正确的 git range 语法** — `HEAD..@{upstream}`（two-dot）而非 `HEAD...@{upstream}`（three-dot）
4. **测试覆盖** — R1-R5 测试验证 refresh 命令的行为

## Files

| File | Role |
|------|------|
| `reproduce.sh` | Shell scaffold + IoC handoff |
| `judge.md` | Judge criteria — judge agent only |
| `README.md` | This file |

## IoC Pattern

Step 3 prints task instructions to stdout. Agent reads stdout, recognizes `<spawn subagent>`, takes over.
Human running `bash reproduce.sh` sees the echo and stops.
