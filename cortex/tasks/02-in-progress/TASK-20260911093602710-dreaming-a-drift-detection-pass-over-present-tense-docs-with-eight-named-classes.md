# TASK-20260911093602710: dreaming - a drift-detection pass over present-tense docs, with eight named classes

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-09-11 | Created |
| in-progress | 2026-10-19 | Started |
| suspended | 2026-10-19 | Blocked |
| in-progress | 2026-10-23 | Resumed |

## Background & Goals
<!-- ⚠️ REQUIRED: Why is this task needed? What problem does it solve? Empty = shell, blocked by probe. -->

**为什么这张卡存在**:2026-09-11 修一个 bug 的一天里,**八类漂移全部出现了现成实例** —— 不是靠"计划"发现的,是靠一个具体缺陷逼出来的定向考古(两个 agent、约 25 万 token)。**那个触发器不可依赖**:它随机、昂贵,而且**只覆盖有症状的那一类**。

**这张卡是那个判断的落地**:`cache 的维护 + AGENTS.md 覆盖 routine` 足够,**按需读入是 ok 的**。所以本卡**不建全库审计**,只做两件事 —— 把**便宜的问题**固化下来,并给 dreaming 的 ZK 那一遍一个**明确的产物类型(发现,不是修改指令)**。

**结构性观察:dreaming 的 Phase 1-3 只读文档。** Phase 1 从 weekly 起步(那是文档),Phase 2 把文档收敛成 SSOT,Phase 3 的零上下文 subagent 只拿到两份 SSOT 文档(`architecture.md`、`conventions.md`)。**整条流水线从不打开代码。**

**而"再做点 consolidation"永远到不了那里**:Phase 2 的职责是消灭冗余载体(`ADR-20260710172235956`:two carriers for one truth = guaranteed divergence)。它压缩的是 **doc↔doc** 的矛盾面。但**代码是一个不可约的第二载体** —— 每条关于系统行为的 SSOT 断言,在代码里都有一个永久对应物,任何 consolidation 都删不掉它。**所以 doc↔code 恰是 consolidation 无法收敛掉的那一类**,必须交给另一遍。

**为什么是"一组便宜问题"而不是"一次证伪"**:本日那条「`tasks:` 字段有声明没读者」的发现,**一条 grep 就答了**。缺的从来不是检测能力,是**那个问题被问出来**。而问题的触发有三种:bug 逼出来、排程、或 routine 带着它 —— 本卡负责第三种。

## Requirements
<!-- ⚠️ REQUIRED: List specific requirements. Keeping placeholders = shell. -->

- [x] dreaming 的 Phase 3 获得一组**具名、可答、便宜**的问题;操作清单在 `skill/references/drift-detection.md`,SKILL.md 只加 5 行(185 → 190 行),未撑爆正文(coach PASS @ 2026-10-23)
- [x] **范围:只覆盖现在时的文档**(`cortex/wiki/04-ssot/`、`AGENTS.md`、各 skill 的指南)。**ADR 是时点记录,不参与扫描** —— 只在"现场回溯"时顺手刷(本日实例:`ADR-20260509170343037`,commit `29279edd`)
- [x] **代码侧代理 = 测试套件**。测试**执行**,所以不会静默腐烂;于是文档↔测试是**两份权威断言的直接冲突**,可判定。文档↔源码要先从源码**推断**契约,那一步本身就是错源
- [x] **只覆盖无症候的类**。有症候的漂移交给 bug 驱动的按需拉取 —— 那才是它正确的触发器
- [x] **产物是发现,不是修改指令**。沿用 `ADR-20260910113534807` 方案C 的判别式:输出覆盖率/通过与否的检查必须机器可判语义;**只做提醒的检查,形式触发即可**
- [x] 第 8 类「验证自我指涉」的探测法必须逐字写进去:**「这个测试失败时,是什么驱动它失败的?」** —— 若答案涉及被测模块自己(它 import 了它、它用了同一套算术、它的夹具落在函数的退化点上),那它测不了自己

## Technical Approach
<!-- ⚠️ REQUIRED: Implementation plan, key decisions, references. Empty = shell, blocked by probe. -->

**判据 C1-C6 不命中**(仅"具名概念"一项可能沾边,<2 项),故不引新 ADR。但 `cortex task create` 的自动提示会为"具名概念"发问,故在此记录该读法 —— 八类是一份**描述性清单**(供一个 skill 的 reference 用),不是新的抽象/边界/封闭数据集。

**八类的发现记录、八个当日实例,以及第 7/8 类的自省论证 —— 由 wiki pattern 承载;操作化后的清单(每类的问题、探测器、scope、产物规则)由 reference 承载(2026-10-23 coach 复审后确立单一载体):**

- `cortex/wiki/01-patterns/2026-09-11-drift-classes-eight-named-ways-a-project-diverges-from-its-own-record.md`(发现记录)
- `packages/lythoskill-dreaming/skill/references/drift-detection.md`(canonical 操作清单)

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

- [x] **AC1 机制** —— Phase 3 指向 `references/drift-detection.md` 并给出执行条件;八类问题、探测器、scope、产物规则均在该文件。SKILL.md 190 行(改前 185,+5),coach 判 PASS @ 2026-10-23。
- [x] **AC2 激活面** —— **不动 frontmatter**:drift pass 是 Phase 3 的子步骤,dreaming 已由 "consolidate/整理文档/SSOT" 触发;失败模式是"跑了 dreaming 但没问问题",不是"没触发 dreaming"。把 "drift" 写进 Tier 1 会把症状类的 bug-driven 拉取误路由到 dreaming,与卡的范围纪律冲突。AGENTS.md 改两处:§10 技能表行(purpose + when: "docs say X but the tests say Y"),§11 Pointer Index 增 drift-detection.md 落点。
- [x] **AC3 执行实测** —— arena host-handoff(`localhost/me` + `prepare-workdir`),两个零上下文 agent、同一 prompt、各自 `/tmp` corpus,唯一变量是 skill 版本。
  - **corpus**:自建 fixture,植入 6 类真实漂移(carrier 3v4、doctrine whitespace、authorization `strict`、enforcement `titleCase` 无测试、precondition D1、self-referential date test)+ 一份 superseded ADR(检验 scope 纪律)。
  - **before**(HEAD 构建物):产出 4 份 SSOT + 散文式 pitfalls,`grep -cE 'class [1-8]|\.ts:[0-9]|\.md:[0-9]'` = **0**;问题以段落记录,无类名/行号/"如何了结"字段。
  - **after**(coach 修正后的最终构建物,`ba71f3b8` → 最终 `52768c4f`/`3aaa09ab` 同机制):**15 条 finding**(F1–F15),41 处 `path:line`;每条含类名 + 行号 + 证据 + 了结动作;`grep -oE 'class [1-8]' | sort -u` = **八类全部覆盖**;额外产出 `drift-findings.md` 并把 ZK 读出的 2 条(F14 decision-log 无 guard、F15 rejected ADR 放在 accepted 目录)也收进清单;ADR 目录 `diff -r` 逐字节未改,明确"发现而非修复";4/4 测试仍绿。
  - **结论**:机制成立。诚实边界:fixture 小且宿主模型有能力,before 也靠"读代码/测试做 consolidation"发现了多数问题;after 的增量是**结构、可追溯性、类覆盖与可复跑的清单**,不是"baseline 永远看不到"。AC3 证据钉在最终构建物(见提交哈希),不再有"折后未评"。
  - 纪律:全部 `/tmp`;prompt 显式 `cd` 到各自 workdir;未触碰 parent deck(主仓 `skill-deck.toml`/working set 未变)。
- [x] **AC4 coach pass** —— 第一轮 NEEDS-CHANGES(3 条:reference 与 wiki 双载体、正文复述、class 6 不可执行),全部修复;第二轮复审确认 3 条 RESOLVED,并抓出 2 条元数据不一致(patterns INDEX 仍称 wiki 为权威、本卡 AC5 仍按旧分工),已修。最终判 PASS。
- [x] **AC5** 八类与八组当日实例的**发现记录**由 **wiki pattern** 承载;操作清单的单一载体是 `references/drift-detection.md`。**2026-10-23 修订**:coach 复审发现 reference 与 wiki 的八行问题表构成双载体(正是第 1 类「载体漂移」,当天制造),已删除 wiki 表格并改为指针;patterns INDEX 与 AC5 同步修正。本卡不抄第二份
- [x] **AC6** 未引入覆盖率/通过与否检查。reference § Output 明确 "findings, never pass/fail verdicts unless machine-decidable";AC3 的 after 产物是 15 条可读 findings,不是绿色/红色信号。

**AC3 的纪律**(`lythoskill-arena` 自身 CRITICAL 项,写在这里免得执行者踩):
1. 实验跑 **`/tmp`**,绝不进 committed 目录
2. **prompt 必须显式设 `workDir`** —— subagent 继承父 CWD,不设就污染主仓
3. 跑完**恢复 parent deck**,不留 working-set 污染

## Progress Log
<!-- Update during execution, with timestamps -->

- 2026-09-11 — 本卡由 `TASK-20260911080931450` 的执行日挖出的八类漂移凝成。八类**全部**有当日实例;其中第 4 类已顺手刷新(`ADR-20260509170343037` 追加 Status History note,commit `29279edd`)。
- 2026-10-23 — 从 suspended 恢复并完成:
  - 新增 `references/drift-detection.md`(canonical 操作清单:八类问题/探测器/scope/代码侧代理/发现产物);Phase 3 加 5 行指针;SKILL.md 185 → 190 行。
  - AGENTS.md §10 路由行 + §11 Pointer Index;frontmatter 不动(理由见 AC2)。
  - coach 第一轮 NEEDS-CHANGES(双载体/正文复述/class 6 不可执行)→ 全部修复;第二轮确认 RESOLVED,另抓 2 条元数据不一致(patterns INDEX、AC5)→ 已修,PASS。
  - wiki pattern 收敛为发现记录 + 指针;单一载体落到 reference。
  - AC3:arena host-handoff 前后对照,before 0 条编号 finding / 0 处行号;after 15 条 / 41 处行号 / 八类全覆盖;ADR 逐字节未改。
  - 单测全绿(project-cortex 219、deck 300、arena 188,各包 0 fail)。

## Related Files
- `packages/lythoskill-dreaming/skill/SKILL.md`(**源**;Phase 3 = `### Phase 3: ZK Validate`,约 line 115)
- `packages/lythoskill-dreaming/skill/references/`(新内容的落点;已有 `hermes-dreaming-field-notes.md`)
- `skills/lythoskill-dreaming/`(**生成物 —— 不许手改**;`@lythos/skill-creator build` 做 `{{PACKAGE_VERSION}}` 替换)
- 实例出处:第3类 `skill/assets/TASK-TEMPLATE.md`;第4类 `ADR-20260509170343037`;第5类 `AGENTS.md:164` + `.husky/pre-commit` §0.5 + `adr-relations.ts` 的 `tasks`;第6类 `ADR-20260503003315478` driver 4 与它那个前置被 supersede 的 ADR-C
- 触发本卡的工作:`TASK-20260911080931450`(commits `47fa5f17` / `04c4d376` / `ba652ae0` / `8dceb0e9`)
- Modified: `AGENTS.md`; `packages/lythoskill-dreaming/skill/SKILL.md`; `skills/lythoskill-dreaming/SKILL.md`(build); `cortex/wiki/01-patterns/INDEX.md`; `cortex/wiki/01-patterns/2026-09-11-drift-classes-eight-named-ways-a-project-diverges-from-its-own-record.md`; this card
- Added: `packages/lythoskill-dreaming/skill/references/drift-detection.md`; `skills/lythoskill-dreaming/references/drift-detection.md`(build)

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
