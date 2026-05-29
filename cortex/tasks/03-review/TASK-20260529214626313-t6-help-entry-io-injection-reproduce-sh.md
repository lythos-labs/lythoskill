# TASK-20260529214626313: T6: --help entry IO injection + reproduce.sh

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-29 | Created |
| in-progress | 2026-05-29 | Started |
| review | 2026-05-29 | Deliverables committed |

## 背景与目标

`--help` 入口直接 console.log + process.exit(0)，是最后一个未注入的 CLI 输出点。需要统一为可注入模式，完成 curator 全 CLI IO 注入闭环。

## 需求详情

- [ ] `--help` 处理逻辑提取为可注入函数 `printHelp(io: CuratorIO = defaultCuratorIO)`
- [ ] 替换所有 `console.log` → `io.log`，`process.exit(0)` → `io.exit(0)`
- [ ] main entry (`import.meta.main`) 中调用 `printHelp(io)`
- [ ] cli.test.ts 新增 H1 测试
- [ ] showcase/ 下新增 `curator-help-reproduce.sh` Agent BDD

## 技术方案

参见 Epic SSOT §1（IO 注入模式）和 §5（代码位置）。

`--help` 当前在 cli.ts L1251-1288：
- L1252-1287: 全部 `console.log` — help 文本
- L1288: `process.exit(0)`

提取为 `printHelp(io)` 函数，main entry 调用时传入默认 io，测试时注入 capture。

## 验收标准

- [ ] `printHelp` 函数提取成功，接受 `io: CuratorIO = defaultCuratorIO`
- [ ] `printHelp` 内部零 `console.log`/`process.exit`
- [ ] H1: printHelp → io.log 包含 "Usage:", "add", "tag", "query", "audit", "find", "refresh-plan", "refresh-execute"
- [ ] main entry 调用 `printHelp(defaultCuratorIO)` 行为不变
- [ ] `bun test packages/lythoskill-curator/src/cli.test.ts` 全绿
- [ ] showcase/ 下 `curator-help-reproduce.sh` 可执行，judge.md 独立

## 进度记录
<!-- 执行时更新，带时间戳 -->

## 关联文件
- 修改: `packages/lythoskill-curator/src/cli.ts` (提取 printHelp, main entry)
- 修改: `packages/lythoskill-curator/src/cli.test.ts` (新增 H1)
- 新增: `showcase/2026-05-29-curator-help-reproduce-sh/reproduce.sh`
- 新增: `showcase/2026-05-29-curator-help-reproduce-sh/judge.md`

## Git 提交信息建议
```
feat(curator): IO inject --help entry (TASK-20260529214626313)

- Extract printHelp(io) from main entry
- Zero direct console/process calls in help output
- H1 unit test + Agent BDD
- Curator CLI IO injection complete: all entry points injectable
```

## 备注
- Epic SSOT §1: IO 注入模式
- Epic SSOT §5: --help 当前位置 cli.ts L1251-1288
- 这是 T6（最后一个），完成后 curator 全 CLI 零直接 console/process 调用
