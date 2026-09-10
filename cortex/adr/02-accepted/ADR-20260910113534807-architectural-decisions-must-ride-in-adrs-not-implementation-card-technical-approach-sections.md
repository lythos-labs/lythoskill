# ADR-20260910113534807: architectural-decisions-must-ride-in-adrs-not-implementation-card-technical-approach-sections

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-09-10 | Created |
| accepted | 2026-09-10 | Accepted |
| accepted | 2026-09-10 | 执行方式扩写(owner 定调):落点二 = routine 必经路径提示植入;并补「无 inbound ref 的落点是无效落点」。状态未变 —— 此行只记录**接受后本文档被改过**,以免读者把改后文本当成被接受的原文 |
| accepted | 2026-09-10 | 追加 **§5**:已 accept 的 ADR 的 Follow-up 由该 ADR 自身承载,不另开卡(owner 裁决,原话「已 accept 的 ADR 的 Follow-up 落地,由该 ADR 自身承载,不另开卡」)。状态未变 —— 同行上述,此行标记**文档再次被改** |

## Background
<!-- ⚠️ REQUIRED: Problem description and context. Empty = shell, blocked by probe. -->

同一形状的事故发生了**两次**,中间隔四个月:

| | 事故 1 | 事故 2 |
|---|---|---|
| 时间 | 2026-05-08 | 2026-09-09 |
| 产物 | `packages/lythoskill-curator/src/feed-adapters.ts` | `packages/lythoskill-deck/src/adapter-registry.ts` |
| 决策内容 | 引入 `FeedAdapter` 抽象 + 4 个外部源适配器 | 引入第二个 "registry"(CLI skill 目录布局表) |
| 决策记录在哪 | **实现卡的 Technical Approach** | **实现卡的 Technical Approach**(`TASK-20260909155425926:44-45`) |
| 事后 | ADR-20260508230803515 | ADR-20260910113131220 |

两次都不是"代码写错了"。**代码在写下的那一刻都是自洽的。**
错的是**决策从未进入过任何可被反对的载体**:

- **ADR 侧 = 零。** 事故 1 时 `cortex/adr/` 全库无 feed-adapter 决策记录;
  事故 2 时全库无一条管辖 deck registry,`01-proposed/` 为空。
  ADR-20260508230803515 的决策驱动第 1 条原文即:
  > 「**未经治理引入** —— 没 ADR,意味着这个 abstraction 从未通过设计审查」

- **task 侧 = 有卡,但载体错位。** 卡存在,是**实现卡**不是**决策卡**。
  架构决策被压缩成 Technical Approach 里的一行,只有 WHAT:
  没有宿主选项对比、没有数据出处、**没有跨包命名撞车检查**
  (事故 2 的卡所引 `ADR-20260509144134332` 管的是**动词命名**,管不到模块名)。

**后果是可计量的。** 事故 2 的命名撞车存活了**两个月**,同名并存期间**零交叉文档**,
直到 2026-09-10 的辩论才被提出(debate B14)。善后成本 = 一次 7 文件全量改名
(含模块内部 6 处自引用 + 类型引用 + 门面文案)+ 一篇消歧 ADR + 一张 follow-up 卡。
**这笔成本买不回任何东西** —— 它全部用于撤销一个当初没人被请求同意过的决定。

**"递审时未被告知"是结构性的,不是某次疏忽。**
Technical Approach 是**意图陈述**,不是**决策记录**。审阅者面对一行陈述无从反对 ——
无选项可推、无被拒方案可质疑、无"这会新建第二个 registry"的告警。
**一行陈述里没有可供反对的对象。**

## Decision Drivers
<!-- ⚠️ REQUIRED: Why does this decision need to be made? -->

1. **规矩已存在但从未被触发。** `AGENTS.md:110` 原文:
   「**"I think / 我觉得" = start an ADR.** User is exploring options, not issuing a command.」
   这条规则管的是**用户措辞**。而这两次事故里,决策是 **agent 自己**在"我觉得可以这么干"
   的判断下做出的 —— **规则的字面触发了,规则的意图没有**。
   缺的不是规则,是**触发条件**:什么算"一个需要 ADR 的决策"从未被定义。
2. **`probe` 有结构性盲区。** `probe` 只测**空壳**(`⚠️ Found N empty shell(s)`)——
   即"必填段是否为空"。一张 Technical Approach 写得满满当当的卡可以**完全合规过 probe**,
   而其中的架构决策从未落盘。**probe 测的是形式,而这里失效的是语义。**
3. **一行陈述没有可反对性。** 见 Background 末段。这不是措辞问题,是**载体的信息量**问题:
   决策记录的最小单位是「选项集合 + 判据 + 被拒理由」,不是「结论」。
4. **同一形状复发证明它不是偶发。** 四个月、两个包、两个不同 agent session,
   做出同一个动作 —— 说明这是**流程的形状**导出的行为,不是个人的判断失误。
   按项目自己的判据(见 `feedback_document_rejected_alternatives`:
   agents 会 reflexive 地重提 hub/registry 模式),**不写下来的拒绝会被重新发明**。
5. **命名即概念,概念撞车无法在实现卡层被发现。** 事故 2 的表面是文件名撞车,
   真实根因是 **"adapter" 一词在仓里有两个互不兼容的含义**
   (见 ADR-20260910113131220)。**没有跨包的决策视角,就没有发现这个概念撞车的站位。**

## Options

### Option A: 维持现状
<!-- ⚠️ REQUIRED: Compare at least two options. Keeping placeholders = shell. -->

决策继续由实现卡的 Technical Approach 承载。

**Pros**:
- 零额外步骤;对小改动更快
- 卡与实现同处一地,阅读连续

**Cons**:
- **已被两次事故证伪**(见 Background)。cost 不是零,是**延后支付且带利息**:
  两个月后偿还,且以"撤销一个没人同意过的决定"的形式
- 与 `AGENTS.md:110` 的**意图**冲突(字面不冲突,见驱动 1)
- 拒绝的理由不留痕 → 下个 agent 按 `feedback_document_rejected_alternatives` 必然重提

### Option B: 立提案纪律 —— 架构决策必须走 ADR(Selected)

定义"什么算架构决策"的**可判定判据**(见 Decision),命中即**必须**在 ADR 里落盘;
实现卡的 Technical Approach **可以引用** ADR,但**不得是唯一记录**。

**Pros**:
- 决策获得**可搜索的家**:下个 agent 能查到"为什么是这个形态"和"为什么不是别的形态"
- 被拒方案留痕 → 直接对上 `feedback_document_rejected_alternatives`
- 审阅者终于**有东西可反对**(选项集合 + 判据),而不是对一行结论点头
- 判据可判定 → 不依赖"这算不算架构决策"的个人尺度

**Cons**:
- 多一步;有**ADR 通胀**风险(芝麻大的事也开 ADR,导致真决策被淹没)
  —— 由判据的"命中 ≥2 条"门槛对冲,但门槛是判断不是机器检查
- 判据仍是人/agent 自评 → 存在"我这条不算"的自我豁免路径(见 Impact 的诚实记录)

### Option C: 扩展 `probe` 自动检测

让 `probe` 检查"卡里的决策是否有 ADR 背书"。

**Pros**:
- 零人工纪律成本;不通过就红,无法自我豁免

**Cons**:
- **不可实现。** `probe` 能做的是形式检查 —— 它能看见"卡里提到了一个新模块名",
  看不见"这是不是一个决策"。**"是不是决策"是语义判断,不是形式属性。**
- 退一步只测形式(如"Technical Approach 里出现 `new <Name>` 就要求 ADR"),
  则 100% 误报/漏报:`const x = new Map()` 触发,而"把 registry 宿主定在 deck"
  这种真决策一个关键字都不含
- 更坏:一个会误报的自动检查**必然**被学会绕过,绕过本身成为新习惯
  → 比没人检查更差(它制造"已检查过"的假象)
- **本项目已有先例**:probe 对空壳有效,恰恰因为空壳是**形式**属性。此路不通是原则性的。

### Option D: 给卡模板加必填的"Architectural decisions"段

**Pros**:
- 与 Option B 同样有"强制填写"的形式约束,但不用开新文件

**Cons**:
- **换标签不换载体。** 失效的不是段的**名字**,是**载体的性质**:
  实现卡是**封闭的、面向执行的、随任务收口而封存的**;ADR 是**开放的、面向审阅的、
  长期可检索的**。把决策写进实现卡的任何一个段,决策都随卡一起被归档进 `04-completed/`,
  下个 agent 不会去那里找"为什么"。
- 事故 2 的卡**本来就有** Technical Approach 段且**写得完整** —— 该段存在且被填满,
  决策仍然没落盘。这直接证伪了"加个必填段就好"

## Decision
<!-- ⚠️ REQUIRED: Explicit choice + rationale. Keeping placeholders = shell. -->

**Choice**: **Option B** —— 立提案纪律。

**1. 规则(一句话)**
> 任何**引入或改变抽象、模块边界、包边界、命名概念、或封闭数据集**的决策,
> 必须在 ADR 中落盘。实现卡的 Technical Approach **可以引用**该 ADR,但**不得是唯一记录**。
> **决策的载体是 ADR,不是卡。**

**2. 「架构决策」的判据(可判定,不靠感觉)** —— 命中**≥2 条**即为架构决策:

| # | 判据 | 事故 2 是否命中 |
|---|---|---|
| C1 | 引入新模块/抽象,且**预期的消费者在它之外** | ✅ deck 的 link/policy/CLI 都要 import 它 |
| C2 | 引入或改名一个**概念性名字**(registry / adapter / hub / resolver / layout…) | ✅ "registry" 是概念名,且有主 |
| C3 | 选定**宿主**(放哪个包)或**边界**(什么跨包、什么不跨) | ✅ "留 deck 还是进 agent-adapter" |
| C4 | 建立**封闭/受审数据集**,其条目是**对外部世界的事实宣称** | ✅ 16 行 CLI 布局,受 no-source-no-rule 约束 |
| C5 | **拒绝了备选方案**(考虑过又否掉 ⇒ 那个拒绝需要一个家) | ✅ 人工名单 / 独立包 / 移入 agent-adapter |
| C6 | 一个称职的审阅者**本来可能问**"你考虑过 X 吗" | ✅ "这会新建第二个 registry 吗" |

事故 2 命中 **6/6**。事故 1 命中 **5/6**(C4 弱)。**两条都远超门槛。**

反向:一次 typo 修复、一行 bug fix、给既有函数加参数 —— 命中 0–1 条,**不开 ADR**。

**3. 与既有规矩的关系(不是新增,是补触发条件)**
- `AGENTS.md:110` 管**用户措辞**触发;本 ADR 管**决策内容**触发。两者是**或**关系。
- 与 ADR-20260910113131220 一致:该 ADR 的「rejected alternatives」一节正是 C5 的产物 ——
  **本 ADR 是那次善后中提炼出的通则**,不是新增负担。

**4. 执行方式:两个落点 —— 文档纪律 + 必经路径植入(刻意不做成「门」)**

> **先记录为什么「只写文档」本身就是已被证伪的方案**(owner 2026-09-10,本 ADR 最该被
> 记住的一句):
> > 「放进文档 → 丢到一边 → 甚至 agents md 也没有 ref → **最后就是写是写了,没有 agent 主动看到**。」
>
> 这条链的三段各有独立失效点,且**越往后越致命**:
> 1. **放进文档** = 写下了,但文档不主动找人。
> 2. **丢到一边** = 没人引用的文档,检索不到、不会路过,等于不存在。
> 3. **连 `AGENTS.md` 也没有 ref** = 连"该文件里记了什么"都无从得知 ——
>    此时**"已记录"与"未记录"在行为上不可区分**。
>
> 故本 ADR 的验收标准**不是"写了吗",是"一个不知情的 agent 会不会撞上它"**。
> **文档的合规度量是发现性,不是存在性。** 这一条同时是对落点一本身的约束:
> 落点一若没有从入口文档指向它的 ref,落点一就只是第二段的那个"丢到一边"。
> (现状:`AGENTS.md:242` 已有指向 `writing-guide.md` 的 ref —— 这一环是本次必须保住的。)

- **落点一:文档纪律。** 写进 `packages/lythoskill-project-cortex/skill/references/writing-guide.md`
  (**SOURCE**;改完须 `bun packages/lythoskill-creator/src/cli.ts build lythoskill-project-cortex`
  重建 `skills/` 产物 —— `skills/` 是 build output,直接改它会被下次 build 覆盖)
  + `AGENTS.md` 对应节(含上面 C1–C6 判据表 + **反指回本文件的 ref**)。
  **无 inbound ref 的落点是无效落点** —— 见上。
- **落点二:routine 的必经路径上做提示植入(owner 2026-09-10 补充定调:
  「在 routine 的几乎必经之路上做足提醒」)。** 依据是:文档只在 agent **恰好去读它的那一刻**
  生效,而这两次事故的失效点不是"agent 读了却没照做",是**根本没去读**。
  故把提醒放到流程**几乎必然经过**的位置:
  | 必经点 | 载体 | 内容 |
  |---|---|---|
  | 创建卡(`cortex task`) | `commands/task.ts` 输出 | 要做决策就先备好 ADR;Technical Approach 不得是唯一记录 |
  | **写 Technical Approach** | `lib/template.ts` 的模板注释 | 同一条,且落在**误行为发生的那一行上** |
  | 创建 ADR(`cortex adr`) | `commands/adr.ts` 输出 | 最常被跳过的两件事:OPTIONS(含被拒的)、CRITERIA(评分须同文档定义) |
  | 每次 commit | `hooks/pre-commit.ts` 的 governance waterline | 新增 `packages/*/src/` 模块 → "这是一个决策吗" |
- **为什么"提示"可以、"门"不可以(与 Option C 不矛盾,是刻意的区分)**:
  - Option C 被拒的是**门** —— 一个产生 pass/fail 的**覆盖性断言**。它的误报制造
    "已检查过"的假象,而假象会被学会绕过 → **比没有检查更差**。
  - 这里是**提示** —— 它**不断言**"缺 ADR",只把问题搬到必经路径上,不产生覆盖信号。
    误报的代价 = 一行输出。**没有假象可制造,就没有可绕过的对象。**
  - 判据:一个检查若**输出的是覆盖率**(通过/不通过),必须能机器判定语义 —— 做不到就别做;
    若**输出的只是提醒**,形式触发即可,因为它不冒充结论。
- **诚实记录本方案的已知弱点**:判据仍由 agent 自评,故存在"我这条不命中"的自我豁免路径。
  这是**接受的代价** —— 对立面(Option C 的机器检查)被证伪,而"更严的形式检查"
  只会制造可绕过的假象。**接受一个诚实的软规则,优于一个会撒谎的硬检查。**
- **植入挡不住的事(必须写明)**:一个**完全绕过 cortex CLI** 的 agent 收不到任何上述提示。
  CLI 面植入的覆盖面 = "用了 CLI 的 agent"。对这一盲区,唯一的手段是
  `AGENTS.md` 层面的规矩强化(「必须用 cortex 做项目级落盘」,已在文件顶 / §0 / §3 三处重述)
  —— 且**仍不是硬保证**。本 ADR 不假装它是。

## 5. 已 accept 的 ADR:其 Follow-up 由该 ADR 自身承载(不另开卡)

**规则(owner 定调,2026-09-10)**:已 accept 的 ADR 的 Follow-up 落地,**由该 ADR 自身承载,
不另开卡**。做法 = 在 `## Impact → Follow-up` 勾掉该项并在旁边写上 commit sha。

**为什么这不是本 ADR 的自相矛盾。** 上一节要求"决策必须落 ADR,卡的 Technical Approach
不得是唯一记录";这一节说"某些落地**不必**开卡"。两者不冲突,因为**卡与 ADR 承载的东西不同**:
卡承载的是**需要自己的验收标准、自己的计划、或 owner 裁决的工作**;而一篇已 accept 的 ADR
的 Follow-up 这三样都不需要 —— 它的验收标准就是 ADR 的 Impact 节本身,而 ADR 就是那份被
评审过的决策。为它开卡 = 把同一份义务抄进第二个更弱的载体:卡随任务归档,ADR 留在库里可检索。
**同一份义务有两个载体,实际上等于两个都不是**。

**本条的出处就是它自己的反例。** 2026-09-10 落地本 ADR 那四个提示植入点的那批改动
(5 个源文件 + `AGENTS.md` + `CLAUDE.md`,两个 commit)**完全没有卡**。它今天还能被追到,
唯一原因是**本 ADR 自己的 Follow-up 列表点名了那四个落点**。是 ADR 承载了它;
若当时另开一张卡,只会多出第二个可以忘记的地方。

**边界 —— 这些情况仍然该开卡**:

| 情况 | 为什么是卡 |
|---|---|
| Follow-up **派生出 ADR 从未声明过的新义务**(如"每季度复勘 16 家普查") | 那是带新验收标准的新工作,不是决策的推论 |
| Follow-up **需要自己的计划**(多段、独立回滚点) | 卡是计划的载体,ADR 仍是决策的载体 |
| Follow-up **卡在 owner 裁决上** | 卡是呈现选项的正确形态(本卡 B17/B18 即此例) |

**判据一句话**:*这件事需要决策、计划、或 owner 输入吗?* 不需要 → 它是已做决策的**推论**,
归 ADR 的 Follow-up。**为 ADR 自己的推论开卡,是在和 ADR 争夺记录权,不是在记录它。**

**落点(两处,都要求从模板/指南可见)**:
`packages/lythoskill-project-cortex/skill/references/writing-guide.md` 的
"An accepted ADR carries its own follow-up" 一节(SOURCE,改后重建 `skills/`)+
`src/lib/template.ts` 的 `## Impact` → `Follow-up:` 行下方注释
(**落在写这份清单的那一行上**,同 §4 的落点二纪律)。

## Impact
<!-- ⚠️ REQUIRED: Positive / negative / follow-up. Empty = shell, blocked by probe. -->

- **Positive**:
  - 决策获得可检索的家;下个 agent 能查到**为什么是这个形态**与**为什么不是别的形态**
  - 被拒方案留痕,直接对冲 `feedback_document_rejected_alternatives`
  - 审阅者面对选项集合与判据,**有可反对的对象**
  - 命名/抽象类决策的成本从"两个月后带息偿还"变为"事前一次陈明"
- **Negative**:
  - 多一步;有 ADR 通胀风险(对冲:命中 ≥2 条门槛)
  - 判据靠自评,存在自我豁免路径(**接受**,理由见 Decision 第 4 条)
  - 不产生任何机器可验证的通过/失败信号 —— 本 ADR 的合规**只能靠人读**,
    这一点必须写明,以免下个 agent 误以为 `probe` 绿了就等于合规了
  - **本 ADR 自己就活在这个弱点里**:它的落点一(文档)正是"写是写了,没人看到"的
    高发形态。落点二(必经路径植入)是对它的补偿,而**补偿本身也有覆盖边界**
    (见 Decision 第 4 条末:绕开 CLI 的 agent 收不到)
  - 无自动化回归:**没有任何测试会因为"文档失去 inbound ref"而变红**。
    发现性一旦退化,退化是静默的 —— 这是接受的代价,不是被忽略的
- **Follow-up**:
  - `packages/lythoskill-project-cortex/skill/references/writing-guide.md`(SOURCE,改后重建
    `skills/` 产物):加"何时该开 ADR"一节(判据表 C1–C6 + ≥2 门槛 + 反例)
  - `AGENTS.md`:在治理节写明同一判据,并与 `:110` 的既有规则交叉引用
  - **两处都要从 `AGENTS.md` 有 inbound ref**(现状 `:242` 已满足;若未来重排章节,
    保住这条 ref 是硬要求 —— 无 ref = 无效落点)
  - **落点二四处植入**(2026-09-10 已落地,见 Related Task `TASK-20260910110545092`):
    `src/commands/task.ts` / `src/lib/template.ts` 的 `## Technical Approach` 注释 /
    `src/commands/adr.ts` / `src/hooks/pre-commit.ts` 的 governance waterline
  - 三处都要写明**「probe 绿 ≠ 决策已落盘」** —— 这是本 ADR 最容易被误读的一点

## Related
- Related ADR: **ADR-20260508230803515**(curator 不做 feed-adapter;事故 1;其决策驱动第 1 条
  「未经治理引入」即本 ADR 的直接上游)
- Related ADR: **ADR-20260910113131220**(two-axis taxonomy;事故 2 的产物与其 rejected
  alternatives 正是判据 C5 的来源)
- Related ADR: **ADR-20260509144134332**(CLI 子命令命名纪律 —— 管**动词命名**,
  **管不到模块名**;本 ADR 补的正是它够不着的那一半)
- Related Task: `TASK-20260909155425926`(事故 2 的实现卡,决策被压缩在 `:44-45`)
- Related Task: `TASK-20260910110545092`(善后 follow-up 卡)
