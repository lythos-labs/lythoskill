# ADR-20260910113131220: player-axis-is-open-registration-cli-layout-axis-is-closed-sourced-data-two-axes-never-merge

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-09-10 | Created |

## Background

2026-09-09 的实现卡在 `packages/lythoskill-deck/` 下新增了 `adapter-registry.ts` —— 一个
16 行的 CLI 布局数据表(每家 CLI 去哪找 skills、symlink 保证分级、危险条目)。它与已存在
两个月的 `packages/lythoskill-agent-adapter/src/registry.ts` **撞名**,且同名并存期间
**零交叉文档**。

复盘(2026-09-10 inbox-debate + 源码实查)确认:撞车不是文件名问题,是 **"adapter" /
"registry" 这两个词在仓里各有两个互不兼容的含义**:

| | agent-adapter 家族 | deck 的 `adapter-registry.ts` |
|---|---|---|
| 词指什么 | **可执行行为** — `AgentAdapter` 带 spawn 逻辑;`registerAgent()` 是开放扩展点 | `CliAdapter` 是**一行数据** — 全文零 import、零行为 |
| 轴 | **player 轴**:怎么跑一个 agent | **CLI-layout 轴**:一个 CLI 去哪找 skills |
| 开闭 | 开放注册(第三方实现者扩展) | 闭数据(审过才进,条目 = 对外部世界的事实宣称) |
| 变更频率 | 跟随 player 生态 | 跟随 CLI 生态的目录约定 |

**按仓里自己的定义,deck 的 `CliAdapter` 根本不是 adapter —— 它不 adapt 任何东西。**
同理它不是 registry —— 没有注册行为,没有查找协议,只有一张表。

**为什么决策过程没拦住它**(实查):

- **ADR 侧 = 零。** `cortex/adr/` 全库无一条管辖 deck 的这张表。**不是首例**:
  `ADR-20260508230803515`(curator 不做 feed-adapter)的决策驱动第 1 条原文即
  「**未经治理引入** — 没 ADR,意味着这个 abstraction 从未通过设计审查」。
- **task 侧 = 有卡,但载体错位。** 架构决策被压缩成实现卡 Technical Approach 的一行,
  只有 WHAT,没有宿主选项对比 / 闭数据出处 / 跨包命名撞车检查。
  → 审阅者面对一行陈述无从反对。**该缺口另立 ADR(S5),本 ADR 只解决两轴定义。**
- **probe 盲区**:`cortex probe` 只测空壳,不测"决策是否有 ADR 背书"。

owner 已裁决(2026-09-10):命名全量改名;宿主留在 deck;16 家普查**是设计不是缺陷**。

## Decision Drivers

1. **一个词两义 = 下一位 agent 的静默事故源。** 只要"adapter/registry"在两处指不同东西,
   grep 就会给出看似相关实则无关的结果;而本项目的工作方式**高度依赖 grep 重建上下文**
   (compaction 后尤其)。撞名的代价不是审美,是可检索性。
2. **两轴的开闭不对称是**有理由的**,必须写成显式决策。** player 轴的"开"是目的
   (第三方实现者扩展生态,ADR-20260506214000000:37 `registerAgent()` 开放注册);
   CLI-layout 轴的"闭"也是目的(条目是对外部世界的事实宣称,受 `no-source-no-rule` 约束)。
   此前这不对称只是现场构造,没有落盘 —— 于是下一位 agent 既可能"顺手开放"数据表,
   也可能"顺手收敛"player 注册点。
3. **闭数据哲学已有血缘,应当升格复用而不是重新发明。** `ADR-20260508230803515` 已确立
   "agent 发现 → 本地沉淀 → 来源审计后入库",并明确拒绝把发现智能(FB 把"去哪找、怎么查"
   的决策)搬进 npm 静态层 —— 理由之一是**每个外部 source 飘移都要 lythoskill 跟着发版**。
   CLI 布局数据是同一模式的第二次实例。
4. **`feedback_document_rejected_alternatives`**:agents 会反复重新提"hub / registry /
   dep-manager / 权威名单"模式;不写 ADR 拒绝 = 下一个 agent 重新发明。
5. **`feedback_no_source_no_rule`**:布局数据的每一行都是事实宣称,假来源负于无来源
   (2026-09-09 B1 已据此撤掉一行 opencode hazard)。
6. **`project_thin_pattern_three_layer_essence`**:智能在 agent 侧、稳定集成在 npm 侧、
   CLI 只做机械胶水。两轴的归属决定哪一层持有哪种智能。

## Options

### Option A: 维持现状 —— 不修名、不立轴,只加一句交叉注释
**Pros**: 零改动;两处都不破。
**Cons**:
- **承认名字在说谎**。`CliAdapter` 不 adapt、`registry` 不 register,注释只能描述这个混乱,
  不能消除它 —— 而注释恰恰是 compaction 后最先丢失的东西。
- 下一位 agent 仍会 grep 到两处、仍会在错误的一处改代码。

### Option B: 只删 deck 那张表(布局信息交给 agent 现场查)
**Pros**: 彻底消除撞车,且符合"发现智能归 agent"。
**Cons**:
- **与 deck 的实际职责冲突**。fan-out 策略(`also_link_to` 指向哪个目录、要不要 snapshot)
  是**每次 link 都要做的机械决策**,不是每次都要重新调研的发现任务。把 16 家布局全部
  降级成"agent 现场查",等于把确定性换成 16 次网络往返。
- 已实证的数据丢失:`hazards` 里的 Goose #11600(data-loss 类)、
  opencode #45961(ENAMETOOLONG cycle)是**实测复现过**的,丢掉就是丢掉血。
- 布局数据的**消费方是机械层**(link/per-run 的纯函数),不是 agent 的推理。

### Option C: 移入 `@lythos/agent-adapter`(合并两轴)
**Pros**: 仓里只剩一个 "adapter/registry" 概念,彻底消歧。
**Cons**:
- **范畴错误**:把 CLI-layout 轴塞进 player 轴,合并的正是本 ADR 要立的界。
- 会给 agent-adapter 引入 deck 领域的目录约定数据,反向污染。
- agent-adapter README 自述的边界("starts a long-running process / allocates ports /
  parses SSE → new package")也接不住这类数据。

### Option D: 抽独立包 `@lythos/cli-layout`
**Pros**: 界最清晰;模块本身零 import,抽取在物理上恒为一个 commit。
**Cons**:
- **外部消费方 = 0**。现在抽 = 提前抽象,为一个假想消费者付真实成本
  (版本 lock-step、publish 清单、README、发布面)。
- **但这条要被记录而不是被遗忘** —— 见决策段的触发条件。

### Option E: 改名但保留 `registry` 词(如 `cli-layout-registry`)
**Cons**: 撞车向量只去掉一半 —— `registry` 仍是两义,且 deck 侧依然不是 registry。

## Decision

**Choice**:

1. **确立两轴分类,写为显式决策 —— 两轴不得合并:**
   - **player 轴**(`@lythos/agent-adapter` 家族)= **可执行行为**。扩展者 = 第三方实现者,
     **开放注册是目的**(`registerAgent()`,ADR-20260506214000000:37)。
     判据:它 spawn / 连接 / 驱动一个 agent runtime。
   - **CLI-layout 轴**(deck 的 `cli-layout.ts`)= **闭数据**。条目 = 对外部世界的
     **事实宣称**(某 CLI 在哪找 skills、是否跟随 symlink、有无 data-loss 危险),
     受 `no-source-no-rule` 约束,**审过才进**。
     判据:它是零 import、零行为的一行数据。
   - 两轴的开闭**不对称是刻意的**,不是疏漏。把数据表"打开"成运行时发现、或把行为
     注册点"收紧"成静态名单,都是对这条决策的违反。

2. **命名落地**(全量改名,消掉两个词的两义):
   `adapter-registry.ts` → `cli-layout.ts`;`ADAPTER_REGISTRY` → `CLI_LAYOUTS`;
   `CliAdapter` → `CliLayout`;`AdapterHazard` → `Hazard`;
   `adaptersScanning` → `layoutsScanning`;`adapterById` → `layoutById`;
   `registryProblems` → `layoutProblems`;`adapter-policy.ts` → `layout-policy.ts`。
   **半改 = 没改**:留着 `adaptersScanning()` 处理 `CLI_LAYOUTS` 只是把矛盾搬进内部。
   保留 `SURVEY_CLAIMED_COUNT`(承载普查出处,是诚实的一部分)。

3. **宿主:留在 deck。** 零外部 import;抽取触发条件 =
   **出现非 deck 包的第一位消费者**(模块零 import,抽取恒为一个 commit)。
   记触发条件而不是记"以后再说" —— 否则下一位 agent 只能重新讨论。

4. **闭数据哲学升格为通用模式**(本 ADR 明确其血缘与边界):
   agent 发现 → 本地沉淀 → 来源审计后入库。承接 `ADR-20260508230803515`
   (curator 只做本地 cold-pool normalization,不包装外部发现 API)。
   **边界条件(硬)**:一旦这份数据长出**运行时拉取 / 自动发现代码**,
   立即撞 `ADR-20260508230803515` —— 那时必须回来重新裁决,不得就地加。
   **不是缺陷的部分**:16 家由 agent 自己调研选定,这是设计(发现智能归 agent),
   与 curator 同一条线。**替代方案"用人工/权威圈定的名单"已被拒绝**(见下)。

**Rationale**:

- 两轴的定义**各有可操作的判据**(能否 spawn / 有无 import),不是审美判断 ——
  下一位 agent 可以用它决定新东西该放哪一轴,而不是重新争论。
- 撞名的真实代价在**可检索性**:本项目 compaction 后高度依赖 grep 重建上下文,
  一个词两义会让每次 grep 都产生假相关命中。改名是消除**搜索歧义**,不是整理门面。
- 闭数据轴坚持"审过才进"的理由与 curator 同源:条目是**事实宣称**,
  而事实宣称错一次的代价(把 deck 指向一个会 data-loss 的目录)远高于少覆盖一家 CLI。

## Impact

- **Positive**:
  - 两轴各有判据与名分,新模块有归属可依;`adapter` / `registry` 两个词在仓里恢复单义。
  - 闭数据哲学第二次实例化并被记录血缘,**边界条件写明**(长出运行时发现即撞 curator ADR)。
  - 抽取触发条件被写下,未来不必重新讨论。
- **Negative**:
  - 一次跨 7 文件的机械改名(已随本 ADR 落地,`96e51a41`)。
  - `cli-layout.ts` 仍在 deck 内,deck 消费者与数据同包 —— 边界靠**约定 + ADR**维持,
    不靠包边界强制。这是"外部消费方为 0 时不过早抽包"的自觉代价。
- **Follow-up**:
  - `S5` ADR:提案纪律(架构决策不得藏于实现卡 Technical Approach)—— 本事故的结构性成因。
  - 交叉注记:`packages/lythoskill-agent-adapter/README.md` 自述 "INTERFACE + REGISTRY"
    处补一句,指明 `REGISTRY` 指 player 轴的开放注册,与 deck 的 CLI-layout 闭数据不同轴。
  - 季度复勘(P6)属 `cli-layout.ts` 的数据卫生,不在本 ADR 范围。

## Related
- Related ADR: ADR-20260508230803515(curator 不做 feed-adapter —— 闭数据哲学的血缘;
  本 ADR 为其第二次实例并写明边界条件)
- Related ADR: ADR-20260506214000000(player 轴开放注册的出处:`registerAgent()`)
- Related ADR: ADR-20260509144134332(deck 动词命名 —— 管动词,不管模块名)
- Related Task: TASK-20260909155425926(引入该表的实现卡)
- Related Task: TASK-20260910110545092(后续修项)
- Related Memory: `feedback_document_rejected_alternatives`、`feedback_no_source_no_rule`、
  `project_thin_pattern_three_layer_essence`
