# TASK-20260529214618391: T2: runAudit IO injection + unit tests + reproduce.sh

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-29 | Created |

## 背景与目标

runAudit 直接调用 console.log/console.error/process.exit，无法注入测试。需要按照 Epic 定义的 IO 注入模式改造。

## 需求详情

- [ ] 给 `runAudit(argv: string[])` 添加 `io: CuratorIO = defaultCuratorIO` 参数
- [ ] 替换内部所有 `console.log` → `io.log`，`console.error` → `io.error`，`process.exit` → `io.exit`
- [ ] cli.test.ts 新增 A1-A3 测试
- [ ] showcase/ 下新增 `curator-audit-reproduce.sh` Agent BDD

## 技术方案

参见 Epic SSOT §1（IO 注入模式）和 §5（代码位置）。

`runAudit` 当前在 cli.ts L774，内部调用链：
- L777-787: `console.error` + `process.exit(1)` — DB 未找到
- L841-855: `console.log` — 审计报告输出（多组 check + summary + score）
- L857-859: `console.error` + `process.exit(1)` — 审计异常

注意：runAudit 内部调用 `checkLegacyPatterns(db)`，该函数读取 SKILL.md 文件内容。这是**允许的 IO**（业务逻辑需要读文件），不是 CLI 输出 IO。测试时通过 seed DB + 创建临时 SKILL.md 文件来验证。

## 验收标准

- [ ] `runAudit` 签名改为 `runAudit(argv: string[], io: CuratorIO = defaultCuratorIO)`
- [ ] `runAudit` 内部零 `console.log`/`console.error`/`process.exit`
- [ ] A1: 正常审计 → io.log 包含 "Summary:" 和 "Audit score:"，无 io.error
- [ ] A2: 空 DB（0 skills）→ io.log 包含 "0 issue"，score = 100/100
- [ ] A3: DB 未找到 → io.error 包含 "Catalog DB not found"，io.exit(1)
- [ ] `bun test packages/lythoskill-curator/src/cli.test.ts` 全绿
- [ ] showcase/ 下 `curator-audit-reproduce.sh` 可执行，judge.md 独立

## 进度记录
<!-- 执行时更新，带时间戳 -->

## 关联文件
- 修改: `packages/lythoskill-curator/src/cli.ts` (runAudit)
- 修改: `packages/lythoskill-curator/src/cli.test.ts` (新增 A1-A3)
- 新增: `showcase/2026-05-29-curator-audit-reproduce-sh/reproduce.sh`
- 新增: `showcase/2026-05-29-curator-audit-reproduce-sh/judge.md`

## Git 提交信息建议
```
feat(curator): IO inject runAudit (TASK-20260529214618391)

- runAudit accepts CuratorIO, zero direct console/process calls
- A1-A3 unit tests with injected capture IO
- Agent BDD: curator-audit-reproduce.sh
```

## 备注
- Epic SSOT §1: IO 注入模式
- Epic SSOT §5: runAudit 当前位置 cli.ts L774
