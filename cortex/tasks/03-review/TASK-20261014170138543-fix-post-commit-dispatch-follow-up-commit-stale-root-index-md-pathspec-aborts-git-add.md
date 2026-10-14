# TASK-20261014170138543: fix post-commit dispatch follow-up commit: stale root INDEX.md pathspec aborts git add

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-10-14 | Created |
| in-progress | 2026-10-14 | Started |
| review | 2026-10-14 | Deliverables committed |

## Background & Goals
post-commit 钩子的 follow-up commit(dispatchTrailers 里 `git add … && git commit`)在 trailer dispatch 后未落地,工作树脏着。handoff(2026-10-13 Pitfalls §2)已记 2 次(ADR accept、review trailers),2026-10-14 关四卡时第 3 次复现。

根因(本次实测定位):`dispatch.ts:45` 的 `git add` pathspec 列表仍含根 `INDEX.md`。TASK-20261013142924953(INDEX 落点修复)把主索引迁到 `cortex/INDEX.md`,根 `INDEX.md` 已删且不再生成。`git add … INDEX.md` 命中不存在的 pathspec → `fatal: pathspec 'INDEX.md' did not match any files`(exit 128),git add 整体 abort,**什么都不 stage**,后续 `git diff --cached --quiet` 判"无 staged 变更"→ 提前 return → 提交不落地。同一文件的 pre-commit.ts:52 早已用对(`cortex/INDEX.md`),dispatch.ts 漏改。

## Requirements
- [ ] `dispatch.ts` 的 follow-up `git add` pathspec 列表去掉根 `INDEX.md`,改为 `cortex/INDEX.md`(与 pre-commit.ts:52 对齐)
- [ ] 回归测试:断言 pathspec 列表含 `cortex/INDEX.md`、不含裸 `INDEX.md`(钉死本次回归根因)
- [ ] 实测:下一次 trailer commit 的 follow-up 自动落地,无需人工补 commit

## Technical Approach
纯 bug fix,不引入新抽象/边界/概念,0/6 C-criteria,无需 ADR。
- 把 pathspec 列表抽成导出的 `DISPATCH_FOLLOWUP_ADD` 常量,注释写明回归根因(guarant 即文档)。
- 行为对齐 pre-commit.ts:52(已用 `cortex/adr/` + `cortex/INDEX.md` + `cortex/wiki/INDEX.md`)。
- 测试 `dispatch.test.ts`:对常量做断言(含 `cortex/INDEX.md`,不含裸 `INDEX.md`)。

## Acceptance Criteria
- [ ] `git grep -n "'INDEX.md'" packages/lythoskill-project-cortex/src/hooks/dispatch.ts` 无命中(裸根 INDEX.md 已从 add 列表移除)
- [ ] `bun test packages/lythoskill-project-cortex/src/hooks/dispatch.test.ts` 通过
- [ ] 实测:本卡 commit(带 Task trailer)后,trailer dispatch 的 follow-up commit 自动落地(不再人工补)

## Progress Log
<!-- Update during execution, with timestamps -->

## Related Files
- Modified:
- Added:

## Git Commit Message
```
feat(scope): description (TASK-20261014170138543)

- Detail 1
- Detail 2
```

## Notes
