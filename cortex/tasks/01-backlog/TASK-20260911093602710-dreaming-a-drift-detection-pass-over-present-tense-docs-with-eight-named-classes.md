# TASK-20260911093602710: dreaming - a drift-detection pass over present-tense docs, with eight named classes

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-09-11 | Created |

## Background & Goals
<!-- ⚠️ REQUIRED: Why is this task needed? What problem does it solve? Empty = shell, blocked by probe. -->

**为什么这张卡存在**:2026-09-11 修一个 bug 的一天里,**八类漂移全部出现了现成实例** —— 不是靠"计划"发现的,是靠一个具体缺陷逼出来的定向考古(两个 agent、约 25 万 token)。**那个触发器不可依赖**:它随机、昂贵,而且**只覆盖有症状的那一类**。

**这张卡是那个判断的落地**:`cache 的维护 + AGENTS.md 覆盖 routine` 足够,**按需读入是 ok 的**。所以本卡**不建全库审计**,只做两件事 —— 把**便宜的问题**固化下来,并给 dreaming 的 ZK 那一遍一个**明确的产物类型(发现,不是修改指令)**。

**结构性观察:dreaming 的 Phase 1-3 只读文档。** Phase 1 从 weekly 起步(那是文档),Phase 2 把文档收敛成 SSOT,Phase 3 的零上下文 subagent 只拿到两份 SSOT 文档(`architecture.md`、`conventions.md`)。**整条流水线从不打开代码。**

**而"再做点 consolidation"永远到不了那里**:Phase 2 的职责是消灭冗余载体(`ADR-20260710172235956`:two carriers for one truth = guaranteed divergence)。它压缩的是 **doc↔doc** 的矛盾面。但**代码是一个不可约的第二载体** —— 每条关于系统行为的 SSOT 断言,在代码里都有一个永久对应物,任何 consolidation 都删不掉它。**所以 doc↔code 恰是 consolidation 无法收敛掉的那一类**,必须交给另一遍。

**为什么是"一组便宜问题"而不是"一次证伪"**:本日那条「`tasks:` 字段有声明没读者」的发现,**一条 grep 就答了**。缺的从来不是检测能力,是**那个问题被问出来**。而问题的触发有三种:bug 逼出来、排程、或 routine 带着它 —— 本卡负责第三种。

## Requirements
<!-- ⚠️ REQUIRED: List specific requirements. Keeping placeholders = shell. -->

- [ ] dreaming 的 Phase 3 获得一组**具名、可答、便宜**的问题(八类见 **wiki pattern**,链接在 Technical Approach);新内容进 `skill/references/`,**不撑爆 SKILL.md 正文**(coach 判据)
- [ ] **范围:只覆盖现在时的文档**(`cortex/wiki/04-ssot/`、`AGENTS.md`、各 skill 的指南)。**ADR 是时点记录,不参与扫描** —— 只在"现场回溯"时顺手刷(本日实例:`ADR-20260509170343037`,commit `29279edd`)
- [ ] **代码侧代理 = 测试套件**。测试**执行**,所以不会静默腐烂;于是文档↔测试是**两份权威断言的直接冲突**,可判定。文档↔源码要先从源码**推断**契约,那一步本身就是错源
- [ ] **只覆盖无症候的类**。有症候的漂移交给 bug 驱动的按需拉取 —— 那才是它正确的触发器
- [ ] **产物是发现,不是修改指令**。沿用 `ADR-20260910113534807` 方案C 的判别式:输出覆盖率/通过与否的检查必须机器可判语义;**只做提醒的检查,形式触发即可**
- [ ] 第 8 类「验证自我指涉」的探测法必须逐字写进去:**「这个测试失败时,是什么驱动它失败的?」** —— 若答案涉及被测模块自己(它 import 了它、它用了同一套算术、它的夹具落在函数的退化点上),那它测不了自己

## Technical Approach
<!-- ⚠️ REQUIRED: Implementation plan, key decisions, references. Empty = shell, blocked by probe. -->

**判据 C1-C6 不命中**(仅"具名概念"一项可能沾边,<2 项),故不引新 ADR。但 `cortex task create` 的自动提示会为"具名概念"发问,故在此记录该读法 —— 八类是一份**描述性清单**(供一个 skill 的 reference 用),不是新的抽象/边界/封闭数据集。

**八类、它们的探测器、八组当日实例,以及第 7/8 类的两条自省问句 —— 由 wiki pattern 承载:**

- `cortex/wiki/01-patterns/2026-09-11-drift-classes-eight-named-ways-a-project-diverges-from-its-own-record.md`

**本卡只承载工作项**(改 dreaming 的哪一步、激活面、验收判据)。**此处不抄第二份** —— 抄了就是当日挖出的第 1 类「载体漂移」,由本卡自己在同一天制造。


**激活面:先 frontmatter + AGENTS.md,不先上 arena。** 两个面修的是不同的失败:

| 面 | 修什么 |
|---|---|
| frontmatter `description` | 让 skill **被触发** —— agent 什么时候会想起它 |
| `AGENTS.md` | 让 routine **路由过去** —— 已经在干活的人知道这一步该跑它 |

**而最便宜的一刀可能连 desc 都不用动**:Phase 3 本来就在 dreaming 里,加个指针即可 —— **先加指针,再看它到底缺不缺激活面**。

**判据必须可证伪**:"看看能不能补上"需要一个停止条件,否则这句话没有意义。**而且探针必须是一个「活」,不是一个「问题」** —— 因为"**说都会说去做**":问 dreaming 会不会做,每个变体都答"会"。所以 AC3 用 arena `localhost/me`,给一个**真实的 consolidation 活**,判**产物**。

## Acceptance Criteria
<!-- ⚠️ REQUIRED: Testable acceptance criteria. Keeping placeholders = shell. -->

- [ ] **AC1 机制** —— Phase 3 跑那八组问题;内容在 `references/`,SKILL.md 正文不显著增长(coach 判据)
- [ ] **AC2 激活面** —— frontmatter desc + AGENTS.md 路由的改动**记录在案**,含"是否需要动 desc"的判断与理由
- [ ] **AC3 执行实测** —— arena `localhost/me`(agent 编排的默认模式,非 CLI 跨 player runner);探针是**活**不是问题;**判据是产物**(有没有真去比对文档与测试、有没有产出发现);**改前 vs 改后**对照
- [ ] **AC4 coach pass** 在改完的 SKILL.md 上 —— meta 治理层归 coach
- [ ] **AC5** 八类与八组当日实例由 **wiki pattern** 承载(链接见 Technical Approach);**本卡不抄第二份** —— 抄了就是当日挖出的第 1 类「载体漂移」,由本卡在同一天制造
- [ ] **AC6** 不引入任何输出覆盖率/通过与否的检查(沿用 `ADR-20260910113534807` 方案C 的判别式)

**AC3 的纪律**(`lythoskill-arena` 自身 CRITICAL 项,写在这里免得执行者踩):
1. 实验跑 **`/tmp`**,绝不进 committed 目录
2. **prompt 必须显式设 `workDir`** —— subagent 继承父 CWD,不设就污染主仓
3. 跑完**恢复 parent deck**,不留 working-set 污染

## Progress Log
<!-- Update during execution, with timestamps -->

- 2026-09-11 — 本卡由 `TASK-20260911080931450` 的执行日挖出的八类漂移凝成。八类**全部**有当日实例;其中第 4 类已顺手刷新(`ADR-20260509170343037` 追加 Status History note,commit `29279edd`)。

## Related Files
- `packages/lythoskill-dreaming/skill/SKILL.md`(**源**;Phase 3 = `### Phase 3: ZK Validate`,约 line 115)
- `packages/lythoskill-dreaming/skill/references/`(新内容的落点;已有 `hermes-dreaming-field-notes.md`)
- `skills/lythoskill-dreaming/`(**生成物 —— 不许手改**;`@lythos/skill-creator build` 做 `{{PACKAGE_VERSION}}` 替换)
- 实例出处:第3类 `skill/assets/TASK-TEMPLATE.md`;第4类 `ADR-20260509170343037`;第5类 `AGENTS.md:164` + `.husky/pre-commit` §0.5 + `adr-relations.ts` 的 `tasks`;第6类 `ADR-20260503003315478` driver 4 与它那个前置被 supersede 的 ADR-C
- 触发本卡的工作:`TASK-20260911080931450`(commits `47fa5f17` / `04c4d376` / `ba652ae0` / `8dceb0e9`)
- Modified:
- Added:

## Git Commit Message
```
feat(dreaming): a drift-detection pass over present-tense docs (TASK-20260911093602710)

- Phase 3 gains eight named, cheap questions; content in references/
- scope: present-tense docs only; ADRs are point-in-time records
- the test suite is the code-side proxy; findings, never verdicts
```

## Notes
- **本卡不建全库审计** —— 那是完美主义。它建的是一组**便宜到 grep 级**的问题,以及一个**明确的产物类型**。
- 第 6 类是本卡唯一无法用测试辅助的,**也是最容易被忽略的** —— 它需要一个 deferred 决策的清单,而那份清单本身现在没有读者。
