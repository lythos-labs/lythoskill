# ADR-20260910120047122: unlisted-fan-out-targets-must-not-be-silent-silence-is-declared-never-default

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-09-10 | Created |
| accepted | 2026-09-10 | Owner 裁决 B18 = 选项 B(诚实优先),并追加豁免标记 |

## Background

`packages/lythoskill-deck/src/cli-layout.ts` 是一张**闭数据集**:16 家 CLI 的 skills 目录
约定,逐条来自 2026-09-09 的 agent 普查(条数由 `SURVEY_CLAIMED_COUNT` 记着)。
`layout-policy.ts` 的两条 fan-out 检查 —— `collectDuplicateScans` 与 `collectTriggerHazards`
—— 都是先 `layoutsScanning(target)` 再遍历命中行。

**目标目录不属于任何已知 layout 时,`layoutsScanning` 返回 `[]` → 两个循环都不进 → 零输出。**

于 `also_link_to = [".some-new-cli/skills"]` 与 `also_link_to = [".claude/skills"]`
(默认 deck,经设计休眠)**在 `deck link` 的输出上完全一样:都什么都不打印。**

**而"没有输出"对人/agent 的读法是"检查过了,没问题",不是"没有这份数据"。**
这与 `no-source-no-rule` 的推论同形:**缺失的规则被读成了通过的规则。**
一条不存在的 hazard 行与一条跑过且没命中的 hazard 行,在 stdout 上不可区分 ——
而后者是"已知安全",前者是"未知"。把两者合并成同一个空串,是这份输出在**说谎**,
且谎的方向是**让人更安心**(治理层看起来比实际覆盖得更多)。

本条由 2026-09-10 的 inbox-debate 善后卡(B18)提出,owner 裁决。它**不是**技术题:
A 与 B 都能自洽,区别只在"诚实优先"还是"信噪比优先"。

## Decision Drivers

1. **零输出与"查过且安全"同形。** 输出层没有任何办法区分这两个状态,读者只有在
   知道普查覆盖哪 16 家时才能正确解读 —— 而这正是新手没有的信息。
2. **与治理层叙事直接冲突。** `cli-layout.ts` 的存在意义就是"deck 知道每个 CLI 的坑";
   对一个它不认识的目录沉默,恰好把未知伪装成已知。
3. **警告疲劳是真实代价,不能靠"反正是 info"糊过去。** 一个非标准目标就多一行,
   用户会学会忽略整块警告 —— 这正是选项 A 的辩护理由,必须被正面回应而不是否认。
   回应方式:给"我确知这里没数据"一个**显式表达通道**,而不是把默认值设成静音。
4. **静默必须可归因。** 若要静音,那份静默得有出处。git-tracked 的 `skill-deck.toml`
   是天然位置:声明进了 diff、进了评审,和 `.gitignore` 同一个心智
   (**列出即静默,不列即发声**)。
5. **不能变成静音开关。** 豁免只能关掉"无数据"这一条;名单内的 data-loss hazard
   仍然发声。否则它就是一个"我不想知道"按钮,比沉默更糟。

## Options

### Option A — 维持默认静默
**Pros**:
- 默认 deck 零噪音,现有 dormancy 测试原样成立。
- 零新代码、零新配置面。

**Cons**:
- 名单外目标拿到的是**假的安全感**:用户以为 deck 查过了,deck 其实没有这份数据。
- 现状的问题不是"它错了",是**"它是个没人做过的决定"** —— 下个 agent 会按自己的
  偏好改回去,因为没有任何东西记录为什么是这样。

### Option B — 名单外目标出 info 级一行(**Selected**)
`<dir>: no layout data — hazards unknown`,外加 `acknowledged_unlisted` 显式豁免。

**Pros**:
- 默认诚实:未知就报未知,且**措辞说的是"没有数据",不是"有危险"** —— 不制造虚假警报。
- 豁免通道让"确知无关"有地方写,且写下的地方(git-tracked toml)自带评审。
- info 级与 data-loss/warning 分开渲染(`ℹ️` vs `⚠️`),不会被误读成危险。

**Cons**:
- 任何非标准目标都加一行,可能被当噪音而忽略 → 警告疲劳。
  **缓解**:默认 deck(`.claude/skills` + `.agents/skills`)与全部 docs-tier 目录
  仍零输出,噪音只出现在用户**主动加了非标准目标**的时候 —— 那正是他该看一眼的时刻。
- 豁免模式**不检查陈旧**:匹配不到任何目标的模式静静失效。接受(见 Impact)。

### Option C — 只在非默认 deck 上出(info),默认 deck 静默
**Pros**:
- 保住默认零噪音,且不引入豁免配置。

**Cons**:
- "默认/非默认"的判据本身要定义,而任何定义都是猜的 —— 规则变复杂而收益不明。
- 判据一旦落地就变成一条**无出处的规则**(`no-source-no-rule`),比 B 的显式豁免更糟:
  B 的静默至少有一份文件在说"我知道这里没数据",C 的静默只是"因为它是默认值"。

## Decision

**Choice**: **Option B** —— 名单外目标默认出 info 一行;静默需显式声明。

**Rationale**:

**默认值应该落在"不撒谎"那一侧,而不是"安静"那一侧。** 一个输出如果可能被读成
"已检查",它就必须在**没有检查**时说出来。这不是要不要提醒的问题,是这份输出
**可否被信任**的问题:一旦发现 `deck link` 的沉默有两种含义,用户对**所有**沉默
都不再能解读 —— 包括那些真正"查过且安全"的沉默。A 省下的那一行,代价是
整套 advisory 的可解读性。

`sound` 的落地:

| 项 | 规则 |
|---|---|
| 默认 | 目标不被任何已知 layout 扫描 → 出 1 行 `info` |
| 文案 | `<dir>: no layout data — hazards unknown` —— 说的是**缺数据**,不是**有危险** |
| 渲染 | `ℹ️  [info]`(与 `⚠️  [data-loss]` / `⚠️  [warning]` 分开);info 排在最后 |
| 去重 | **刻意不做** —— 见下 |
| 豁免 | `[deck] acknowledged_unlisted = ["<pattern>"]` —— **gitignore 式:列出即静默** |
| 匹配 | 与 `dirMatches` 同一谓词:归一化后相等,或以 `/<pattern>` 结尾(一个模式覆盖相对与绝对写法) |
| 豁免边界 | **只关掉"无数据"这条**;名单内的 data-loss hazard 照常发声 —— 它不是静音开关 |

**静默的出处就是那份声明本身**,而 `skill-deck.toml` 是 git-tracked、进 diff、进评审的
—— 这是本决策与"加个静音开关"的本质区别,也是它为什么没有违反 `no-source-no-rule`:
被豁免的不是"规则",是**"deck 对这个目录没有可说的"这件事被显式承认了**。

**被拒的定向反射**:`deck per-run <未知 id>` 那条路**本来就不静默**
(`per-run.ts` 返回 error + 支持列表)。本条只管 fan-out 警告这一条路,不重开 per-run。

**为什么不去重(写在这里,免得下个 agent 以为是漏了)。** 第一版实现按归一化后的目录名
去重,好让同一目录写两遍只报一行。**已撤除**,两个理由:

1. **它会吞掉该报的行。** 归一化把 `~/.x/skills` 映射成 `.x/skills`,而这两个是**不同的真目录**
   (家目录 vs 项目内)。用归一化键去重 = 把其中一条警告静默掉 —— 在一个"为了不静默"的改动里
   引入一处静默。
2. **它服务的场景可能没有真实用户。** 同一个 fan-out 目标在 `also_link_to` 里写两遍,
   是用户自己写重了;代价是**多一行 info**,不是错误。为一个可能不存在的场景引入导出
   (去重键需要把 `normalizeDir` 变公开)和一个新测试,是**在螺丝壳里做道场**。
   **多一行无害,少一行有害** —— 冲突时选前者。

判据(留给下一位,不必再论证一遍):*这个边界情况的代价是一行输出,还是丢一条信息?*
前者 → 不做。后者 → 做。

## Impact

- **Positive**:
  - "deck 检查过了"这个读法重新变得可依赖:沉默现在只有一个含义。
  - 静默可从 `git log skill-deck.toml` 追溯 —— 谁、何时、为哪个目录决定不再提示。
  - 默认 deck 与全部 docs-tier 目录行为不变,dormancy 测试语义原样成立。
- **Negative**:
  - 非标准目标多一行。**这是刻意的**:加非标准目标是他主动做的,那一刻正是该看一眼的时刻。
  - 豁免模式**不检测陈旧**(匹配不到任何目标的模式静默失效)。**接受并写明**:
    检测它需要把"目标全集"喂给策略层,而策略层目前是纯函数(输入目标串)。
    陈旧模式无害(它只是没生效),而"加一个全局扫描来抓无害的死配置"不划算。
  - 已在 `acknowledged_unlisted` 里的目录**不会**因为上游新增了对它的普查而自动解除豁免 ——
    那时豁免变成了一条过时的断言。这是记账项,不是自动检查项。
- **Follow-up**:
  - `packages/lythoskill-deck/src/layout-policy.ts`:`FanOutSeverity` 加 `info`,
    新增 `collectUnlistedTargets` 与 `FanOutOptions.acknowledgedUnlisted`(**已落地**)。
  - `packages/lythoskill-deck/src/link.ts`:`parseAcknowledgedUnlisted` + 读 toml + 分级渲染(**已落地**)。
  - `packages/lythoskill-deck/README.md` § Safety guards 写明取向(**已落地**,B18 自身的要求:
    "必须选一个并写进 README,否则下个 agent 会按自己的偏好改回去")。
  - 普查报告未持久化 = **取证未留痕**,与本条独立,仍在善后卡上。

## Related
- Related ADR: **ADR-20260910113131220**(two-axis taxonomy / 闭数据哲学)—— 本条是那张闭数据集
  的**边界行为**:数据集闭的代价必须显式付,不能以沉默的形式转嫁给读者。
- Related ADR: **ADR-20260910113534807**(提案纪律)—— 同一主题的另一面:记录的合规度量是
  发现性。一条不存在的检查,和一个不被指称的文档,同样是"缺失被读成了通过"。
- Related Task: `TASK-20260910110545092`(善后 follow-up 卡,B18;owner 于 2026-09-10 裁决 = 选项 B)。
- Related Task: `TASK-20260909155425926`(原卡,本条的提出背景)。
