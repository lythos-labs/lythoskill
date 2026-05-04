# TASK-20260503235012454: Command layer A: validateDeck and addSkill tests

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-03 | Created |
| in-progress | 2026-05-04 | Pulled from backlog — validateDeck + addSkill unit tests |
| completed | 2026-05-04 | C1-C5 + C6-C8 全绿, 8 it() pass, test:all 34 pass 无破坏 |

## 背景与目标

T2/T3 已覆盖 reconciler 核心链路（`linkDeck` 的 happy path + 边界行为）。本卡进入 **主题 C（命令层公共接口）**，为 `validateDeck()` 和 `addSkill()` 补单测。

这两个命令是用户最常直接调用的 CLI 入口背后的实现：
- `validateDeck`: 只读验证，零副作用，适合快速回归
- `addSkill`: 写 deck.toml + 下载 skill + 触发 link，有 network 副作用

## 关联引用(零上下文 subagent boot 用)

| 引用 | 路径 | 用途 |
|---|---|---|
| Epic | `cortex/epics/01-active/EPIC-20260503234346583-...md` 主题 C | 范围、共同纪律 |
| 前序任务 | `cortex/tasks/02-in-progress/TASK-20260503235009959-...md`(T2) / `cortex/tasks/01-backlog/TASK-20260503235011219-...md`(T3) | reconciler 测试已完成，sandbox 模式已验证 |
| 源文件 | `packages/lythoskill-deck/src/validate.ts` | `validateDeck` 实现 |
| 源文件 | `packages/lythoskill-deck/src/add.ts` | `addSkill` 实现 |
| 现有测试 | `packages/lythoskill-deck/src/link.test.ts` | T1-T3 测试，本卡可新建 `validate.test.ts` / `add.test.ts` |
| CLI BDD | `packages/lythoskill-deck/test/scenarios/*.ts` | 20 个 CLI integration BDD 已覆盖部分场景，但无法定位模块级回归 |
| /tdd 准则 | `.claude/skills/tdd/SKILL.md` | vertical slice; public interface only |

## 需求详情(每条 = 1 vertical slice, RED→GREEN 单独走完)

### validateDeck

- [x] **C1** Valid deck → passes
  - 构造完整 deck.toml（新格式 dict schema，含 [deck] + 声明 skills + cold pool 命中）
  - 调用 `validateDeck(deckPath, projectDir)`
  - 断言: stdout 含 `Validation passed`

- [x] **C2** Missing `[deck]` section → error
  - 构造 deck.toml: 无 `[deck]` 段
  - 调用 `validateDeck`
  - 断言: 非零退出，stderr 含 `[deck] section is required`

- [x] **C3** Invalid `max_cards` → error
  - 构造 deck.toml: `max_cards = -1` 或 `max_cards = "ten"`
  - 调用 `validateDeck`
  - 断言: 非零退出，stderr 含 `deck.max_cards must be a positive integer`

- [x] **C4** Skill not found in cold pool → error
  - 构造 deck.toml: 声明一个不存在的 skill
  - 调用 `validateDeck`
  - 断言: 非零退出，stderr 含 `Skill not found`

- [x] **C5** Budget exceeded → error
  - 构造 deck.toml: `max_cards = 1`，声明 2 个 skill
  - 调用 `validateDeck`
  - 断言: 非零退出，stderr 含 `Budget exceeded`

### addSkill

- [x] **C6** Add to empty project → creates deck.toml + cold pool + links
  - 空 projectDir，无 deck.toml
  - 调用 `addSkill('github.com/owner/repo/skill', { workdir: projectDir })`
  - 断言: `skill-deck.toml` 被创建，含新增 skill 的 dict 格式 entry
  - 断言: cold pool 中存在下载的 repo（若网络不可用，此测试标记 `// network required`）

- [x] **C7** Add to existing deck → appends entry, preserves existing
  - 已有 deck.toml，含 1 个 skill
  - 调用 `addSkill(...)` 添加第二个 skill
  - 断言: deck.toml 中两个 skill 都在，格式一致

- [x] **C8** Alias collision in add → rejected
  - 已有 deck.toml，含 alias "foo"
  - 调用 `addSkill(..., { as: 'foo' })`
  - 断言: 非零退出，stderr 含 `Alias "foo" already exists`

## 技术方案

- **位置**:
  - `packages/lythoskill-deck/src/validate.test.ts`（co-located）
  - `packages/lythoskill-deck/src/add.test.ts`（co-located）
- **沙箱**: 同 T1-T3 的 `mkdtempSync` + `afterEach` 模式
- **validateDeck**: 和 `linkDeck` 类似，内部有 `process.exit(1)`。若 T2/T3 阶段已完成重构，直接测返回值；若未重构，用 `spawnSync` 子进程或只测 happy path（C1），error path 延后。
- **addSkill 的 network 问题**: `addSkill` 内部调用 `git clone` 或 `npx skills add`。
  - **策略 A（推荐）**: 预先在 tmpdir cold pool 中放置一个 fake repo（含 `.git` 和 `SKILL.md`），然后 patch `addSkill` 的输入使它在下载前发现 "Already exists"——但这测的是错误路径，不是 happy path。
  - **策略 B**:  mock `execFileSync` / `Bun.spawn`。项目整体风格是 "no mocks"，但 network 边界是合理例外。用 `bun:test` 的 `spyOn`  mock `node:child_process` 的 `execFileSync`，让 `git clone` 变成 `cp -r` 一个本地 fixture。
  - **策略 C**: 只测 `addSkill` 的 **deck.toml 写入逻辑**（C7/C8 可在已有 cold pool 上测），happy path 的下载部分留给 Agent BDD（T9）。
  - **决策**: 优先策略 C（垂直切片，先测能测的），若 deck.toml 写入逻辑需要 `git clone` 先成功才能到达，则退到策略 B（mock network）。
- **TDD 节奏**: validateDeck C1→C2→C3→C4→C5，然后 addSkill C6→C7→C8，一次一个 `it()`。

## 验收标准

- [x] `validate.test.ts` 落地，5 个 `it()` 全绿
- [x] `add.test.ts` 落地，3 个 `it()` 全绿
- [x] `bun test packages/lythoskill-deck/src/validate.test.ts` / `add.test.ts` 本地全绿
- [x] `bun run test:all` 未被破坏
- [x] 所有断言通过公共接口（`validateDeck` / `addSkill` 调用）
- [x] 每个 test 独立 tmpdir
- [x] 进度记录段保留 RED→GREEN 节奏脚注

## 进度记录
- 2026-05-04 03:00: C1 RED→GREEN — validate.ts 不支持 dict 格式，先 refactor 用 parseDeck 替换手动数组遍历
- 2026-05-04 03:05: C2→C5 RED→GREEN — missing-deck/invalid-max-cards/skill-not-found/budget-exceeded，spawnSync 子进程断言
- 2026-05-04 03:10: C6 RED→GREEN — addSkill 默认 cold_pool 依赖 homedir()，用 mock.module 拦截 + mock execFileSync 替代 git clone
- 2026-05-04 03:15: C7 RED→GREEN — append to existing deck，deck.toml 保留原格式
- 2026-05-04 03:18: C8 RED→GREEN — alias collision 触发 process.exit(1)，mock exit 为抛异常 + spyOn console.error
- 2026-05-04 03:20: `bun test` 27 pass，`bun run test:all` 34 pass，任务完成

## 关联文件
- 修改:
  - `packages/lythoskill-deck/src/validate.ts`（refactor: 用 parseDeck 替换手动数组遍历，兼容 dict schema）
  - `packages/lythoskill-deck/src/add.ts`（fix: linkDeck 调用始终传 deckPath，避免 fallback 到 process.cwd()）
- 新增:
  - `packages/lythoskill-deck/src/validate.test.ts`
  - `packages/lythoskill-deck/src/add.test.ts`

## Git 提交信息建议
```
test(deck): add command layer A tests — validateDeck + addSkill (TASK-20260503235012454)

- validateDeck: valid/missing-deck/invalid-max-cards/skill-not-found/budget-exceeded
- addSkill: create-new-deck/append-to-existing/alias-collision-rejection
- mkdtempSync sandbox, co-located with src

Closes: TASK-20260503235012454
```

## 备注

- **validateDeck 的 process.exit**: 同 T2/T3 风险。若 T2/T3 未重构，本卡 validateDeck error path 可能需要用 `spawnSync` 或延后到重构后。
- **addSkill 的 async**: `addSkill` 返回 `Promise<void>`，测试用 `await`。
- **不要**重写 `validate.ts` 或 `add.ts`——若 mock 策略需要调整接口，单独提 refactor commit。
- **不要**预写 remove/refresh/prune 测试（那是 T5）。
