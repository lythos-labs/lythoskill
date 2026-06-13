# TASK-20260613182155587: Resolve cold-pool mirror stash@{0}

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-06-13 | Created |
| completed | 2026-06-13 | Closed via trailer |

## 背景与目标
session 开始时发现 `stash@{0}` 来自 commit `7dbe951 fix(cold-pool): wire LYTHOSKILL_GH_MIRROR into git clone URL`，内容是 `INDEX.md` + `bun.lock` 的未提交变更。需要判断该 stash 是否仍有效，并安全处理。

## 需求详情
- [x] 检查 stash 内容（INDEX.md 时间戳、版本号、依赖变化）
- [x] 与当前 HEAD 对比，判断 stash 是否已过期
- [x] 决定：恢复 / 丢弃 / 转为显式 commit

## 技术方案
- `git stash show -p stash@{0}` 查看完整 diff
- 对比当前 `package.json` 版本（当前 0.16.0，stash 中 bun.lock 为 0.10.0/0.10.1）
- 对比当前 INDEX.md（cortex 已多次自动重生成，stash 中的 INDEX.md 时间戳为 2026/5/12）
- 结论：stash 内容已严重过期，丢弃并记录

## 验收标准
- [x] stash 内容被审计并记录
- [x] `git stash list` 中该 stash 被清除
- [x] 当前 working tree 和 INDEX.md 不受污染

## 进度记录
<!-- 执行时更新，带时间戳 -->

## 关联文件
- 修改:
- 新增:

## Git 提交信息建议
```
feat(scope): description (TASK-20260613182155587)

- Detail 1
- Detail 2
```

## 备注
