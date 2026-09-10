# TASK-20260910160707856: deck add --dry-run crashes with a TDZ ReferenceError before it can print the plan

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-09-10 | Created |

## Background & Goals
<!-- ⚠️ REQUIRED: Why is this task needed? What problem does it solve? Empty = shell, blocked by probe. -->

`deck add <locator> --dry-run` —— 一个**有文档的 flag** —— 会在打印计划之前就崩:

```
ReferenceError: Cannot access 'alias' before initialization
```

**根因(读码确认,静态可判)**:`add.ts:283` 在 `dryRun` 分支(:260 起)里用了 `alias`,
而 `alias` 声明在 `:371`(`const alias = rawAlias`)。同一函数作用域内的 TDZ ——
`--dry-run` 走到那一行必然抛,与该 deck 的内容无关。

**来源**:`TASK-20260910152029904` 的实现 ZK review(对象 `c4e75ec7`,log 在
`showcase/2026-09-10-zk-reviews/904-impl-round1.md`)。review 判定为**先前存在**
(在 `ddddcb16^` 同样可复现),故不在那张卡的范围里 —— 单独记,不夹带。

**为什么不是小事**:`--dry-run` 的用途正是"**动手之前先看清单**" —— 而它恰恰在看清单这一步崩。
用户会以为 dry-run 成功了(或以为 deck 有问题),而真正的动作根本没被执行到判断。

**同类的第二处(2026-09-10,ZK review 实测发现,先前存在)**:`deck remove` 在一个**读取器读不了的 deck**
(实测:含多行内联表 —— `@iarna/toml` 拒、`toml-eslint-parser` 收)上,抛的是**原始 iarna 栈**,
而不是一条说明。已在 `ddddcb16^:remove.ts:87` 复现(**与本卡同因**:崩在"本该给消息"的地方)。
两处一起修:`remove` / `add` 的解析失败都走同一条 catch → 三件套消息(是什么 / 为什么 / 怎么修),
不把栈直接甩给用户。

## Requirements
<!-- ⚠️ REQUIRED: List specific requirements. Keeping placeholders = shell. -->
- [x] `deck add <github locator> --dry-run` 打印计划并 **exit 0**,不抛 TDZ
- [x] `alias` 在 dry-run 需要它之前就有值(`rawAlias` 的解析顺序要在 `dryRun` 分支之前),或 dry-run 分支改用已有的中间量
      → 取 (a),并且**消掉重复名**:`rawAlias` 与 `const alias = rawAlias` 合并成一个 `let alias`,声明点在 dry-run 分支之前
- [x] 回归测试:`--dry-run` 走通一次(不联网:用现有 IO seam 打桩),断言不抛且输出含计划
- [x] 顺带核对:`--dry-run` 的输出是否仍与真实执行将要做的**一致**(它是"计划",计划与实际分叉就是另一类失效)
      → 核出三处分叉,修两处 + 记录一处(见 Progress Log「计划/实际分叉核对」)

## Technical Approach
<!-- ⚠️ REQUIRED: Implementation plan, key decisions, references. Empty = shell, blocked by probe.

     ⚠️ A DECISION DOES NOT BELONG IN THIS SECTION. If this card introduces or
     changes an abstraction, a module boundary, a package boundary, a named
     concept, or a closed data set — that is an architectural decision, and it
     must be recorded in an ADR. This section may only REFERENCE that ADR; it
     must never be the only record. A one-line statement of intent gives a
     reviewer nothing to object to: no options to reject, no rejected
     alternative to question. Two same-shape incidents (feed-adapters.ts 2026-05,
     adapter-registry.ts 2026-09) both rode in exactly this section.

     Prepare it first, in full:  bunx @lythos/project-cortex adr "<decision-title>"
     Criteria (hit >= 2 of C1-C6): AGENTS.md § Decision Records -->

**这是实现缺陷,不是架构决策** —— 不涉抽象/边界/命名/封闭数据集,判据 C1-C6 不命中,故本卡不引 ADR。

改法二选一,倾向 (a):
- **(a) 把 `alias` 的确定提前到 dry-run 分支之前**:`rawAlias`/`@skill` 覆盖的解析不依赖冷池或网络
  (读的是 locator 字符串),所以顺序可以前移,`dry-run` 与真实执行共用同一份 alias 决定
  —— 顺带保证"计划"与"实际"不会再分叉(见 AC4)。
- **(b) dry-run 分支改用已有的中间量**(若 `:283` 只用到 `fqPathBefore` 派生的别名)。

**不要**用 try/catch 把一个 TDZ 包起来 —— 那只是把"崩"换成"计划里少一行"。

相关:`add.ts:260`(dry-run 分支起点)、`:283`(使用点)、`:371`(声明点)。

## Acceptance Criteria
<!-- ⚠️ REQUIRED: Testable acceptance criteria. Keeping placeholders = shell. -->
- [x] **AC1** `deck add <locator> --dry-run` 不抛 `ReferenceError`,退出码 0
      → 真实 CLI 实测 exit 0(修前 exit 1 + `ReferenceError: Cannot access 'alias' before initialization`)
      → 单测:`addSkill --dry-run > prints the plan and returns without throwing`
- [x] **AC2** 输出含它该有的计划内容(目标 section / alias / path / clone 或复用判定)
      → `[tool.skills.lythoskill-deck]` / `path = "github.com/lythos-labs/lythoskill/skills/lythoskill-deck"`
      / `♻️  Would reuse the existing dir — no clone`(复用判定按 executeFetchPlan 的口径:看目录,不看 `.git`)
- [x] **AC3** 一条测试钉住:dry-run 路径走通(IO 打桩,不联网)
      → 断言含 `[tool.skills.widgets]` / `path = ...` / `Would clone`,且 `exit` 缝从未被调用
      → 该测试在 dry-run 分支**之前**返回,不注入 `fetchPlan`/`probe`,所以既不联网也不碰冷池
- [x] **AC4** dry-run 与实际执行的 alias 决议一致(同一个来源,不是两份推导)
      → 合并为**一个** `let alias`(声明点在 dry-run 分支之前);`@skill` 那一支计划期定不了,
      dry-run 现在**明说** provisional,不再印一份看起来已定的清单(实测分叉见下)

## Progress Log
<!-- Update during execution, with timestamps -->

### 2026-09-11 — 两处缺陷都修了,7 条测试钉住,4 条 mutation 反向验证

**环境**:Bun 1.3.11 / macOS(Darwin Kernel 24.6.0, arm64)

**基线(改动前)**:`bun test packages/lythoskill-deck/` → **292 pass / 1 skip / 0 fail / 781 expect**,Ran 293 tests across 17 files。
**改动后**:同一命令 → **299 pass / 1 skip / 0 fail / 812 expect**,Ran 300 tests across 17 files。
全仓 `bun --filter='*' run test` 亦无 fail(13 个包;skill-deck 300 tests)。

**复现(修前,真实 CLI,未打桩)**:

```
$ deck add github.com/lythos-labs/lythoskill/skills/lythoskill-deck --dry-run --deck /tmp/deckrepro/skill-deck.toml
  …会在 `[${skillType}.skills.${alias}]` 一行炸:
  ReferenceError: Cannot access 'alias' before initialization.
      at addSkill (add.ts:283:44)          → exit 1

$ deck remove beta --deck <含多行内联表的 deck>
  TomlError: Unterminated inline array at row 6, col 9, pos 96
      at removeSkill (remove.ts:88:16)     → exit 1   ← 原始 iarna 栈,不是消息
```

**修了什么**

| 文件 | 改动 |
|---|---|
| `packages/lythoskill-deck/src/add.ts` | `rawAlias` + `const alias = rawAlias` 两个名字合并为一个 `let alias`,声明点移到 dry-run 分支**之前**;发现阶段改成对同一个变量赋值。dry-run 分支:①deck 读不了就地拒绝(见下)②复用/克隆判定改用 `existsSync(targetDir)`(= executeFetchPlan 的口径,它看目录、不看 `.git`),带 `#ref` 时改报 `Would fetch+checkout ref <ref>` ③`@skill` 时明说 alias/path 是 provisional。写回前的 `parseToml` 换成 `readDeckOrExplain` 守卫。 |
| `packages/lythoskill-deck/src/remove.ts` | 第 88 行的裸 `parseToml` 换成 `readDeckOrExplain` 守卫(三件套消息 + exit 1,盘上一个字节不动)。 |
| `packages/lythoskill-deck/src/parse-deck.ts` | 新增 `readDeckOrExplain(raw, deckPath)`:写路径共用的读法,失败返回三行(what/why/fix),措辞与 `toml-splice.ts` 的 `would-corrupt` 同源。 |
| `packages/lythoskill-deck/src/add.test.ts` | +5 测试(dry-run 计划 / 复用判定 / `@skill` provisional / dry-run 拒绝坏 deck / 写回路径三件套)。 |
| `packages/lythoskill-deck/src/remove.test.ts` | +2 测试(C14 坏 deck 三件套 + 盘不变;C15 可读 deck 仍照常删 —— 守卫不是无差别拒绝)。 |

**没做的事(刻意)**:没有用 try/catch 把 TDZ 包起来 —— 那只是把"崩"换成"计划里少一行"(卡里已点名)。

**mutation 反向验证**(在 `/tmp/lytho-scratch` 的整仓副本上做,主仓只读;每次先重置全部文件再施加单个反向改动):

| 反向改动 | 变红的测试 |
|---|---|
| m1 alias 回到原形状(`rawAlias` 在前、`const alias = rawAlias` 在后) | `prints the plan and returns without throwing (TDZ pin)` + 同组另 2 条 |
| m2 去掉 provisional 说明 | `@skill locator: the plan marks alias/path as provisional` |
| m3 复用判定回到 `.git` 口径 | `prints the plan and returns without throwing (TDZ pin)`(断言反转成 `Would reuse`) |
| m4 撤掉 remove 的读盘守卫 | `removeSkill > C14: unreadable deck → three-part message, exit 1, file byte-identical` |
| m5 撤掉 add 写回路径的读盘守卫 | `write path: unreadable deck → three-part message, not the iarna stack` |
| m6 撤掉 dry-run 的 deck 可读性检查 | `unreadable deck: refuses before printing a plan, with the three-part message` |
| m7 helper 消息退回只有 what 一行 | 上表 3 条(断言 `why:`/`fix:` 的),跨 add/remove 两个文件 |

**计划/实际分叉核对(Req4)**:核出三处,修两处、记录一处。

1. **复用/克隆判定**:dry-run 用 `.git` 是否存在,`executeFetchPlan` 只看目录在不在 → 目录在但没 `.git` 时,计划说"会 clone",实际不 clone。**已修**(改口径 + `#ref` 分支)。
2. **`@skill` 的 alias/path**:计划期定不了(要克隆后读 SKILL.md)。实测分叉(真实 CLI):
   `deck add lythos-labs/lythoskill@lythoskill-deck --dry-run` 印 `[tool.skills.lythoskill]` /
   `path = "github.com/lythos-labs/lythoskill"`,而**真实执行写的是** `[tool.skills.lythoskill-deck]` /
   `path = "…/skills/lythoskill-deck"`。这个分叉**消不掉**(dry-run 不克隆),所以**已修**成"计划自己说出来"。
3. **alias 冲突**:真实执行在写回前会因 `❌ Alias "<x>" already exists in deck` 拒绝(带 clone 之后),dry-run 完全不提。
   **未修,记录在此** —— 理由是它不在本卡的两类缺陷里(那条路径给的是消息、不是栈),而修它要重排写回路径那段扫描
   (那段目前零测试覆盖),风险与收益不成比例。可另开卡。

**一处没动的同源位置(记录,不改)**:`deck link`(link.ts:357)、`deck to-snapshot`(to-symlink-snapshot.ts:73)、
`per-run.ts:144`、`migrate-schema.ts:23` 在同一个坏 deck 上仍是原始 iarna 栈(`deck validate` 则是干净的一行)。
本卡点名的是 remove/add 两处,故按卡的范围做;`readDeckOrExplain` 已在 `parse-deck.ts` 里,谁要接都能一条线接上。

**⚠️ trailer 未生效(下一个 agent 必读)**:提交 `83f14fd3` 带 `Task: TASK-20260910160707856 review`,
但 post-commit 的 cortex 派发**拒绝了**这次转换:

```
❌ Invalid transition for Task TASK-20260910160707856: backlog → review
   Allowed targets from "backlog": in-progress
```

即本卡停在 `01-backlog`(执行者按纪律**不自己**跑状态转换)。要走 review 得先 `cortex start TASK-20260910160707856`。
之所以是 backlog:卡从建立起就没被 start 过。

**⚠️ 工作树异常(下一个 agent 必读)**:本卡的三处**源码**改动被并行 agent 的 commit `5a853c71`
("docs(cortex): fix a dead INDEX pointer…",00:12:41)顺手带走了 —— 那笔提交的文件表里混着
`deck/src/add.ts`(+47)/`parse-deck.ts`(+37)/`remove.ts`(+12),提交信息里一个字都没提。代码没丢(已在 HEAD),
但归属错了:查本卡的源码改动**必须看 `5a853c71`**,不能只看带本卡 trailer 的提交。测试与卡片本身在后续那笔提交里。

## Related Files
- Modified:
  - `packages/lythoskill-deck/src/add.ts` — alias 单一定值点 + dry-run 计划(提交在 `5a853c71`)
  - `packages/lythoskill-deck/src/remove.ts` — 读盘守卫(提交在 `5a853c71`)
  - `packages/lythoskill-deck/src/parse-deck.ts` — 新增 `readDeckOrExplain`(提交在 `5a853c71`)
  - `packages/lythoskill-deck/src/add.test.ts` — +5 测试
  - `packages/lythoskill-deck/src/remove.test.ts` — +2 测试
- Added: 无

## Git Commit Message
```
fix(deck): pin the dry-run TDZ fix and the unreadable-deck message with tests (TASK-20260910160707856)

- 5 tests on add: dry-run plan prints (no TDZ), reuse-vs-clone by executeFetchPlan's
  own criterion, @skill alias/path marked provisional, unreadable deck refused
  before a plan is printed, write-back parse failure gets what/why/fix
- 2 tests on remove: unreadable deck → three-part message, exit 1, file byte-identical;
  a readable deck still removes (the guard is not a blanket refusal)
- source hunks landed in 5a853c71 (swept in by a concurrent commit) — see card Progress Log
- baseline: 299 pass / 1 skip / 0 fail / 812 expect @ Bun 1.3.11 / macOS 24.6.0
```

## Notes
- 缺陷二里三件套消息的措辞与 `toml-splice.ts` 的 `would-corrupt` 对齐
  ("cannot be read by the tool's own parser" / "'deck validate' uses the same parser"),
  这样"读取器读不了的 deck"在两条路径上是同一套说法。
- dry-run 在坏 deck 上**拒绝并 exit 1**(而不是印一份跑不了的清单):计划与实际的**可执行性**同判。
  这是行为变化,但它只影响"deck 读不了"这一条路径 —— 修前那条路径上是 `deck add`(非 dry-run)崩栈、
  dry-run 照印计划。
- `add.ts` 里 `if (!deck[skillType]) …` 那段(标为 "Ensure target section exists")在 splice 落地后已成死代码
  (`deck` 之后只被冲突扫描读,别处都用 `src` 文本 splice)。未删:不在本卡范围,留给写回路径那张卡一起处理。
