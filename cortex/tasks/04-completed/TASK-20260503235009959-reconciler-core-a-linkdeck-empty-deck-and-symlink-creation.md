# TASK-20260503235009959: Reconciler core A: linkDeck empty deck and symlink creation

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-03 | Created |
| in-progress | 2026-05-04 | Started — Theme B tracer bullet, T3 解锁起点 |
| completed | 2026-05-04 | B1/B2/B2.b 全绿,12 it() pass,test:all 34 pass 无破坏 |

## 背景与目标

deck 包目前 0 unit test。T1(`TASK-20260503235008935`)已用 3 个纯函数证明 `bun:test` + tmpdir sandbox 可跑通。

本卡是 **Theme B(Reconciler 核心链路)** 的 tracer bullet:`linkDeck()` 是 deck 的心脏逻辑，直接操作文件系统（mkdir、symlink、writeFile），最需要回归保险。T2 聚焦 **happy path** —— 空牌组初始化 + 正常 symlink 创建，为 T3 的边界行为（deny-by-default、alias collision）铺路。

**接口无需改**: `linkDeck` 已 exported(`packages/lythoskill-deck/src/link.ts:155`); 本卡只补测试，不改实现（除非暴露不可测的硬伤）。

## 关联引用(零上下文 subagent boot 用)

| 引用 | 路径 | 用途 |
|---|---|---|
| Epic | `cortex/epics/01-active/EPIC-20260503234346583-...md` 主题 B | 范围、共同纪律、80% 覆盖率目标 |
| 前序任务 | `cortex/tasks/04-completed/TASK-20260503235008935-...md` | T1 tracer pattern: mkdtempSync sandbox + co-located test + public interface only |
| 后续任务 | `cortex/tasks/01-backlog/TASK-20260503235011219-...md` | T3 边界行为: deny-by-default + alias collision |
| 源文件 | `packages/lythoskill-deck/src/link.ts` | `linkDeck` 实现位置 |
| 现有测试 | `packages/lythoskill-deck/src/link.test.ts` | T1 纯函数测试，本卡追加 reconciler 用例 |
| /tdd 准则 | `.claude/skills/tdd/SKILL.md` | vertical slice; public interface only; tracer bullet 先 |

## 需求详情(每条 = 1 vertical slice, RED→GREEN 单独走完)

- [x] **B1.tracer** `linkDeck` empty deck → 创建 working set 目录 + `skill-deck.lock`
  - 构造 deck.toml: `[deck]` 段含 `max_cards` / `working_set` / `cold_pool`，**无 skill 声明**
  - cold pool 留空（或存在但不声明）
  - 调用 `linkDeck(deckPath, projectDir, true)` —— `noBackup=true` 跳过 tar 备份逻辑
  - 断言: `working_set` 目录存在
  - 断言: `skill-deck.lock` 存在且 JSON parse 成功
  - 断言: `lock.skills` 为空数组，`constraints.total_cards === 0`，`constraints.within_budget === true`
  - 断言: `lock.deck_source.content_hash` 为 64 位 hex 字符串（测试侧独立 `createHash('sha256')` 计算 deck.toml 原始内容的期望值）

- [x] **B2** `linkDeck` declared skill + cold pool 存在 → working set 出现正确 symlink
  - 构造 deck.toml: 声明 1 个 skill（新格式 `[tool.skills.my-alias] path = "github.com/owner/repo/skill"`，使用 **FQ 路径** 对照真实格式）
  - cold pool 中 `placeSkill(coldPool, 'github.com/owner/repo/skill')` 构造 fake skill（`findSource` 对 FQ path 会先尝试 `skills/` 子目录，再 fallback 到直接路径；此处用直接路径命中，覆盖最常见场景；含 `SKILL.md` 及 frontmatter）
  - 调用 `linkDeck(deckPath, projectDir, true)`
  - 断言: working set 中 `<alias>` 存在且 `lstatSync().isSymbolicLink()`
  - 断言: `readlinkSync(<alias>)` 指向 cold pool 中 skill 目录的绝对路径
  - 断言: `skill-deck.lock` 中 `skills.length === 1`
  - 断言: lock entry 字段完整 —— `name`, `alias`, `type`, `source`(相对 cold_pool), `dest`(相对 projectDir), `content_hash`, `linked_at`, `deck_niche`, `deck_managed_dirs`

- [x] **B2.b** `linkDeck` 幂等性 —— 再次运行同一 deck，symlink 不重复、不报错
  - 在 B2 的 sandbox 上再次调用 `linkDeck`
  - 断言: working set 中仍只有 1 个 symlink，指向不变
  - 断言: lock 文件被覆写（`generated_at` 更新）
  - 断言: skills 数组长度仍为 1，`alias`/`source`/`dest` 不变（不比较 `linked_at`，该字段每次运行刷新）

## 技术方案

- **位置**: `packages/lythoskill-deck/src/link.test.ts`（co-located，在 T1 的 9 个 `it()` 之后追加）
- **沙箱**: 复用 T1 的 `makeTmp()` + `cleanup` + `afterEach` 模式；每个 reconciler test 需要 **2 个 tmpdir**: `projectDir`(deck + working set + lock)、`coldPool`(fake skill)
- **deck.toml 构造**: 新格式 alias-as-key dict schema（参考根目录 `skill-deck.toml`），`working_set` / `cold_pool` 用相对路径（自动相对于 `PROJECT_DIR` resolve）
- **cold pool 构造**: 复用 `placeSkill` helper（T1 已有），追加 `placeSkillWithFrontmatter` 若需要验证 `deck_niche` / `deck_managed_dirs`
- **`noBackup=true`**: 必须传第 3 参数 `true`，否则非 symlink 实体会触发 tar 备份（虽然 sandbox 中通常没有，但防御性传参）
- **Happy path only**: `linkDeck` 内部多处 `process.exit(1)`（deck 不存在、alias collision、max_cards 超限、backup 失败等）。T2 构造无 error 输入，**不触发 exit**。若发现即使 happy path 也 exit → 立即上报，可能需先重构 `linkDeck` 为返回结果+包装器模式
- **TDD 节奏**: 一次一个 `it()`，`bun test packages/lythoskill-deck/src/link.test.ts` 跑通再加下一个；不允许 horizontal
- **不写 speculative**: 不预写 deny-by-default 或 alias collision 的测试（那是 T3）

## 验收标准

- [x] `link.test.ts` 追加 3 个 reconciler `it()`（B1.tracer / B2 / B2.b），全部 GREEN
- [x] `bun test packages/lythoskill-deck/src/link.test.ts` 本地全绿（含 T1 的 9 个 + T2 的 3 个 = 12 个）
- [x] `bun run test:all`（已跑 21 BDD）未被破坏
- [x] 所有断言通过 `linkDeck` 的 **fs 副作用** 验证（目录存在、symlink 指向、lock 内容），不测试内部私有函数
- [x] 每个 test 独立 tmpdir，无跨 test 状态污染
- [x] 不依赖真实 `~/.agents/skill-repos`
- [x] 进度记录段保留 RED→GREEN 节奏的简短脚注

## 进度记录
- 2026-05-04 02:00: B1.tracer RED→GREEN — empty deck 生成 lock，`content_hash` 用 `createHash` 独立计算断言
- 2026-05-04 02:05: B2 RED→GREEN — FQ path `github.com/owner/repo/skill` + `placeSkill` 直接路径命中，`symlink`/`lock entry`/`frontmatter` 全断言通过
- 2026-05-04 02:10: B2.b RED→GREEN — 幂等性，`generated_at` 比较需两次调用间 `setTimeout(50)`（毫秒级时间戳碰撞）
- 2026-05-04 02:15: `bun test link.test.ts` 12 pass，`bun run test:all` 34 pass 无破坏，任务完成

## 关联文件
- 修改:
  - `packages/lythoskill-deck/src/link.test.ts`（追加 reconciler 用例）
- 新增: 无

## Git 提交信息建议
```
test(deck): add reconciler core A tests — empty deck + symlink creation (TASK-20260503235009959)

- linkDeck empty deck: working set created, lock generated with zero skills
- linkDeck declared skill: symlink points to cold-pool skill, lock entry validated
- Idempotency: re-run produces identical symlink state
- Continues T1 tracer pattern: mkdtempSync sandbox, public interface only

Closes: TASK-20260503235009959
```

## 备注

- **不要**重写 `link.ts` —— 本卡只测，不改实现（除非 happy path 也触发 `process.exit`）
- **不要**抽 fixture helper 到 test-utils —— `placeSkill` 重复出现 ≥3 次后再说(YAGNI)
- **不要**预写 T3 内容（deny-by-default / alias collision / max_cards）—— 严守 vertical slice
- `linkDeck` 的 `process.exit` 是 T2 的最大风险点：若测试进程被 kill，需评估是否要先做可测试性重构（将核心逻辑提取为返回 `{lock, errors}` 的纯函数，`linkDeck` 变为 thin wrapper）
- 若 test 暴露 `link.ts` 真 bug → 单独写 fix commit + 加回归测试（本卡范围内不处理 bug，只补 regression bedrock）
