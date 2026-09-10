# ADR-20260910113534807: architectural-decisions-must-ride-in-adrs-not-implementation-card-technical-approach-sections

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-09-10 | Created |

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

**4. 执行方式(刻意不自动化)**
- 不扩 `probe`(Option C 的理由是原则性的)。
- 落点 = **文档纪律**:写进 `skills/lythoskill-project-cortex/references/writing-guide.md`
  + `AGENTS.md` 对应节(含上面 C1–C6 判据表)。
- **诚实记录本方案的已知弱点**:判据仍由 agent 自评,故存在"我这条不命中"的自我豁免路径。
  这是**接受的代价** —— 对立面(Option C 的机器检查)被证伪,而"更严的形式检查"
  只会制造可绕过的假象。**接受一个诚实的软规则,优于一个会撒谎的硬检查。**

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
- **Follow-up**:
  - `skills/lythoskill-project-cortex/references/writing-guide.md`:加"何时该开 ADR"一节
    (判据表 C1–C6 + ≥2 门槛 + 反例)
  - `AGENTS.md`:在治理节写明同一判据,并与 `:110` 的既有规则交叉引用
  - 两处都要写明**「probe 绿 ≠ 决策已落盘」** —— 这是本 ADR 最容易被误读的一点

## Related
- Related ADR: **ADR-20260508230803515**(curator 不做 feed-adapter;事故 1;其决策驱动第 1 条
  「未经治理引入」即本 ADR 的直接上游)
- Related ADR: **ADR-20260910113131220**(two-axis taxonomy;事故 2 的产物与其 rejected
  alternatives 正是判据 C5 的来源)
- Related ADR: **ADR-20260509144134332**(CLI 子命令命名纪律 —— 管**动词命名**,
  **管不到模块名**;本 ADR 补的正是它够不着的那一半)
- Related Task: `TASK-20260909155425926`(事故 2 的实现卡,决策被压缩在 `:44-45`)
- Related Task: `TASK-20260910110545092`(善后 follow-up 卡)
