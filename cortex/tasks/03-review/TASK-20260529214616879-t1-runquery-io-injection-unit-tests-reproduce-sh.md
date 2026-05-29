# TASK-20260529214616879: T1: runQuery IO injection + unit tests + reproduce.sh

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-29 | Created |
| in-progress | 2026-05-29 | Started |
| review | 2026-05-29 | Deliverables committed |

## 背景与目标

runQuery 直接调用 console.log/console.error/process.exit，无法注入测试。需要按照 Epic 定义的 IO 注入模式改造。

## 需求详情

- [ ] 给 `runQuery(argv: string[])` 添加 `io: CuratorIO = defaultCuratorIO` 参数
- [ ] 替换内部所有 `console.log` → `io.log`，`console.error` → `io.error`，`process.exit` → `io.exit`
- [ ] `printSchema(db)` 辅助函数也需改造（返回字符串或接受 io）
- [ ] cli.test.ts 新增 Q1-Q4 测试
- [ ] showcase/ 下新增 `curator-query-reproduce.sh` Agent BDD

## 技术方案

参见 Epic SSOT §1（IO 注入模式）和 §5（代码位置）。

`runQuery` 当前在 cli.ts L474，内部调用链：
- L498-503: `console.error` + `process.exit(1)` — 无 SQL 参数且 DB 不存在
- L515-537: `console.error` + `process.exit(1)` — DB 未找到
- L548-553: `console.error` — 索引新鲜度提示（stderr，非错误）
- L560-562: `console.error` + `process.exit(1)` — 非 SELECT 拒绝
- L565: `console.log` — 查询结果表格
- L567-572: `console.error` + `process.exit(1)` — SQL 错误

改造后所有输出通过 io 接口，测试注入 capture 数组验证内容。

### printSchema 处理
当前 `printSchema` 直接 `console.log`。两种方案：
- A: 给 printSchema 加 io 参数
- B: printSchema 返回字符串，由 runQuery 调用 `io.log`

**选择 B**：printSchema 是纯数据格式化，无 IO 语义，返回字符串更符合 intent/plan/execute 分层。

## 验收标准

- [ ] `runQuery` 签名改为 `runQuery(argv: string[], io: CuratorIO = defaultCuratorIO)`
- [ ] `runQuery` 内部零 `console.log`/`console.error`/`process.exit`
- [ ] `printSchema` 返回字符串，不直接输出
- [ ] Q1: 无 SQL 参数 + DB 存在 → 输出 schema 表格（验证 `## catalog.db schema` 在 io.log 中）
- [ ] Q2: `SELECT * FROM skills` → 输出 Markdown 表格（验证 io.log 包含表格分隔线 `|`）
- [ ] Q3: DB 未找到 → io.error 包含 "Catalog DB not found"，io.exit(1)
- [ ] Q4: `DELETE FROM skills` → io.error 包含 "only SELECT and PRAGMA"，io.exit(1)
- [ ] `bun test packages/lythoskill-curator/src/cli.test.ts` 全绿
- [ ] showcase/ 下 `curator-query-reproduce.sh` 可执行，judge.md 独立

## 进度记录
<!-- 执行时更新，带时间戳 -->

## 关联文件
- 修改: `packages/lythoskill-curator/src/cli.ts` (runQuery, printSchema)
- 修改: `packages/lythoskill-curator/src/cli.test.ts` (新增 Q1-Q4)
- 新增: `showcase/2026-05-29-curator-query-reproduce-sh/reproduce.sh`
- 新增: `showcase/2026-05-29-curator-query-reproduce-sh/judge.md`

## Git 提交信息建议
```
feat(curator): IO inject runQuery + printSchema (TASK-20260529214616879)

- runQuery accepts CuratorIO, zero direct console/process calls
- printSchema returns string instead of console.log
- Q1-Q4 unit tests with injected capture IO
- Agent BDD: curator-query-reproduce.sh
```

## 备注
- Epic SSOT §1: IO 注入模式
- Epic SSOT §5: runQuery 当前位置 cli.ts L474
