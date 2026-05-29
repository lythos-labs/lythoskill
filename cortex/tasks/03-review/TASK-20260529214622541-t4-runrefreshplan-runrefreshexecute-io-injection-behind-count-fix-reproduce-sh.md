# TASK-20260529214622541: T4: runRefreshPlan/runRefreshExecute IO injection + behind count fix + reproduce.sh

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-29 | Created |
| in-progress | 2026-05-29 | Started |
| review | 2026-05-29 | Deliverables committed |

## 背景与目标

runRefreshPlan/runRefreshExecute 直接调用 console.log/console.error/process.exit，且使用 `HEAD...@{upstream}` 三点符号，在 shallow clone 下 overcount。需要 IO 注入 + behind count 修复。

## 需求详情

- [ ] 给 `runRefreshPlan(argv: string[])` 添加 `io: CuratorIO = defaultCuratorIO` 参数
- [ ] 给 `runRefreshExecute(argv: string[])` 添加 `io: CuratorIO = defaultCuratorIO` 参数
- [ ] 替换内部所有 `console.log` → `io.log`，`console.error` → `io.error`，`process.exit` → `io.exit`
- [ ] `HEAD...@{upstream}` → `HEAD..@{upstream}`（两处：runRefreshPlan L902, runRefreshExecute L934）
- [ ] cli.test.ts 新增 R1-R3 测试
- [ ] showcase/ 下新增 `curator-refresh-reproduce.sh` Agent BDD

## 技术方案

参见 Epic SSOT §1（IO 注入模式）、§3（Git behind count）、§5（代码位置）。

`runRefreshPlan` 当前在 cli.ts L888：
- L893: `console.log` — 扫描提示
- L895: `console.log` — 发现 repo 数量
- L898: `console.log` — 检查 upstream
- L908: `console.log` — 每个 repo 状态
- L915-917: `console.log` — 计划写入提示 + 执行命令

`runRefreshExecute` 当前在 cli.ts L920：
- L925-926: `console.error` + `process.exit(1)` — 无计划文件
- L943: `console.log` — 全部最新
- L947-951: `console.log` — 待 pull 列表
- L956-962: `console.log` — pull 进度
- L970: `console.log` — 完成总结

**Behind count 修复**：
- L902: `safeGit(["-C", item.path, "rev-list", "HEAD...@{upstream}", "--count"])` → `"HEAD..@{upstream}"`
- L934: 同上

## 验收标准

- [ ] `runRefreshPlan` 签名改为 `runRefreshPlan(argv: string[], io: CuratorIO = defaultCuratorIO)`
- [ ] `runRefreshExecute` 签名改为 `runRefreshExecute(argv: string[], io: CuratorIO = defaultCuratorIO)`
- [ ] 两个函数内部零 `console.log`/`console.error`/`process.exit`
- [ ] 两点符号替换完成（两处 `HEAD...@{upstream}` → `HEAD..@{upstream}`）
- [ ] R1: runRefreshPlan 空 pool → io.log 包含 "0 repo(s)"
- [ ] R2: runRefreshPlan 有 repo → io.log 包含 repo locator 和状态
- [ ] R3: runRefreshExecute 无计划文件 → io.error 包含 "No refresh plan"，io.exit(1)
- [ ] `bun test packages/lythoskill-curator/src/cli.test.ts` 全绿
- [ ] showcase/ 下 `curator-refresh-reproduce.sh` 可执行，judge.md 独立

## 进度记录
<!-- 执行时更新，带时间戳 -->

## 关联文件
- 修改: `packages/lythoskill-curator/src/cli.ts` (runRefreshPlan, runRefreshExecute)
- 修改: `packages/lythoskill-curator/src/cli.test.ts` (新增 R1-R3)
- 新增: `showcase/2026-05-29-curator-refresh-reproduce-sh/reproduce.sh`
- 新增: `showcase/2026-05-29-curator-refresh-reproduce-sh/judge.md`

## Git 提交信息建议
```
feat(curator): IO inject refresh commands + behind count fix (TASK-20260529214622541)

- runRefreshPlan/runRefreshExecute accept CuratorIO
- HEAD...@{upstream} → HEAD..@{upstream} (shallow clone overcount fix)
- R1-R3 unit tests with injected capture IO
- Agent BDD: curator-refresh-reproduce.sh
```

## 备注
- Epic SSOT §1: IO 注入模式
- Epic SSOT §3: Git behind count 修复细节
- Epic SSOT §5: runRefreshPlan L888, runRefreshExecute L920
- 关联已完成: TASK-20260529132734903 (deck 侧同样修复)
