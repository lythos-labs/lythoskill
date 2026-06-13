# TASK-20260530135707211: Arena CLI IO injection — extract ArenaCliIO interface and inject into main/singleRun/vsRun/vizRun/prepareWorkdir/archiveRun

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-30 | Created as part of EPIC-20260530135721111 |
| completed | 2026-06-13 | Reconciled — work was completed in commit history but Status History was missing |

## 背景与目标

Arena CLI (`packages/lythoskill-arena/src/cli.ts`) 目前直接调用 `console.log`/`console.error`/`process.exit`，与 deck/curator 已完成 IO 注入改造的模式不一致。本任务将提取 `ArenaCliIO` 接口，注入到所有 CLI 函数中，并添加对应的单元测试。

参考先例：
- `CuratorIO` in `packages/lythoskill-curator/src/cli.ts` (11 个函数已注入)
- `DeckIO` in `packages/lythoskill-deck/src/remove.ts`
- `SymlinkSnapshotIO` in `packages/lythoskill-deck/src/to-symlink-snapshot.ts`

## 需求详情

- [x] 定义 `ArenaCliIO` interface: `{ log, error, exit }`
- [x] `export async function main(args, io?: ArenaCliIO)` — 注入
- [x] `singleRun(args, io?)` — 注入
- [x] `vsRun(args, io?)` — 注入
- [x] `vizRun(args, io?)` — 注入
- [x] `prepareWorkdir(args, io?)` — 注入
- [x] `archiveRun(args, io?)` — 注入
- [x] 所有直接 `console.log`/`console.error`/`process.exit` 改为 `io.log`/`io.error`/`io.exit`
- [x] 添加 `cli.test.ts` 测试：参数解析、错误路径、帮助输出
- [x] 测试使用 mock IO（零 spyOn console/process）

## 技术方案

模式与 curator CLI IO 注入完全一致：
1. 提取 interface + defaultIO
2. 函数签名添加 `io = defaultIO`
3. 内部替换所有直接 IO 调用
4. 测试构造 mock IO，捕获输出和 exit code

## 验收标准

- [x] `bun test packages/lythoskill-arena/src/cli.test.ts` 通过
- [x] 零 `spyOn(console)` / `spyOn(process)`
- [x] `bun --filter='*' run test` 全绿

## 关联文件
- 修改: `packages/lythoskill-arena/src/cli.ts`
- 新增: `packages/lythoskill-arena/src/cli.test.ts`

## Git 提交信息建议
```
feat(arena): IO inject CLI layer — ArenaCliIO for main/singleRun/vsRun/vizRun/prepareWorkdir/archiveRun (TASK-20260530135707211)

- Extract ArenaCliIO interface (log/error/exit)
- Inject into all 6 CLI functions
- Add cli.test.ts with mock IO (zero spyOn)
```
