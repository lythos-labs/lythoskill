# ADR-20260910181957316: two-stage-zk-review-gates-review-the-plan-before-execution-review-the-implementation-against-the-spec

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-09-10 | Created |
| accepted | 2026-09-10 | Accepted |

## Background
<!-- ⚠️ REQUIRED: Problem description and context. Empty = shell, blocked by probe. -->

2026-09-10 这一天,同一个模式被跑了**两轮**(一个 plan、一个实现),而且是在**同一份**产出上:
`TASK-20260910152029904`(deck 的 toml 写入改成 AST 定位 + 区间 splice)。

| 闸 | 对象 | 轮次 | HIGH |
|---|---|---|---|
| 计划闸 | card + ADR 规格表(**代码还不存在**) | 3 + delta | 3 → 1 → **0** |
| 实现闸 | 已落地的代码 + 测试 | 6 + delta | 4 → 4 → 1 → 1 → 1 → **0** |

**两次闸门抓到的不是同一类东西**,这是本条决策的全部理由:
- **计划闸抓的是"规格的洞"**:规格只写了 happy shape(数组),漏了读取侧认的另两种形状(内联表、点号键);
  更要命的一条是"在 legacy 数组旁新增表 = 把 deck 写坏" —— **在纸上就被拦住了,没有一行代码被写出来**。
- **实现闸抓的是"可执行的形状"**:越界剪裁吃掉后面的 section、`inInline` 是 400 字符文本启发式、
  同一 entry 的多个字段各拿一次同一个逗号 —— **这些只有跑起来才会显形**,任何读规格的评审者都推不出来。

**第三个证据来自作者自己**:作者给每条修复写的测试,在"把修复改回去"的变异下**一片绿**
(三条修复实为摆设:一条死代码、一条判据换错方向、一条没有判别性测试);
而**没写这段代码的**评审者用同一批变异点在了一轮内全部点出。仓内既有记录同形:
*「测试与实现出自同一处理解时,测试不是独立的第二意见,是同一处理理解的第二份抄写。」*

**现状**:这一天的做法**没有写在任何地方** —— 它活在会话里。下一位 agent 会重新发明一个更弱的版本,
或者只做"写完再 review"那一半。这正是 `ADR-20260910113534807`(提案纪律)处理过的同一种失效:
**规则存在 ≠ 规则被触发**;而这次连规则都还不存在。

## Decision Drivers
<!-- ⚠️ REQUIRED: Why does this decision need to be made? -->

1. **闸门要加在纯的那一侧。** 计划是纯的(改一句话成本为零,被推翻只重写一段);
   执行是 IO(一张卡重做、一份数据被写坏、一个已 push 的 commit)。这是本仓既有的 plan/IO 分离
   在**治理层**的同一招:**能在纸上打掉的洞,不要在磁盘上打一遍再发现。**
2. **两段各自抓的东西不可互相替代**(见 Background 的对照):纸上能拦下"规格漏项"与"会写坏数据的设计",
   拦不下"实现的可执行形状";反之,实现闸对"规格本身写错了"无能为力 —— 它只会忠实地实现错规格。
3. **以终为始必须是机制。** 先写下的**规格表 / judge 判据**就是实现闸的对照物 ——
   所以计划里"做完怎么算对"要钉成**可数、可验证**的条目。一句意图给评审者**无从反对**:
   没有选项可推、没有被拒方案可质疑(`ADR-20260910113534807` 的同一条论据)。
4. **修复的验收标准只有一条:变异。** 把修复改回去,**要有某个具体测试变红**。没有红的 = 没修或没测。
   代价已证(Background 第三段)。
5. **评审者不能是作者。** 项目知识可以有(更准),作者身份不行(判别力的敌人)。
6. **审计线索必须落盘且可继承。** 每轮的 gap 清单 + 作者的处置(接受 / 质疑 / 记边界)逐字留档,
   下一轮 fork 同一个评审者读它 —— 否则每轮重发现同一批 false positive,收敛轮次被烧掉。

## Options

### Option A — 只有末端闸(写完再 review)

**Pros**: 最省;符合大多数项目的直觉("做完才能审")。
**Cons**: 本日的对照就是反例 —— 计划闸在**零行代码**时拦下了"会把 deck 写坏"的设计;
   到了末端,这条已经是一段要重写的实现 + 一个已经写坏的 deck。
   **Rejected**。

### Option B — 只做计划闸

**Pros**: 成本最低,且抓到的都是结构性的洞。
**Cons**: 计划闸对"实现的可执行形状"**结构性无能为力**(越界剪裁 / 文本启发式 / 重叠区间 ——
   都是跑起来才显形的)。只有计划闸 = 把 11 条 HIGH 里的 7 条留给线上。**Rejected**。

### Option C — 两段闸门,各自收敛(**Selected**)

计划闸(WHAT/WHY/HOW + 拿真实输入打规格的洞)→ 收敛后执行 → 实现闸(逐条对照**规格**、跑变异、报查不到的)。

**Pros**: 两段各自覆盖对方的盲区;计划侧的修复成本是一个数量级更低;实现侧的判据(变异)是机器可判定的。
**Cons**: 一个变更要走两次收敛(本日实测:计划 3 轮 + delta,实现 6 轮 + delta)——
   **代价真实,所以适用范围要收窄**(见 Impact 的范围声明),不是所有改动都配两段闸。

### Option D — 依赖作者自审 + 测试绿灯

**Pros**: 零额外 agent 成本。
**Cons**: 已经是本条的成因 —— 作者自写的测试在变异下一片绿。**Rejected**。

## Decision
<!-- ⚠️ REQUIRED: Explicit choice + rationale. Keeping placeholders = shell. -->

**Choice**: **Option C —— 两段闸门;计划闸必须先于执行,实现闸的判据是"对着写代码之前定下的规格"。**

**Rationale**: 两个闸门不是"更严格的同一件事",而是**在两种不同介质上各抓一次**:
纸上抓设计与规格的洞,盘上抓实现的可执行形状。把闸门加在计划这一侧是**成本**论证:
纯的那一侧改起来最便宜,而 IO 那一侧一旦写坏,退回代价不可比。

**落地形态**(机制细节在 `zk-review.md` §两段闸门,本节只记决策与边界):

| 项 | 规则 |
|---|---|
| 计划闸 | 零上下文 agent,`WHAT / WHY / HOW` + **拿真实输入去打规格的洞**(不是读一遍说还行) |
| 收敛 | 新 gap < 2 且全部低优先级;计划闸与实现闸**各自**收敛 |
| 执行 | 收敛之后才动代码;任何计划变更都要回计划闸(fork 同一 agent) |
| 实现闸 | **逐条对照规格**(不是代码注释);对每条修复**跑变异**;列出**查不到的**;报自己的副作用 |
| 载体 | ADR = 决策 + 规格表;card = 计划;review log = 门禁证据(**逐字留档,供下一轮继承**);产物落 `showcase/` 或产出目录 |
| 折入 | 收敛后每改一笔都是非空 diff → 对 delta 再送审,或在卡面标「折后未评」+ delta 范围(`ADR-20260910113730375`) |
| 独立性 | 知识独立(零上下文 prompt)与编排独立(不同 session/编排方)**分开写**,不合并成"独立" |

## Impact
<!-- ⚠️ REQUIRED: Positive / negative / follow-up. Empty = shell, blocked by probe. -->

- **Positive**:
  - 会写坏数据的设计**在纸上**被拦下(本日实例:legacy 数组旁新增表 = `Defining a key multiple times is invalid`)。
  - 实现闸的判据是**机器可判定**的(变异 → 红/绿),不依赖评审者的语气或经验。
  - 修复的"成色"第一次有了可反驳的判据:"我修好了"必须交出那条会变红的测试。
  - review log 落盘后,收敛**不需要重做** —— 下一轮读上一轮的 gap 清单与处置。
- **Negative**:
  - 一个变更走两次收敛,轮次与 token 成本翻倍(本日:计划 3+1、实现 6+1)。
  - 需要**另一个** agent 的上下文预算;单 agent 环境下退化成自审,而自审已知无效。
- **范围声明(刻意收窄)**:两段闸门用于**改数据/改写入路径/改不可逆流程**这类变更;
  纯文档、单行修复、可秒回滚的改动只走既有的**任命前闸**(`AGENTS.md § ZK Review Gate`)即可。
  **不是所有卡都配两段闸** —— 把闸门加到不需要它的地方,是另一种形式的形式主义。
- **Follow-up**:
  - [ ] 第三段闸(测试本身作为评审对象;评审者不能是作者)的机制实测 →
    `TASK-20260910181747676`;原则已写进 `zk-review.md` §第三段,**机制待试**。
  - [ ] `zk-review.md` 已落 §两段闸门(SOURCE,已重建 `skills/`)+ `AGENTS.md § ZK Review Gate` 指针。
  - [ ] 实盘案例逐字留档:`showcase/2026-09-10-zk-reviews/`(15 份 log)。
- **Related**:
  - `ADR-20260910113730375`(评审对象须 commit-pinned / claims-not-scores / 证据卫生)—— 本条的折入纪律直接引用它。
  - `ADR-20260910113534807`(提案纪律:决策不得只活在实现卡的 Technical Approach)—— 本条是它在**流程**方向的延伸。
  - `TASK-20260910152029904`(本条的实证来源)、`TASK-20260910110545092`(成品闸的实证)。
  - `AGENTS.md § ZK Review Gate`(任命前闸,本条不替换它,而是把它扩成两段)。

<!-- ^ Follow-up work of an ALREADY-ACCEPTED ADR is carried by THIS ADR — do not open a
     separate card for it. Tick the item here and write the commit sha next to it.
     A card is for work that needs its own criteria / plan / owner decision; an accepted
     ADR's follow-up is that ADR's own consequence, and the ADR is where the next agent
     will look for it. Boundary + the 2026-09-10 evidence: writing-guide.md →
     "An accepted ADR carries its own follow-up" (ADR-20260910113534807 § 5). -->

