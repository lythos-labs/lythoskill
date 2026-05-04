# TASK-20260503235011219: Reconciler core B: linkDeck deny-by-default and alias collision

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-03 | Created |
| in-progress | 2026-05-04 | Pulled from backlog — T1 done, process.exit strategy TBD |
| completed | 2026-05-04 | B3/B4/B4.b/B5 全绿,16 it() pass,test:all 34 pass 无破坏 |

## 背景与目标

T2(`TASK-20260503235009959`)已验证 `linkDeck` 的 happy path: empty deck 初始化 + declared skill 的 symlink 创建。

本卡验证 reconciler 的 **边界行为**——deny-by-default（清理未声明 symlink）、alias collision（fatal error）、max_cards 超限（硬拒绝）。这些是 deck 的"安全护栏"，回归代价最高，必须有单测保险。

**依赖 T2**: 若 T2 发现 `linkDeck` 的 `process.exit` 不可测试，本卡需先等待可测试性重构。

## 关联引用(零上下文 subagent boot 用)

| 引用 | 路径 | 用途 |
|---|---|---|
| Epic | `cortex/epics/01-active/EPIC-20260503234346583-...md` 主题 B | 范围、共同纪律、80% 覆盖率目标 |
| 前序任务 | `cortex/tasks/02-in-progress/TASK-20260503235009959-...md` | T2 reconciler core A: happy path 测试 + sandbox 模式 |
| 源文件 | `packages/lythoskill-deck/src/link.ts` | `linkDeck` 实现，line 155-539 |
| 现有测试 | `packages/lythoskill-deck/src/link.test.ts` | T1/T2 测试，本卡追加 |
| /tdd 准则 | `.claude/skills/tdd/SKILL.md` | vertical slice; public interface only; no speculative tests |

## 需求详情(每条 = 1 vertical slice, RED→GREEN 单独走完)

- [x] **B3** `linkDeck` deny-by-default — 清理 working set 中未声明的 symlink
  - 构造 sandbox: deck.toml 声明 skill-a；working set 中预置 skill-a（symlink）+ skill-b（symlink，未声明）
  - 调用 `linkDeck(deckPath, projectDir, true)`
  - 断言: working set 中 skill-a 仍在，skill-b 被移除
  - 断言: lock 中 `skills` 只有 skill-a
  - 断言: stdout/stderr 中出现 `Removed: skill-b` 字样

- [x] **B4** `linkDeck` same-type alias collision → fatal error
  - 构造 deck.toml: `[tool.skills.foo]` path=A, `[tool.skills.foo]` path=B（同一 section 内 alias 重复）
  - 调用 `linkDeck`
  - 断言: 非零退出（若 `process.exit` 已重构为抛错/返回，则断言异常；若未重构，用 spawn 子进程断言 exitCode===1）
  - 断言: stderr 包含 `Alias collision`

- [x] **B4.b** `linkDeck` cross-type alias collision → fatal error
  - 构造 deck.toml: `[innate.skills.foo]` + `[tool.skills.foo]`（不同 section 同 alias）
  - 调用 `linkDeck`
  - 断言: 同 B4，非零退出 + stderr 含 `Alias collision`

- [x] **B5** `linkDeck` max_cards 超限 → 硬拒绝
  - 构造 deck.toml: `max_cards = 2`，声明 3 个 skill
  - 调用 `linkDeck`
  - 断言: 非零退出 + stderr 含 `Budget exceeded`
  - 断言: working set **未创建/未修改**（链接前检查，fail-fast）

## 技术方案

- **位置**: `packages/lythoskill-deck/src/link.test.ts`（追加）
- **沙箱**: 复用 T1/T2 的 `makeTmp()` + `cleanup` + `afterEach`
- **Deny-by-default (B3)**: 纯 sandbox，无 `process.exit` 风险，优先级最高，可先跑
- **Error-path (B4/B4.b/B5)**: 涉及 `process.exit(1)`（link.ts:267, 287）。
  - **首选**: 若 T2 阶段已完成可测试性重构（将 `linkDeck` 核心逻辑提取为返回 `{lock, errors, fatal: boolean}` 的 `reconcileDeck()` 纯函数，`linkDeck` 变为 thin wrapper 处理 `process.exit`），则直接调用 `reconcileDeck()` 断言返回值。
  - **Fallback**: 若未重构，用 `spawnSync('bun', [cli.ts, 'link', ...])` 在子进程中运行，通过 exit code + stderr 断言。这会增加测试复杂度（需要构造完整工作目录并作为 cwd 传入），但仍可行。
- **TDD 节奏**: B3 先跑（无 exit 风险）→ B4/B4.b/B5 后跑（等 process.exit 策略确定）
- **不写 speculative**: 不预写 transient 过期或 managed_dirs 重叠测试（留给 T6 coverage sweep）

## 验收标准

- [x] `link.test.ts` 追加 4 个 reconciler 边界 `it()`（B3/B4/B4.b/B5），全部 GREEN
- [x] `bun test packages/lythoskill-deck/src/link.test.ts` 本地全绿（含 T1/T2 的用例）
- [x] `bun run test:all`（21 BDD）未被破坏
- [x] B3 通过 `linkDeck` 公共接口的 fs 副作用验证；B4/B4.b/B5 通过 exit code / stderr / 异常验证
- [x] 每个 test 独立 tmpdir，无跨 test 污染
- [x] 不依赖真实 `~/.agents/skill-repos`
- [x] 进度记录段保留 RED→GREEN 节奏脚注

## 进度记录
- 2026-05-04 02:45: B3 RED→GREEN — deny-by-default，`symlinkSync` 预置 undeclared skill，`linkDeck` 后断言移除
- 2026-05-04 02:50: B4 RED→GREEN — same-type collision 用旧格式 string-array 构造（新格式 TOML key 唯一，不可同 alias）
- 2026-05-04 02:52: B4.b RED→GREEN — cross-type collision 新格式 `[innate.skills.foo]` + `[tool.skills.foo]`
- 2026-05-04 02:55: B5 RED→GREEN — max_cards=2 声明 3 skill，`spawnSync` 断言 exit 1 + stderr + working set 未创建
- 2026-05-04 02:58: `bun test link.test.ts` 16 pass，`bun run test:all` 34 pass，任务完成

## 关联文件
- 修改:
  - `packages/lythoskill-deck/src/link.test.ts`（追加边界用例）
- 新增: 无

## Git 提交信息建议
```
test(deck): add reconciler core B tests — deny-by-default, collision, budget (TASK-20260503235011219)

- deny-by-default: undeclared symlinks removed from working set
- same-type alias collision: fatal error with non-zero exit
- cross-type alias collision: fatal error across innate/tool/combo
- max_cards exceeded: hard rejection before any symlink creation

Closes: TASK-20260503235011219
```

## 备注

- **process.exit 风险是本卡最大变量**: `linkDeck` 在 alias collision 和 max_cards 超限时调用 `process.exit(1)`。若 T2 未解决，本卡执行前可能需要额外一个 `refactor(linkDeck): extract reconcileDeck core for testability` commit。
- **不要**重写 `link.ts`——若需重构，单独提 commit，不在本测试 commit 中混实现改动。
- **不要**预写 T4/T5 的命令层测试——严守 vertical slice。
