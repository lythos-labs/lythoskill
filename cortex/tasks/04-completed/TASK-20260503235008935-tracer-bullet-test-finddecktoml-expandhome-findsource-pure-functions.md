# TASK-20260503235008935: Tracer bullet: test findDeckToml, expandHome, findSource pure functions

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-03 | Created |
| in-progress | 2026-05-04 | Started — Theme A tracer bullet,T2-T6 解锁起点 |
| review | 2026-05-03 | Deliverables committed |
| completed | 2026-05-03 | Closed via trailer |

## 背景与目标

deck 包目前 0 unit test。本卡是 Theme A(white-box 单测)的 **tracer bullet**:用 3 个纯函数(无副作用、易隔离、无 mock)证明 `bun:test` + tmpdir sandbox + 公共接口测试 **端到端可跑通**,为 T2-T6 的 reconciler 与命令层测试铺路。

**接口无需改**:三个目标函数已 exported(`packages/lythoskill-deck/src/link.ts:28/34/61`);本卡只补测试,不改实现。

## 关联引用(零上下文 subagent boot 用)

| 引用 | 路径 | 用途 |
|---|---|---|
| Epic | `cortex/epics/01-active/EPIC-20260503234346583-...md` 主题 A | 范围、共同纪律、80% 覆盖率目标 |
| 测试约定参考 | `packages/lythoskill-curator/src/cli.test.ts` | 项目内已有的 bun:test co-located 范例(`mkdtempSync` 沙箱模式) |
| ADR | `cortex/adr/02-accepted/ADR-20260503180000000-unit-test-framework-selection-curator-mind.md` | bun:test 选型 + 第 4 条 "Agent BDD 留给 test-utils runner" |
| /tdd 准则 | `.claude/skills/tdd/SKILL.md` | vertical slice;public interface only;tracer bullet 先 |
| 源文件 | `packages/lythoskill-deck/src/link.ts` | `findDeckToml`/`expandHome`/`findSource` 实现位置 |

## 需求详情(每条 = 1 vertical slice,RED→GREEN 单独走完)

- [ ] **A1.tracer** `findDeckToml` positive:tmpdir 写 `skill-deck.toml`,断返回拼接路径
- [ ] **A1.b** `findDeckToml` null:空 tmpdir,断返回 null
- [ ] **A2.a** `expandHome` `~/foo` → `<homedir>/foo`
- [ ] **A2.b** `expandHome` 相对路径 → `resolve(base, p)`
- [ ] **A3.a** `findSource` FQ 命中(`host.tld/owner/repo/skill` → `coldPool/host/owner/repo/skills/skill`)
- [ ] **A3.b** `findSource` 直接路径命中(`coldPool/<name>/SKILL.md`)
- [ ] **A3.c** `findSource` monorepo 命中(`coldPool/repo/skills/<name>/SKILL.md`)
- [ ] **A3.d** `findSource` 项目本地命中(`<projectDir>/skills/<name>/SKILL.md`)
- [ ] **A3.e** `findSource` 全部 miss → `{path: null}`(可附带 error)

## 技术方案

- **位置**:`packages/lythoskill-deck/src/link.test.ts`(co-located,跟随 curator 范例)
- **沙箱**:每个 test `mkdtempSync(join(tmpdir(), 'deck-link-'))`;`afterEach` 用 `rmSync(..., {recursive:true, force:true})` 清理
- **导入**:从 `./link.ts` 直接 import 三个函数
- **不 mock**:纯函数 + tmpdir 真实 fs;无任何 `jest.fn` / `vi.mock`
- **TDD 节奏**:**一次一个 it()**,`bun test packages/lythoskill-deck/src/link.test.ts` 跑通再加下一个;不允许 horizontal(一次性写 9 个 it())
- **不写 speculative**:不预测未来 reconciler 测试可能需要的 fixture helper;若 helper 出现重复,T2 卡里 refactor 再说

## 验收标准

- [ ] `link.test.ts` 落地,9 个 `it()` 全部 GREEN
- [ ] `bun test packages/lythoskill-deck/src/link.test.ts` 本地全绿
- [ ] `bun run test:all`(已跑的 21 BDD)未被破坏
- [ ] 所有断言通过 public interface(`findDeckToml` / `expandHome` / `findSource` 调用)
- [ ] 每个 test 独立 tmpdir(无跨 test 状态污染)
- [ ] 进度记录段保留 RED→GREEN 节奏的简短脚注(每行为 1 行即可,留作 T2-T6 复盘参考)

## 进度记录
<!-- 执行时更新，带时间戳 -->

- 2026-05-04 — TDD vertical slice 全程,9 个 it() 一次一个 RED→GREEN 拉到 GREEN
  - A1.tracer (findDeckToml positive) → 1 pass(沙箱 + import + path 拼接全链路验证)
  - A1.b (findDeckToml null) → 2 pass
  - A2.a (expandHome `~/`) → 3 pass(import 加 `homedir`)
  - A2.b (expandHome relative) → 4 pass
  - A3.a (findSource FQ) → 5 pass(`placeSkill` helper 加入)
  - A3.b (findSource direct) → 6 pass
  - A3.c (findSource monorepo) → 7 pass
  - A3.d (findSource project-local) → 8 pass
  - A3.e (findSource miss) → 9 pass(10 expect)
- `bun run test:all` 全 21 BDD 仍绿 → 未破坏既有路径
- 实现侧未动 `link.ts` 一行(本卡只补 regression bedrock)

## 关联文件
- 修改:无
- 新增:
  - `packages/lythoskill-deck/src/link.test.ts`

## Git 提交信息建议
```
test(deck): add tracer-bullet unit tests for link.ts pure functions (TASK-20260503235008935)

- bun:test + mkdtempSync sandbox, co-located with src
- findDeckToml present/absent
- expandHome ~/ expansion + relative resolve
- findSource FQ / direct / monorepo / project-local / miss

Closes: TASK-20260503235008935
```

## 备注

- **不要**重写 `link.ts`——本卡只测,不改实现
- **不要**抽 fixture helper 到 test-utils——helper 重复出现 ≥3 次后再说(YAGNI)
- 若 test 暴露 link.ts 真 bug → 单独写 fix commit + 加回归测试(本卡范围内不处理 bug,只补 regression bedrock)
- T2-T6 都依赖本卡的"可以测,sandbox 不漏,断言可读"这三件确认
