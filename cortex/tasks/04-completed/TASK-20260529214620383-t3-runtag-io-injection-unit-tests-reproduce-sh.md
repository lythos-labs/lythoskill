# TASK-20260529214620383: T3: runTag IO injection + unit tests + reproduce.sh

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-29 | Created |
| in-progress | 2026-05-29 | Started |
| review | 2026-05-29 | Deliverables committed |
| completed | 2026-05-29 | Done |

## 背景与目标

runTag 直接调用 console.log/console.error/process.exit，无法注入测试。需要按照 Epic 定义的 IO 注入模式改造。

## 需求详情

- [ ] 给 `runTag(argv: string[])` 添加 `io: CuratorIO = defaultCuratorIO` 参数
- [ ] 替换内部所有 `console.log` → `io.log`，`console.error` → `io.error`，`process.exit` → `io.exit`
- [ ] cli.test.ts 新增 T1-T4 测试
- [ ] showcase/ 下新增 `curator-tag-reproduce.sh` Agent BDD

## 技术方案

参见 Epic SSOT §1（IO 注入模式）和 §5（代码位置）。

`runTag` 当前在 cli.ts L1172，内部调用链：
- L1175-1184: `console.error` + `process.exit(1)` — 缺少 skill name
- L1189-1190: `console.error` + `process.exit(1)` — DB 未找到
- L1204-1205: `console.error` + `process.exit(1)` — 缺少 --niche 或 --qa
- L1215-1217: `console.error` + `process.exit(1)` — skill 未找到
- L1236-1239: `console.log` — tag 成功输出

## 验收标准

- [ ] `runTag` 签名改为 `runTag(argv: string[], io: CuratorIO = defaultCuratorIO)`
- [ ] `runTag` 内部零 `console.log`/`console.error`/`process.exit`
- [ ] T1: `tag skill-a --niche test` → io.log 包含 "Tagged skill-a"，DB 中 niches 包含 "test"
- [ ] T2: `tag skill-a --qa '{"source_type":"self","signal_value":8}'` → io.log 包含 "1 signal(s)"，niches 包含 `qa:{...}`
- [ ] T3: `tag nonexistent --niche test` → io.error 包含 "Skill not found"，io.exit(1)
- [ ] T4: `tag skill-a`（无 --niche 无 --qa）→ io.error 包含 "at least one --niche or --qa"，io.exit(1)
- [ ] `bun test packages/lythoskill-curator/src/cli.test.ts` 全绿
- [ ] showcase/ 下 `curator-tag-reproduce.sh` 可执行，judge.md 独立

## 进度记录
<!-- 执行时更新，带时间戳 -->

## 关联文件
- 修改: `packages/lythoskill-curator/src/cli.ts` (runTag)
- 修改: `packages/lythoskill-curator/src/cli.test.ts` (新增 T1-T4)
- 新增: `showcase/2026-05-29-curator-tag-reproduce-sh/reproduce.sh`
- 新增: `showcase/2026-05-29-curator-tag-reproduce-sh/judge.md`

## Git 提交信息建议
```
feat(curator): IO inject runTag (TASK-20260529214620383)

- runTag accepts CuratorIO, zero direct console/process calls
- T1-T4 unit tests with injected capture IO
- Agent BDD: curator-tag-reproduce.sh
```

## 备注
- Epic SSOT §1: IO 注入模式
- Epic SSOT §5: runTag 当前位置 cli.ts L1172
- ADR-20260518123403810: Agent-enriched niches (L3 metadata) — tag 写入的 niches 是 curator 个人标注，与 skill 作者 frontmatter 分离
