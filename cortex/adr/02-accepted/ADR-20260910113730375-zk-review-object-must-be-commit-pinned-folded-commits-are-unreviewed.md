# ADR-20260910113730375: zk-review-object-must-be-commit-pinned-folded-commits-are-unreviewed

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-09-10 | Created |
| accepted | 2026-09-10 | Accepted |

## Background
<!-- ⚠️ REQUIRED: Problem description and context. Empty = shell, blocked by probe. -->

2026-09-09 的 P2 卡 `TASK-20260909155425926` 走完了完整闭环:实现 → ZK 零上下文复评
→ **8.5/10(gate ≥7 PASS)** → 收卡。收卡当日的宣称是「ZK re-trial 8.5/10 PASS,
5 findings 全折」。**这个宣称的每一个字都能在 git 里找到对应物,但它描述的状态不存在。**

### 实际发生的时序

| # | 事件 | commit | 事实 |
|---|---|---|---|
| 1 | 实现落地 | `c8ebcc76` | **评审对象**。ZK 8.5 是对这个 commit 打的分 |
| 2 | **同 session** 折入 5 条 findings | `2686e0d4` | `c8ebcc76..2686e0d4` = **6 文件 / +56 / −8,非空 diff** |
| 3 | 收卡 | — | 卡上引用 8.5 作为"已通过"的凭证 |
| 4 | **折后状态首次外部审视** | 2026-09-10 | inbox-debate + judge 评审。**这之前没有任何第三方看过 `2686e0d4`** |
| 5 | 折入 delta 中的一条 claim 被证伪并删除 | `65b02db7` | S1 |

第 4 步不是推测,是 judge 的**特别裁决二**原文结论:「HEAD 折后状态……**未经**。
成立,高置信。无任何第三方对 `2686e0d4` 的评审记录;本次辩论+本评审是折后状态首次外部审视。」

### 为什么这不是"少走一道手续"

**折入的 delta 里带进了一条假 claim。** `2686e0d4` 把 opencode windows hazard 的
"6 open issues"「软化」为 docs ref 能支持的措辞 —— 但 judge 独立重拉
`anomalyco/opencode@dev` 的 `skills.mdx`(222 行),grep `windows|symlink|junction|platform`
**零命中**。即该 claim 在**软化后依然不可考**,「软化」这个动作本身产出的是一个
**已被证伪的断言**,并挂上 main,直到 `65b02db7` 整行删除。
judge 对此的措辞:「『全折』字面成立、**效果为负**」。

**折入的 delta 也触及了测试。** 同一折入 commit 给 `adapter-smoke.test.ts` +28 行
(新增 EEXIST guard 的回归测试)。而 ZK 8.5 的评分对象里**没有这些测试** ——
一个"8.5 分的交付"与"main 上的交付"在测试面上不是同一个东西。

### 结构性问题:gate 的语义空转

`gate ≥7 PASS` 这句断言里,**"PASS"没有说出它是关于谁的**。对象在评分后漂移,
于是:

- 引用 `8.5` 的人以为自己引用的是"**当前交付**的质量";
- 实际被打分的对象是一个**已被取代的 commit**;
- 折后状态在**收卡时点从未被任何人独立看过**。

「评审对象在评分后漂移 ⇒ gate 语义空转」是本次辩论对项目流程的最高价值产出
(judge 判「流程元结论」并建议单独立卡):

> ZK 评审对象若在评分后被同一 session 修改,折入 commit 必须经第二轮独立评审
> 或显式标注『折后未评』。

### 证据链本身的另一半问题(B16)

要让上述规则可执行,必须能回答"何时折入的"。**本项目的 decision-log 答不了这个问题**:

- `decision-log.jsonl` 文件 mtime = **22:52**,其内部时间戳 = **23:20–23:45** ——
  **自相矛盾**;
- 折入 commit 时间戳 = 22:56:31;`/tmp` 三件套 mtime = 22:48 / 22:51 / 22:52。
- judge 结论:「墙钟彻底不可信,顺序只能由**逻辑 + 文件系统锚**定。」

即:**当评审对象的时间不可信时,"折入时点"与"折入时看到了什么"无法由日志证明。**
这不是本 ADR 的附带发现,是它的**前置条件** —— 一条依赖时间戳才能执行的规则,
建在一个不可信的时间戳上等于没有。

## Decision Drivers
<!-- ⚠️ REQUIRED: Why does this decision need to be made? -->

1. **gate 输出的是关于对象的断言,而对象没有被钉住。** 一条评分若不说出它打分给哪个
   commit,该评分的指称就是空的 —— 它无法被证伪,也无法被正确引用。
2. **同 session 折入是默认路径,不是偶发。** 上下文热、省一次往返、折入者就是作者。
   凡是默认路径,就一定会被走 —— 所以规则必须**描述默认路径发生时的义务**,
   而不是禁止默认路径(见 Option C)。
3. **「只覆盖 c8ebcc76」这个决定性事实,当时没有任何一处写下。** 折入 commit message
   没写,卡面没写。**不写下来,读者必然把 8.5 读成"当前状态 8.5"** ——
   这不是读者粗心,是**记录缺了必要字段**。
4. **折入的恰好是被评审的那一类东西。** 本例折入的是 claim 文本(`adapter-registry.ts`)
   与测试断言(`adapter-smoke.test.ts` +28)。ZK 评的正是"断言是否真实" ——
   **在被评的维度上做未被评的修改**,是失效的最大值,不是边界情况。
5. **自报不构成复核。** 折入 message 自报「Tests: 213 pass / 0 fail」;
   judge 同机独立复跑 = **213 pass / 1 skip / 544 expect**。数字对不齐
   (丢 skip、无环境标注)。同一 session 的自报与独立复跑**不是同一件事**,
   而前者恰好是当时唯一的"折后验证"。
6. **本项目的 gate 是分数,而分数是最容易被引用、也最容易被误读的载体。**
   8.5 被当作凭证传递了两手,而它覆盖的对象在第一手之后就已经不存在了。

## Options

### Option A: 维持现状 —— 同 session 折入,分数沿用

**Pros**:
- 零额外步骤,上下文最热时收尾最快
- 与既有习惯一致(本例即此路径)

**Cons**:
- **已被本例证伪**:折后状态零独立审视,且折入 delta 带进一条假 claim 挂上 main
- 分数与其对象脱钩 —— 引用 8.5 的人在引用一个**不存在**的状态
- 「少写一句覆盖范围」的代价是**整条证据链的指称失效**,不是标点问题

### Option B: 评审对象 commit-pin + 折入非空 diff 强制二选一(Selected)

**规则**:评审结论必须**绑定它被评的那个 commit**。折入 commit ≠ 被评状态。
评分后被修改的评审对象,若折叠进来的 diff **非空**,必须**二选一**:

1. 对 delta 做**第二轮独立评审**;或
2. 在折入 commit message **与**卡面**显式标注「折后未评」**,并写明
   **delta 范围**与**旧结论覆盖到哪个 commit**。

配套**claims-not-scores**:报断言不报分数;凡引用分数**必须带对象 sha**
(`8.5 @ c8ebcc76`),**禁止裸报分数**。

**Pros**:
- gate 恢复指称:"PASS"重新变成一句关于**具体对象**的、可证伪的话
- 读者能区分「被评过的对象」与「main 上的对象」—— 区分成本降到一次 `git log`
- 折入 delta 获得归属:要么有人看过,要么明确写着没人看过
- **不禁止默认路径**(同 session 折入照旧),只给它加一条诚实的出口 ——
  可执行性远高于一条会被绕过的禁令
- claims-not-scores 顺带消掉一个独立的失效模式:**分数不可被反对,断言可以**

**Cons**:
- 多一步;「折后未评」可能被当作形式化盖章(对冲:标注**必须写 delta 范围**,
  只写四个字的标注视为未标注)
- 判据仍是人/agent 自评,**不产生机器可验证的通过/失败信号** ——
  这一点必须写明,以免下个 agent 以为跑绿了测试就等于合规了
  (与 ADR-20260910113534807 共享同一弱点,理由同构)

### Option C: 禁止同 session 折入(折入必须换 session)

**Pros**:
- 机器可见的硬边界:折入者 ≠ 评审者,不给自我盖章留空间

**Cons**:
- **把手段当成了目的。** 真正的缺陷不是"谁折",是"**折后有没有人看**"。
  换 session 折入后若同样无人复评,缺陷一模一样 —— 只是多一次交接
- **不可执行且反向激励**:禁令一旦有成本,人们会干脆**不开评审**,而不是换人
- 与项目既有形态冲突:ZK 的价值来自"零上下文 + 独立编排"(`feedback_...`,
  见 `AGENTS.md` § ZK Review Gate),而折入是**作者的本职收尾**,
  两者不是同一个动作,不该用同一条边界去切

### Option D: 折入 + 折入者自报复核结果(报告中立化)

**Pros**:
- 比 Option A 多一层:至少要求折入者对 delta 显式表态
- 零额外编排成本 —— 折入者本来就是最懂 delta 的人

**Cons**:
- **自报的独立性 = 0。** 自报者与折入者是同一 session 的同一理解,
  这恰好是 ZK 存在的理由(「self-review 有盲点」,`AGENTS.md` § Memory Infrastructure
  「Zeroing」行)
- **本例已实测证伪**:折入 message 自报 213/0/0,独立复跑 213/1skip/544。
  差异不大,但**差异的存在本身**就是"自报不是复核"的证据
- 本 ADR 的失效模式恰好是"断言的真实性",而自报在最需要外部性的维度上提供了零外部性

## Decision
<!-- ⚠️ REQUIRED: Explicit choice + rationale. Keeping placeholders = shell. -->

**Choice**: **Option B** —— 评审对象 commit-pin,折入非空 diff 强制二选一。

**1. 规则(一句话)**
> **评审结论绑定它被评的那个 commit。折入 commit ≠ 被评状态。**
> 评分后被修改的对象,若折入 diff 非空,必须**二选一**:对 delta 做第二轮独立评审,
> 或**显式标注「折后未评」**并写明 delta 范围与旧结论覆盖的 commit。

**2. claims-not-scores(同步生效的表述纪律)**

| 不要 | 要 |
|---|---|
| `ZK 8.5/10 PASS` | `ZK 8.5 @ c8ebcc76`;折入 `2686e0d4` 后**未复评** |
| `5 findings 全折` | `4/5 实折且可查;1 条反噬 —— 软化后的 claim 仍不可考,65b02db7 删除` |
| `213 pass / 0 fail` | `213 pass / 1 skip / 544 expect @ Bun 1.3.11/macOS` |

理由:**分数不可被反对,断言可以。** 一条写在记录里的分数只提供信心;
一条写在记录里的断言提供**可执行的核对动作**。

**3. 证据卫生条款(B16,本 ADR 的前置条件)**

- `decision-log` 的**时间戳不得单独作为时序依据**(实测:文件 mtime 与内部时间戳
  自相矛盾)。
- 时序断言必须写明用的是哪种锚,**只接受两类**:①**逻辑约束**
  (如"折入 commit 引用了评审的结论 ⇒ 折入在评审之后");②**文件系统锚**
  (commit 时间戳、文件 mtime),且**多锚冲突时以逻辑约束为准**。
- **自报的测试数不构成复核**,不得作为折后验证的记录形态。
- 本条款**修订** ADR-20260518155038335 中 decision-log 的可用范围:
  该 ADR 建立的 decision-log 作为**证据链**(带 why 的逐条断言)仍然有效,
  但其**时间序**不可采信,只能由上述两类锚补足。

**4. 判据的边界(刻意收窄,避免规则通胀)**

- 适用:**评分为 gate 或结论**的场合(ZK Review、ZK audit、ZK validation)。
- 不适用:同一 session 内的**普通编辑**、typo、格式化 —— 没有评分对象漂移可言。
- **折入 diff 为空**(如纯 message 修改、纯注释)不触发本条 ——
  规则绑定的是"**被评内容变了**",不是"commit 数变了"。

**5. 与既有规矩的关系**

- 与 `AGENTS.md` § ZK Review Gate 是**补充**,不是替代:该节管"**何时**必须开评审"
  (assign 前),本条管"**评审结论在对象变化后**如何仍然诚实"。
- 与 ADR-20260910113534807(S5)是**同族**:两者都在回答同一个问题 ——
  **一份记录的合规度量是"它是否仍指称真实",不是"它是否存在"。**
  S5 管决策记录的载体,本 ADR 管评审记录的指称对象。

## Impact
<!-- ⚠️ REQUIRED: Positive / negative / follow-up. Empty = shell, blocked by probe. -->

- **Positive**:
  - gate 恢复指称:分数与它打分的 commit 绑定,可被正确引用与证伪
  - 「被评过的状态」与「main 上的状态」变成一次 `git log` 可区分的事
  - 折入 delta 有归属:要么有人看过,要么明确写着没人看过 —— **不再有第三种状态**
  - claims-not-scores 让记录从"信心载体"变为"核对清单"
- **Negative**:
  - 多一步;「折后未评」标注有被形式化的风险(对冲:标注必须写 delta 范围)
  - **不产生机器可验证信号** —— 与 ADR-20260910113534807 共享这一弱点,
    理由同构:形式门会误报并被学会绕过,诚实软规则的误报代价是一行文字
  - 本 ADR 自己**无法防止**下次同 session 折入 —— 它只规定折入时**必须写什么**。
    执行仍靠 agent 自评命中,存在"本次不算评分"的自我豁免路径(**接受**)
- **Follow-up**:
  - `packages/lythoskill-project-cortex/skill/references/zk-review.md`(SOURCE,
    改后须 `bun packages/lythoskill-creator/src/cli.ts build lythoskill-project-cortex`
    重建 `skills/` 产物):写入 commit-pin 协议、claims-not-scores 表述表、
    证据卫生条款 —— **已落地**(新增「评审对象必须 commit-pinned(折入 ≠ 已评)」一节)
  - `AGENTS.md` § ZK Review Gate 与 § Review:写明同一规则,并**从本节有 inbound ref**
    (无 ref 的落点是无效落点,见 ADR-20260910113534807 Decision 第 4 条)
    —— **已落地**(§ ZK Review Gate 末新增段落,含指向本 ADR 与 zk-review.md 的 ref)
  - **必经路径植入(与 ADR-20260910113534807 同一手法)**:`cortex task done <id>`
    是"评审结论被写进记录当作通过"的那一刻,故在该路径上输出提示
    (`src/cli.ts` `handleTaskTransition` 的 `done` 分支)—— **已落地**。
    同样**刻意不阻断**
  - 三处都要写明**「测试全绿 ≠ 折后已评」** —— 本 ADR 最容易被误读的一点
  - 关联卡 `TASK-20260910110545092` 的 B6 / B7 / B16 指向同一盲区,
    落地时一并核对该卡状态

## Related
- Related ADR: **ADR-20260910113534807**(S5;同族 —— 记录的合规度量是"仍指称真实",
  非"存在";其 Decision 第 4 条的"无 inbound ref 的落点是无效落点"本节直接沿用)
- Related ADR: **ADR-20260518155038335**(reproduce.sh + decision-log + 逻辑框架;
  本 ADR 的**证据卫生条款修订其 decision-log 时间序的可用性** —— 证据链有效,
  时间戳不可采信)
- Related ADR: **ADR-20260518024500631**(reproduce.sh 模式;judge-separated ——
  本 ADR 把"分离"从**编排**层延伸到**对象**层:评审者与被评者分离还不够,
  评审对象本身也必须被钉住)
- Related Task: `TASK-20260909155425926`(P2 卡;8.5 的出具方与折入方)
- Related Task: `TASK-20260910110545092`(善后 follow-up 卡;B6/B7/B16 指向本盲区)
- Evidence: `playground/2026-09-10-inbox-debate/oracle/0001-judge-verdict.md`
  §3 三项特别裁决 + §4 B16(**实验记录,gitignored,不随仓分发**)
