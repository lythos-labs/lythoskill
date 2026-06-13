# TASK-20260519164659220: B: symlink检测跨平台 — stat -c 替换为 fs.lstatSync

## Status History

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-19 | Created |
| completed | 2026-05-19 | Implemented — isSymlink added to IO, stat -c replaced |
| completed | 2026-05-19 | Closed via trailer |

## 背景与目标

`stat -c '%F'` 是 GNU 语法，macOS 上静默失败，symlink 永不被检测。

## 需求详情
- [x] types.ts: EntropyIO 添加 isSymlink(path: string): boolean
- [x] index.ts: buildProductionIO 实现 isSymlink（Node lstatSync）
- [x] checks.ts: checkSymlinksInSkills 使用 io.isSymlink 替代 io.exec('stat')
- [x] 测试 mock 更新

## 技术方案
Node `fs.lstatSync(path).isSymbolicLink()` — 跨平台，已在依赖中。

## 验收标准
- [x] `stat -c` 在 macOS 上报 illegal option（已验证），新代码不调用 stat
- [x] 37 tests pass
