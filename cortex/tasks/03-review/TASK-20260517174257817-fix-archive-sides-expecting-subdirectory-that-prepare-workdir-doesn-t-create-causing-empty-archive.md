# TASK-20260517174257817: Fix archive --sides expecting subdirectory that prepare-workdir doesn't create, causing empty archive

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-17 | Created |
| in-progress | 2026-05-17 | Started |
| review | 2026-05-17 | Deliverables committed |

## 背景与目标
`archive --sides side-a` expects `$WORKDIR/side-a/` subdirectory to exist, but `prepare-workdir` doesn't create per-side subdirectories. Agent outputs go directly to `$WORKDIR` root. Result: empty archive for single-deck tests.

## 需求详情
- [x] archive single-side falls back to workdir root when side subdirectory missing
- [x] Multi-side behavior unchanged (warns on missing, skips)
- [x] Integration test: single-side root, multi-side with subs, multi-side missing-one

## 技术方案
`cli.ts:569-578`: When `--sides` specifies exactly one side and the side subdirectory doesn't exist, fall back to `fromDir` as source (not `fromDir/side/`). Files go to `outDir/side/` regardless of source.

## 验收标准
- [x] Single side, files in workdir root → archived to outDir/side/
- [x] Multi side, subdirectories exist → unchanged behavior
- [x] Multi side, one missing → still warns and skips (no silent fallback)

## 关联文件
- 修改: `packages/lythoskill-arena/src/cli.ts:569-578`

## Git 提交信息建议
```
fix(arena): archive single-side falls back to workdir root when side/ missing (TASK-20260517174257817)

prepare-workdir doesn't create per-side subdirectories; agent outputs to
workdir root. Single-side archive now falls back to fromDir when the
named side subdirectory doesn't exist.
```

## 备注
