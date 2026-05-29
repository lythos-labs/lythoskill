# TASK-20260529214624302: T5: backupIndex/restoreIndex/printSchema IO injection + reproduce.sh

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-29 | Created |

## 背景与目标

backupIndex、restoreIndex、printSchema 被主函数调用，但内部直接 console.log/console.error/process.exit。需要统一为可注入模式，完成全链路零直接 IO 调用。

## 需求详情

- [ ] `backupIndex(outputDir: string)` → `backupIndex(outputDir: string, io: CuratorIO = defaultCuratorIO)`
- [ ] `restoreIndex(outputDir: string)` → `restoreIndex(outputDir: string, io: CuratorIO = defaultCuratorIO)`
- [ ] `printSchema(db: CatalogDb)` → `printSchema(db: CatalogDb): string`（返回字符串）
- [ ] 更新所有调用方（runCurator 调用 backupIndex，main entry 调用 restoreIndex，runQuery 调用 printSchema）
- [ ] cli.test.ts 新增辅助函数测试
- [ ] showcase/ 下新增 `curator-backup-restore-reproduce.sh` Agent BDD

## 技术方案

参见 Epic SSOT §1（IO 注入模式）和 §5（代码位置）。

`backupIndex` 当前在 cli.ts L255：
- L273-275: `console.log` — 备份创建提示

`restoreIndex` 当前在 cli.ts L280：
- L294-296: `console.error` + `process.exit(1)` — 无备份
- L300: `console.log` — REGISTRY 恢复成功
- L304: `console.log` — catalog.db 恢复成功

`printSchema` 当前在 cli.ts L399：
- L400-422: 全部 `console.log` — schema 输出

**printSchema 改造**：返回字符串，由调用方（runQuery）通过 `io.log` 输出。这样 printSchema 变为纯函数，可独立测试。

## 验收标准

- [ ] `backupIndex` 接受 io 参数，内部零 `console.log`
- [ ] `restoreIndex` 接受 io 参数，内部零 `console.log`/`console.error`/`process.exit`
- [ ] `printSchema` 返回字符串，零 `console.log`
- [ ] 所有调用方正确传递 io（或让默认值处理）
- [ ] B1: backupIndex 有文件 → io.log 包含 "Backup created"
- [ ] B2: restoreIndex 有备份 → io.log 包含 "Restored REGISTRY.json"
- [ ] B3: restoreIndex 无备份 → io.error 包含 "No backup"，io.exit(1)
- [ ] B4: printSchema 返回字符串包含 "catalog.db schema" 和表格
- [ ] `bun test packages/lythoskill-curator/src/cli.test.ts` 全绿
- [ ] showcase/ 下 `curator-backup-restore-reproduce.sh` 可执行，judge.md 独立

## 进度记录
<!-- 执行时更新，带时间戳 -->

## 关联文件
- 修改: `packages/lythoskill-curator/src/cli.ts` (backupIndex, restoreIndex, printSchema, 调用方)
- 修改: `packages/lythoskill-curator/src/cli.test.ts` (新增 B1-B4)
- 新增: `showcase/2026-05-29-curator-backup-restore-reproduce-sh/reproduce.sh`
- 新增: `showcase/2026-05-29-curator-backup-restore-reproduce-sh/judge.md`

## Git 提交信息建议
```
feat(curator): IO inject backupIndex/restoreIndex/printSchema (TASK-20260529214624302)

- backupIndex/restoreIndex accept CuratorIO
- printSchema returns string (pure function)
- All callers updated, full chain zero direct console/process
- B1-B4 unit tests + Agent BDD
```

## 备注
- Epic SSOT §1: IO 注入模式
- Epic SSOT §5: backupIndex L255, restoreIndex L280, printSchema L399
