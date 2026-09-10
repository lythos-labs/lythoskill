# TASK-20260910111600389: deck-fanout-deletion-must-be-ownership-scoped-not-directory-containment

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-09-10 | Created |
| completed | 2026-09-10 | Closed via trailer |

## Background & Goals
<!-- ⚠️ REQUIRED: Why is this task needed? What problem does it solve? Empty = shell, blocked by probe. -->

`deck link` 的 fan-out(`also_link_to`)会把链接写进**它并不拥有**的目录 —— 包括别的项目的
`.claude/skills`,以及用户全局的 CLI 发现目录(`~/.config/goose/skills`、`~/.config/opencode/…`)。
写之前 `reconcileTargetDir` 会扫一遍目标目录,**把里面每一个非 symlink 条目 recursive 删掉**
(`link.ts:550-591`)。它的安全边界是**目录包含关系**,而目录包含关系不是所有权。

同一个形状在**五个**点各有一份(实查,非推断):

| # | 位置 | 删什么 | 有所有权证明吗 |
|---|---|---|---|
| 1 | `link.ts:590`(扫描清扫) | 目标目录里**任何**非 symlink 条目 | ❌ 只有路径包含 |
| 2 | `link.ts:593-607` | 任何不在 declaredNames 里的 symlink | ❌ 只 lstat,不看指向 |
| 3 | `safe-remove.ts:46-48` `removeEntryForRelink` else 支 | `dest` 上的真实目录 | ❌(调用方 `link.ts:621` / `link.ts:692` / `to-symlink-snapshot.ts:203`) |
| 4 | `remove.ts:36` | 工作集 / fan-out 条目上的真实目录 | ❌ |
| 5 | `to-symlink-snapshot.ts:129-131` | `dest` 上的真实目录(`deck to-symlink <alias>`) | ❌ —— 判定写的是 `currentMode`,而那个 mode 是 **lstat 推的**(`:114-118` / `:185-189`),**不是读 state 的** |

**⚠️ 卡面初稿曾把 `to-symlink-snapshot.ts` 写成"已有的正面先例"(以为它先读 state 才删)。
实读推翻:它读 state 只为拿 `lock`/`cold_pool` 去写回,删除判定来自 lstat。
`state.mode` 被记录了却从未被用作删除闸门 —— 仓里没有这个先例,本卡要立的就是它。**

**而那个本该让这件事可挽回的备份,是假的。** `link.ts:577` 的 tar 成员路径是
`"./" + relative(PROJECT_DIR, join(targetDir, e))`;当 `targetDir` 在项目外(这正是最危险的
情形)成员名带 `../` 前缀 → bsdtar 3.5.3 **能创建这个归档,但拒绝解出**
(`Path contains '..': Unknown error: -1`,exit=1,加不加 `-C` 都一样)。已实测复现。
所以现状是:**删得掉、赔不回,而且打印的那行「已备份」是无条件打的**(`link.ts:580`)。

**owner 已定调(2026-09-10)**:"哪怕同样是 k8s 协调心智,只管自己认领的还是好的。
破坏性操作还是太可怕了,尤其备份路径反而心不在焉。" → 安全边界应当是**所有权**
(`ownerReferences`:只管理自己能证明是自己创建的),不是路径。

**为什么现在做**:这是 data-loss 级,**默认路径**(备份未关)就会触发;
`TASK-20260910110545092` 收的是辩论 B 类项,judge B1-B18 无此项,**本卡不塞进那卡**
(那卡 charter 明写"本卡只收 B")。

**与 `TASK-20260910110545092` 的碰撞(实查,改前必读)**

- **B10 的测试目标会变。** `safe-remove.test.ts:98-102` 现在断言
  `removeEntryForRelink(realDir)` 把目录 recursive 删掉 —— 那正是本卡要禁掉的行为。
  本卡落地后该测试必须改成断言**拒绝 + 目录存活**,B10 要加的"嵌套内容断言"随之改写。
  两卡**不得并行改这一处**。
- **B2 的修法是两处不是一处。** `cli-layout.test.ts:49`
  `expect(h.triggerDirs).toEqual(['.goose/skills'])` 正把 B2 的漏报钉成绿的。
  卡面写"一行"是错的,那只数了数据行。

**第六处(落地时由 AC4 全仓复查发现,不在初稿的五个点里)**

`add.ts:332` —— `fetchResult.status === 'failed'` 分支里的
`rmSync(fetchPlan.targetDir, { recursive: true, force: true })`。
`failed` 有两条来路:localhost 那条(`fetch-plan.ts:47-53`,locator 无 remote)
**在 `exists(plan.targetDir)` 检查之前就返回**,于是 `targetDir` 可能是**运行前就存在**的
目录(用户自己放的、别的工具放的),却照样被递归删掉。与五个点同一类:
未证所有权 + 可达递归删除。闸门 = `!fetchPlan.alreadyExists` ——
`alreadyExists` 由 `buildFetchPlan` 观测真实 fs 得到,语义正好是"运行前这儿有没有东西"。

## Requirements
<!-- ⚠️ REQUIRED: List specific requirements. Keeping placeholders = shell. -->

**所有权判定(核心)**

- [x] **R1** 立一个**单一**判定 `deck 是否拥有此条目`,五个点共用一份实现
      (不得各点各写一份 —— 重复的判定就是下一个 `triggerDirs` 漏报)。判据**只有两条**:
      (a) 是 symlink 且其目标 resolve 后落在本 deck 的 `cold_pool` 内;
      (b) 在 `skill-deck.state` 里被记录为本 deck 创建的条目(见 R2)。
      **两条都不满足 = 外来条目,永不删。**
- [x] **R2** `StateSkill` 扩 `managed_dests: string[]`(`schema.ts:14-20`,`.default([])`)。
      现状 `state` 只记工作集 dest(`link.ts:682`),**fan-out 的 dest 一个都不记** ——
      而 fan-out 恰恰是 `targetModeOverride` 强制 cline 走 snapshot 的地方,
      不记就没法证明"这个 snapshot 是我建的"。**这是 R1(b) 的前提,不记则 cline 重链会永久拒绝。**
- [x] **R3** 判定只回答"删不删",**不做删除**;删除仍走 `safe-remove.ts`。

**四个点的收束**

- [x] **R4** `link.ts:550-591` 的扫描清扫:真实目录**一个都不删**。改为**审计**:枚举外来条目 →
      按 HATEOAS 三件套报告(是什么 / 为什么不动 / 怎么修)。非致命,继续处理其余目标。
      `>100MB 硬停` 与 `--no-backup` 分支随删除一起失去存在理由(见 R9/R10)。
- [x] **R5** `link.ts:593-607` 的 symlink 支:**保留删除能力**(它是工作集向声明态收敛的
      唯一通路 —— 用户直接改 toml 删条目时靠它收尾),但收紧到"**指向本 deck cold pool** 的
      symlink"才删。指向别处 / 无法读的 symlink 是外来的 → 报告不删。
      **不得**把这一支整体改成只报告:那会让工作集不再收敛于声明态,是功能回归。
- [x] **R6** `removeEntryForRelink`(`safe-remove.ts`):真实目录**未证所有权则拒绝**,
      返回/上报拒绝而不是默默 recursive 删。调用方收到拒绝 → 报错 + continue,不中断整次 link。
      返回值需能区分三态:**已删** / **本来就没有**(调用方照常往下走)/ **拒绝**(调用方报错)。
      只返回布尔会逼调用方靠字符串猜,那正是本卡要消灭的形态。
- [x] **R7** `remove.ts:36`:同一判据。外来真实目录 → 警告 + **留在原地**;
      deck.toml 条目照删、其余链接照删(即该点的失败不污染其余动作)。
- [x] **R8** `to-symlink-snapshot.ts` 两个盲点(上表 #5):
      `:129-131` 与 `:203` 都改为走共用判据;`:114-118` / `:185-189` 的 lstat 推 mode
      只保留"给人看的提示"用途,**不得**再作为删除依据。未证所有权 → 报错 + `exit(1)`
      (它是点名某个 alias 的显式命令,失败就该停下,不像 link 那样 continue)。

**备份路径**

- [x] **R9** 外来条目既然永不删,**tar 备份就没有存在理由了** → 撤掉,连带撤掉
      那行无条件的「已备份」宣称,以及 `../` 前缀的不可解归档(AC5 钉死)。
      不得保留成一条**假的安全承诺** —— 假 source 负于无 source,假备份同理。
- [x] **R10** `--no-backup` 的归置要在实现里明确落地(废弃 no-op / 或重定向到别处),
      它是 CLI 面 + help 文案 + 测试都在用的开关,不能留成悬空旗标。

**测试与文档**

- [x] **R11** 新增所有权用例:外来真实目录在 fan-out / 工作集两处都存活;
      deck 自己的 snapshot 仍可替换(`to-snapshot` / `to-symlink` 不回归)。
- [x] **R12** 改写 `safe-remove.test.ts:98-102`(见上"碰撞"段),与 B10 一并收口。
- [x] **R13** 本卡是**架构决策**(改 deck 的删除语义 + 安全边界),按 S5 自己的主张
      **必须落 ADR**:所有权判据 + 被拒方案。被拒:①保持现状+修好备份
      (备份修好了也还是"删别人的东西",只是赔得起);②目录包含即所有权(现状);
      ③加 `--force` 让用户自己承担(把判断推给最没信息的一方)。

**术语纪律**

- [x] **R14** 本卡引入"所有权 / 认领"这一组词,落 `cortex/wiki/04-ssot/glossary.md`,
      带 k8s `ownerReferences` 出处。

## Technical Approach
<!-- ⚠️ REQUIRED: Implementation plan, key decisions, references. Empty = shell, blocked by probe. -->

**仓里没有可抄的先例 —— 形态要新立。** 见上表脚注:`to-symlink-snapshot.ts` 看起来像
"先判 mode 再删",但那个 mode 来自 lstat,所以它不是所有权证明,只是"路径上有个真实目录"
的同义反复。唯一立场正确的是 `removeSymlinkOnly`(`safe-remove.test.ts:73-80` 已断言
"永不碰真实目录"),但它的正确来自"只删链接不删内容",**不是**来自归属判断 ——
把它的立场推广到真实目录那一支,需要新立判据。

**两个可直接借用的形状**(都不是所有权,但写法可抄):`wouldCreateCycle`
(`link.ts:70-74`)的 `resolve()` + `sep` 前缀比较;`link.ts:640-656` 的
working-set 切换检测 —— 它已经因为同一条理由("旧目录可能属于另一个仍在使用的 agent")
**拒绝自动删除、只给精确 rm 提示**。本卡把那个立场从"切换残留"推广到"所有非己条目"。

**判定签名(建议)** —— 放 `safe-remove.ts`(它本就是删除守卫模块):

```ts
// 判据只有两条:指向本 deck cold pool 的 symlink,或 state 记录在案
export function deckOwnsEntry(
  entryPath: string,
  ctx: { coldPool: string; managedDests: ReadonlySet<string> },
): { owned: true; via: 'symlink-into-coldpool' | 'state-record' }
 | { owned: false; present: boolean; reason: string }
```

三点设计约束:

- **传 `managedDests` 集合而不是整个 `state`** —— 判定只该看到一个输入,给它整个 state
  就是把"哪些字段算什么"的判断权又散回各调用点(下一个 `triggerDirs` 漏报的成因)。
  集合由调用方从 `state.skills[].dest ∪ .managed_dests` 拼好。
- **返回 `reason` 而不是布尔** —— 报告要给用户"为什么不动",只有布尔就没话可说。
- **返回 `present`** —— 调用方需区分"本来就没有"(照常往下走)和"拒绝"(报错)。
  只给布尔会逼调用方靠字符串猜,那正是本卡要消灭的形态。

**import 方向**:`safe-remove.ts` 目前只依赖 `node:fs`;判据不需要引入 `SkillDeckState`
类型(收的是 `ReadonlySet<string>`),所以保持零跨模块依赖、可单测。

**state 迁移**:老 state 文件无 `managed_dests` → `.default([])` → 只有工作集 `dest` 那条
退化判据还成立(保留现有 `dest` 字段作 fallback 证明)。**历史 fan-out snapshot 会一次性变成
"外来"并被拒绝** —— 这是**有意的**:安全侧倒,代价是用户手动删一次自己的旧 snapshot,
而不是 deck 替他删掉可能不是它的东西。

**先读后写**:`layout-policy.ts` 的 `collectFanOutWarnings` 是既有的 fan-out 审计通道,
R4 的报告优先复用它的输出形态(severity + message + ref),不要新造一套告警格式。

## Acceptance Criteria
<!-- ⚠️ REQUIRED: Testable acceptance criteria. Keeping placeholders = shell. -->

- [x] **AC1** `also_link_to` 目标里有外来真实目录 → `deck link` **不删**、打印三件套、
      其余目标照常处理(不中断)
- [x] **AC2** `deck remove <alias>` 遇到外来真实目录 → 目录存活 + 警告,
      且 deck.toml 条目仍被删、其余链接仍被删
- [x] **AC3** deck 自己建的 snapshot 仍可被 `to-snapshot` / `to-symlink` / 重链替换 ——
      **无功能回归**(cline `.clinerules` 的强制 snapshot 路径是主要验证面)
- [x] **AC4** 全仓不存在"未证所有权即可达 `rmSync(..., {recursive:true})`"的路径
      —— 测试钉 + grep 复核
- [x] **AC5** 不再产生 `../` 前缀成员的 tar 归档;不再打印无条件的「已备份」
- [x] **AC6** dormancy 保持:默认 `.claude/skills` + `.agents/skills` 零告警
      (`layout-policy.test.ts` 既有断言不改)
- [x] **AC7** 所有权 ADR 落盘(background / drivers / ≥2 options / decision / impact),
      被拒三方案在列
- [x] **AC8** `bun test packages/lythoskill-deck/` 保持 `0 fail`;测试数变化只在有意的增删处,
      且卡面记录变化前后的数(B5 教训:带环境标注)
- [x] **AC9** `cortex probe` 通过

## Progress Log
<!-- Update during execution, with timestamps -->

- 2026-09-10: 卡创建。来源 = owner 对 `also_link_to` 风险的判断 + 本 session 实查
  （五点实查 + tar `../` 不可解复现)。**不在 judge B 类清单内**,故独立于
  `TASK-20260910110545092`。
- 2026-09-10: 落地完成。R1-R14 / AC1-AC9 全部收口。三处**执行中才发现**的事:

  **(1) 判定输入必须是即时账本,不能是期初快照。** 首轮回归 9 fail,根因不是判据错,
  而是 `link` 一次运行把同一个 dest 建**两遍**(`reconcileTargetDir` 收束/扇出建一次,
  `linkedSkills` 元数据循环再建一次)。第二次清位要判定"这个真实目录是不是 deck 的",
  而它正是本次运行几毫秒前建的 —— 期初从 state 读来的快照自然证明不了。
  症状:`snapshot mode` 用例 0 skill(s) linked,state.skills 空数组。
  修法 = `ownershipLedgerFrom()`:创建成功即 `claim()`,与 k8s 在创建时写
  `ownerReferences` 同构。**这条写进 ADR 与 glossary(即时认领)。**

  **(2) AC4 的全仓复查发现第六处。** `add.ts:332` 在 `status:'failed'` 分支
  `rmSync(targetDir, {recursive:true})`,而 `failed` 有两条来路 —— localhost 那条在
  `exists` 检查**之前**就返回,于是 `targetDir` 可能是运行前就存在的目录。
  闸门 = `!fetchPlan.alreadyExists`(只清本次尝试才出现的东西)。已补两用例。

  **(3) `OwnershipVerdict` 判别式字段必须完整。** 初版 `owned: true` 变体漏了
  `present`,调用方写 `if (!verdict.present)` 时在 owned 分支上恒真 ——
  把"这是我的"静默读成"这儿什么都没有",9 个 fail 里的大头。

- 2026-09-10: 测试数变化(B5 教训:带环境标注),Bun 1.3.11 / macOS:
  改前 `213 pass / 1 skip / 0 fail / 544 expect / 16 files`;
  改后 `227 pass / 1 skip / 0 fail / 589 expect / 16 files`。
  Δ = +14 tests / +45 expects,全部为有意的增删:新增归属用例
  (`safe-remove` 5、`to-symlink-snapshot` 4、`link` 4、`add` 2),
  改写 1 条(旧 `removeEntryForRelink` 递归删真实目录 → 拒绝 + 存活)。
  **两处关键用例做了变异测试验证非空泛**:还原旧的破坏性清扫 → `link` 那条 fail;
  去掉 `add.ts` 闸门 → `add` 那条 fail。

## Related Files
- Modified: `packages/lythoskill-deck/src/link.ts`(清扫 + symlink 支 + 备份段 + 账本)
- Modified: `packages/lythoskill-deck/src/safe-remove.ts`(判据 + `removeEntryForRelink`)
- Modified: `packages/lythoskill-deck/src/remove.ts`(`removeLinkedEntry`)
- Modified: `packages/lythoskill-deck/src/schema.ts`(`managed_dests`)
- Modified: `packages/lythoskill-deck/src/to-symlink-snapshot.ts`(改用共用判据)
- Modified: `packages/lythoskill-deck/src/add.ts`(第六处:失败清理加 `alreadyExists` 闸门)
- Modified: `packages/lythoskill-deck/src/safe-remove.test.ts`(改写 :98-102)
- Modified: `packages/lythoskill-deck/src/to-symlink-snapshot.test.ts`(+4 归属用例)
- Modified: `packages/lythoskill-deck/src/link.test.ts`(+4 归属用例)
- Modified: `packages/lythoskill-deck/src/add.test.ts`(+2 用例)
- Modified: `packages/lythoskill-deck/src/cli.ts`(撤 help 行 + no-op 说明)
- Modified: `packages/lythoskill-deck/README.md`(Ownership guard 段 + 撤 `--no-backup` 行)
- Added: `packages/lythoskill-deck/src/state-file.ts`(state 读写 + 判定输入单点装配)
- Added: `cortex/adr/01-proposed/ADR-20260910112404500-deck-removal-boundary-is-ownership-not-directory-containment-k8s-ownerreferences.md`
- Modified: `cortex/wiki/04-ssot/glossary.md`(所有权 / 即时认领 / 假的安全承诺 三行)

## Git Commit Message
```
fix(deck): scope fan-out deletion to owned entries, drop unrestorable backup (TASK-20260910111600389)

- ownership predicate: symlink-into-cold-pool or state-recorded managed_dests
- foreign real dirs in fan-out/working-set targets are reported, never deleted
- retire the tar backup whose ../ members bsdtar refuses to extract
- StateSkill.managed_dests records fan-out dests (cline snapshot needs it)
- ownership ledger: claims made at creation, not from a start-of-run snapshot
- add.ts failure cleanup gains the same gate (AC4 repo-wide sweep, 6th site)
```

## Verification Log
<!-- 2026-09-10,Bun 1.3.11 / macOS -->

| 项 | 结果 |
|---|---|
| `bun test packages/lythoskill-deck/` | `227 pass / 1 skip / 0 fail / 589 expect / 16 files`(改前 `213/1/0/544/16`) |
| 变异测试:`link` 破坏性清扫还原 | `link.test.ts` 归属用例 **fail**(证明非空泛) |
| 变异测试:去掉 `add.ts` 闸门 | `add.test.ts` `alreadyExists` 用例 **fail** |
| AC4 全仓 grep | 余 `rmSync(recursive)` 三处:`safe-remove.ts:153`(判据后)、`remove.ts:54`(判据后)、`add.ts:338`(`alreadyExists` 闸门后)—— 均在所有权证明之后可达 |
| S2 残留 grep | `ADAPTER_REGISTRY` 0;`CliAdapter`/`AdapterHazard` 仅 `claudeCliAdapter` 子串;`adapter-registry`/`adapter-policy` 仅历史卡面与 `daily/2026-09-09.md`(S4 修) |
| `cortex probe` | `0 empty shell`;新 ADR ✅;2 条 status issue 是既有 backlog 卡(`TASK-20260909010058114` / `TASK-20260909010121918`),非本卡引入 |

## Notes

**这不是辩论的产物。** judge 的 B1-B18 无此项;它来自 owner 对 `also_link_to` 的风险判断
(`deck 不能灵活指定…耦合度不对头` / `直接去 fan out 覆盖掉全局配置简直错的不能再错`),
由本 session 实查扩面。**不要让下任 agent 以为它是 B 类项而去 `TASK-20260910110545092` 找。**

**"只管自己认领的"是一句 k8s 语义,不是一句情绪。** 对应 `ownerReferences`:
控制器只回收自己能证明是自己创建的从属对象;判定依据是**记录在案的引用**,不是"它在我管的
命名空间里"。本卡把这个语义搬进 deck 的删除路径。

**顺带的纪律推论(写给 S3/S4 的"取证未留痕"项)**:测试不只是结论的载体,**也是缺陷的载体**。
`cli-layout.test.ts` 里 8 条断言还原出了未落盘报告该有的结论(docs 级恰四家、
`.agents/skills` 九家共用且不含 claude-code、dsh 零 fan-out、裸 `skills` 不匹配……);
但同一批测试里 `:49` 正把 B2 的漏报钉绿,`:106-118` 只喂过被硬编码的那一个输入(cline),
所以永远绿。**从同一个误解写出来的测试,检测不了那个误解。**
两处后果已写进上面「碰撞」段。
