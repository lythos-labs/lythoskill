# TASK-20260911093602710: dreaming - a drift-detection pass over present-tense docs, with eight named classes

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-09-11 | Created |
| in-progress | 2026-10-19 | Started |
| suspended | 2026-10-19 | Blocked |
| in-progress | 2026-10-23 | Resumed |
| review | 2026-10-23 | Deliverables committed |
| completed | 2026-10-23 | Done |

## Background & Goals
<!-- ⚠️ REQUIRED: Why is this task needed? What problem does it solve? Empty = shell, blocked by probe. -->

**为什么这张卡存在**:2026-09-11 修一个 bug 的一天里,**八类漂移全部出现了现成实例** —— 不是靠"计划"发现的,是靠一个具体缺陷逼出来的定向考古(两个 agent、约 25 万 token)。**那个触发器不可依赖**:它随机、昂贵,而且**只覆盖有症状的那一类**。

**这张卡是那个判断的落地**:`cache 的维护 + AGENTS.md 覆盖 routine` 足够,**按需读入是 ok 的**。所以本卡**不建全库审计**,只做两件事 —— 把**便宜的问题**固化下来,并给 dreaming 的 ZK 那一遍一个**明确的产物类型(发现,不是修改指令)**。

**结构性观察:dreaming 的 Phase 1-3 只读文档。** Phase 1 从 weekly 起步(那是文档),Phase 2 把文档收敛成 SSOT,Phase 3 的零上下文 subagent 只拿到两份 SSOT 文档(`architecture.md`、`conventions.md`)。**整条流水线从不打开代码。**

**而"再做点 consolidation"永远到不了那里**:Phase 2 的职责是消灭冗余载体(`ADR-20260710172235956`:two carriers for one truth = guaranteed divergence)。它压缩的是 **doc↔doc** 的矛盾面。但**代码是一个不可约的第二载体** —— 每条关于系统行为的 SSOT 断言,在代码里都有一个永久对应物,任何 consolidation 都删不掉它。**所以 doc↔code 恰是 consolidation 无法收敛掉的那一类**,必须交给另一遍。

**为什么是"一组便宜问题"而不是"一次证伪"**:本日那条「`tasks:` 字段有声明没读者」的发现,**一条 grep 就答了**。缺的从来不是检测能力,是**那个问题被问出来**。而问题的触发有三种:bug 逼出来、排程、或 routine 带着它 —— 本卡负责第三种。

## Requirements
<!-- ⚠️ REQUIRED: List specific requirements. Keeping placeholders = shell. -->

- [x] dreaming 的 Phase 3 获得一组**具名、可答、便宜**的问题;操作清单在 `skill/references/drift-detection.md`,SKILL.md 183 → 191(+8:Phase 3 段落 + 引用表行 + Phase 1 索引事实刷新),未撑爆正文(coach PASS @ 2026-10-23)
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

- [x] **AC1 机制** —— Phase 3 指向 `references/drift-detection.md` 并给出执行条件;八类问题、探测器、scope、产物规则均在该文件。SKILL.md 183 → 191 行(+8),coach 判 PASS(复审钉点、raw 落点与复跑方式见 AC4)。
  → Verify: `wc -l packages/lythoskill-dreaming/skill/SKILL.md` → **191**;`grep -c "drift-detection" packages/lythoskill-dreaming/skill/SKILL.md` → **2**(Phase 3 段落 + 引用表行)
- [x] **AC2 激活面** —— **不动 frontmatter**:drift pass 是 Phase 3 的子步骤,dreaming 已由 "consolidate/整理文档/SSOT" 触发;失败模式是"跑了 dreaming 但没问问题",不是"没触发 dreaming"。把 "drift" 写进 Tier 1 会把症状类的 bug-driven 拉取误路由到 dreaming,与卡的范围纪律冲突。AGENTS.md 改两处:§10 技能表行(purpose + when: "check whether the docs still describe the code" —— ZK 复审指出原措辞 "docs say X but tests say Y" 是症状触发,与卡的范围纪律冲突,已改为主动式表述),§11 Pointer Index 增 drift-detection.md 落点。
  → Verify: `grep -n "lythoskill-dreaming\|drift-detection" AGENTS.md` → **2** 行(§10 路由行、§11 指针行);`git diff 1215cea2 -- packages/lythoskill-dreaming/skill/SKILL.md | grep "^[+-]description"` → 空(frontmatter 未动)
- [x] **AC3 执行实测** —— 隔离 workdir 由 `arena prepare-workdir` 物化(deck:cold pool `localhost/me/lythoskill-dreaming`),每个变体由 **Agent 工具直起的零上下文 subagent** 执行;逐字同一 prompt、各自 `/tmp` corpus,唯一变量是 skill 版本。**更正**:早期记录与提交信息写成 `arena host-handoff`,与实际命令不符 —— session transcript 里实际跑的是 `prepare-workdir`(见下方运行元数据),`host-handoff` 从未执行。受控对照 = **before3 ↔ after3**:after3 的 drift reference 是**探针时版本** `0531b4a2`(manifest 钉住),最终版 `394eb5b5` 与之只差 class 4 note 一句(见下方 delta)。
  - **corpus**:自建 fixture,植入 6 类真实漂移(carrier 3v4、doctrine whitespace、authorization `strict`、enforcement `titleCase` 无测试、precondition D1、self-referential date test)+ 一份 superseded ADR(检验 scope 纪律)。
  - **before**(受控基线 before3,与 after3 逐字同一 prompt;skill = `10b8852c^` 构建物,SKILL.md 内容哈希 `24ddc352`):产出 4 份 SSOT + 散文式 pitfalls;`grep -cE 'class [1-8]|\.ts:[0-9]|\.md:[0-9]'` = **0**;`grep -oE '\.(ts|md):[0-9]+'` = **0**;无编号 finding、无 `path:line`。**它确实发现了多数问题** —— 以散文记在 pitfalls("Drift recorded: docs/architecture.md wrongly claims…"),但没有结构化 finding 记录(无类名、无 `path:line`、无逐条"如何了结"),不可复跑。早期 before 变体(prompt 多一句 REPORT.md)结论相同,仅作旁证。
  - **after**(受控变体 after3;构建物内容哈希:SKILL.md `cb7eac38`、reference `0531b4a2` = **探针时** reference;最终版 `394eb5b5` 仅差 class 4 note 一句):**13 条 drift finding**(F1–F13)+ **2 条 open code issue**(O1–O2,单列在 "Open code issues and decisions" 章节,不是 drift finding)。F1–F13 覆盖 **7/8 类**(1、2、3、4、5、6、8);**class 7 被问到但没有实例** —— 记在 "Findings deliberately not raised"(本次没有手改任何记录,故无 repair 可漂),这是"问了、答无",不是漏问。每条 drift finding 为 `### Fn — Class N (name)` + `- Record` + `- Evidence` + `- Settle`(13/13/13);`grep -oE '\.(ts|md):[0-9]+'` = **42 次出现**;唯一位置 **35**(口径:`grep -roE '[A-Za-z0-9_./-]+\.(ts|md):[0-9]+' … | sort -u | wc -l`);ADR 目录 `diff -r` 逐字节未改,明确"发现而非修复";4/4 测试仍绿;findings 由 `pitfalls.md` 承载(未新建文件)。
  - **跨构建物一致性(旁证,限定其构建物)**:after2 跑的是 **`1be3ff82`(原 `c374e473`,仅重写 message)时代的 reference `3aaa09ab`**,与探针时 reference `0531b4a2` 有六处差异(class 6 探测器行、class 6 note、code-side-proxy 限定、`path`-only 规则、Most→Half、`immutable`;其后的最终版 `394eb5b5` 再改 class 4 一句)。在该内容上它产出 **15 条 / 八类全覆盖(F13 即 class 7 实例)/ 68 次 / 43 唯一**。两轮结果:**八个问题在两次中都问了**;finding-class 覆盖 8/8(after2)vs 7/8(after3,class 7 问到、无实例);结构与可追溯性是稳定增量,计数随措辞与文件组织而变。
  - **结论**:机制成立。诚实边界:fixture 小且宿主模型有能力,before 也靠"读代码/测试做 consolidation"发现了多数问题;after 的增量是**结构、可追溯性、类覆盖与可复跑的清单**,不是"baseline 永远看不到"。**探针后的 delta(两处,均已枚举)**:① 最终 SKILL.md 把 Phase 1 的 `52 dailies` 改为 `51 dailies`(README 不是 daily);同日复核 ADR 计数,`121 ADRs` 实为 `cortex/adr` 下 **121 个 .md 文件 / 117 个 `ADR-*.md`**,已改为 `117 ADRs`。② 按 user-sim 复审 P3-4,reference 的 class 4 note 末句由 "Only the second half needs a pass." 改为 "…and that pass is a read **on encounter** with the decision record, never an ADR sweep."(与 §Scope 的 ADR 排除对齐)。探针用的是 `0531b4a2`,最终 reference 为 `394eb5b5`。两处都不改任何类的问题、探测器或产物格式,不改变任何结论。
  - **运行元数据(可复跑)**:受控对照(before3 ↔ after3)的 prompt 逐字相同,`<DIR>` 是唯一替换:

    ```
    You are working on a small standalone project. The project directory is <DIR>.

    HARD SCOPE: every command you run must begin with `cd <DIR>`, and every file you read or write must be inside that directory. Do NOT read, run commands in, or modify /Users/chariots/Downloads/lythoskill-main — that is a different repository and is not part of this task. Do not use any skill from the outer environment; the project has its own working set.

    The project has a skill installed in its working set. Before doing anything else, read:
      <DIR>/.claude/skills/lythoskill-dreaming/SKILL.md
    and follow that skill's instructions for the task.

    Your task: perform a memory-consolidation ("dreaming") pass on this project. Consolidate what is currently true from the project's documents into the SSOT location the skill specifies.

    The project's documents are under docs/ and cortex/, and its code and tests are under src/. Work autonomously — do not ask questions. You may use any tools you have (read files, grep, run `bun test`).

    When finished, return a concise report as your final message containing:
    1. what files you created or changed,
    2. what the consolidated result says,
    3. anything you were unsure about or could not resolve.
    ```

    **物化 workdir(每个变体跑一次;`--deck`/`--out` 是唯一替换)**:

    ```
    cd /tmp/drift-probe && bun <repo>/packages/lythoskill-arena/src/cli.ts \
      prepare-workdir --deck after3/skill-deck.toml --out after3/work
    ```

    deck 形状(冷池是手搭的 `localhost/me` 目录,里面放构建好的 skill):

    ```toml
    [deck]
    max_cards = 15
    cold_pool = "/tmp/drift-probe/after3/cold-pool"
    working_set = ".claude/skills"
    also_link_to = []

    [tool.skills.lythoskill-dreaming]
    path = "localhost/me/lythoskill-dreaming"
    ```

    agent 由 **Agent 工具**起(零上下文 subagent;transcript 在 Claude session 的 `subagents/` 下,不入库),prompt 即上面那段,未附加 system 侧提示。

    **控制缺陷与补救**:最初的 before 变体 prompt 末尾多一句"write a concise report to <DIR>/REPORT.md",after2 没有 —— 两变体 prompt 并非严格相同。ZK 复审指出后,已用**与 after2/after3 逐字相同的 prompt** 重跑 before3(`/tmp/drift-probe/before3`,skill = `10b8852c^` 构建物,SKILL.md 内容哈希 `24ddc352`,与父提交构建物逐字节相同)。after3 是为把 after 侧钉到最终构建物而重跑的(`/tmp/drift-probe/after3`,SKILL.md `cb7eac38`、reference `0531b4a2`),prompt 与 before3 逐字相同;受控对照 = before3 ↔ after3。corpus 由 `/tmp/drift-probe/template/` 生成,所有变体逐字节相同。
  - 纪律:全部 `/tmp`;prompt 显式 `cd` 到各自 workdir;未触碰 parent deck(主仓 `skill-deck.toml`/working set 未变)。
  - **证据锚点**:`cortex/wiki/03-lessons/2026-10-23-dreaming-drift-probe-manifest.sha256` 钉住两变体的 cold-pool 构建物 + 4+4 份 SSOT 产出 + coach 第 3 轮 transcript 的 sha256,`cd /tmp/drift-probe && tail -n +6 <manifest> | shasum -a 256 -c -` → **12/12 OK**(已实测)。沿用 `2026-07-27-ab-rerun-evidence-manifest.sha256` 的约定:raw 留原地,仓内只钉哈希。
  → Verify: `grep -cE '^### F[0-9]+' /tmp/drift-probe/after3/work/cortex/wiki/04-ssot/pitfalls.md` → **13**;`grep -oE '\.(ts|md):[0-9]+' /tmp/drift-probe/after3/work/cortex/wiki/04-ssot/ | wc -l` → **42**;同目录 `grep -roE '[A-Za-z0-9_./-]+\.(ts|md):[0-9]+' … | sort -u | wc -l` → **35**;`grep -oE '\.(ts|md):[0-9]+' /tmp/drift-probe/before3/work/cortex/wiki/04-ssot/pitfalls.md | wc -l` → **0**;`diff -r /tmp/drift-probe/template/cortex/adr /tmp/drift-probe/after3/work/cortex/adr` → 无输出
- [x] **AC4 coach pass** —— 共三轮,零上下文 coach(只读 `skills/lythoskill-coach/SKILL.md` + 本 skill)。
  - **第 1 轮 NEEDS-CHANGES**(3 条):reference 与 wiki 双载体;正文复述 reference;class 6 只具名不可执行。全部修复(该轮原始日志未留存,此处按当时记录复述)。
  - **第 2 轮 NEEDS-CHANGES**(新发现 2 条元数据不一致):patterns INDEX 仍称 wiki 为权威、本卡 AC5 仍按旧分工。已修 → PASS。
  - **第 3 轮(ZK 复审后按最终内容重跑)NEEDS-CHANGES,2 P2 / 6 P3,0 P1**:
    - P2-1 Phase 1 索引事实已漂移:`W17-W22`、`docs_now_stale` 全量、`81 ADRs + 54 wiki + 25 dailies`、`6 files` 全部过时。已按实测改为 W17–W43/32 files、`docs_now_stale` 12/32、**117 ADRs + 130 wiki + 51 dailies**(as of 2026-10-23;口径:`find cortex/adr -name 'ADR-*.md' | wc -l` = 117(该目录下共 121 个 .md,含 INDEX/README)、`find cortex/wiki -name '*.md' ! -name INDEX.md | wc -l` = 130、`ls daily/*.md | grep -v README | wc -l` = 51、`ls weekly/*.md | wc -l` = 32)、32 files,并补 `quests_paused|parked_threads` 命令。
    - P2-2 class 6 探测器单元与 per-class note 自相矛盾,且 corpus 未命名。已改:探测器 = "grep deferred markers; ADR triggers read on encounter";note 命名 present-tense corpus、说明 "implementation deferred" 是假阳性、ADR 内触发器按"现场回溯"读且不计为对 ADR 的 finding。
    - P3 已修:P3-1 正文不再复述 output 规则;P3-2 "多数是 grep" → "一半是 grep";P3-3 测试"不会静默腐烂"补上"只认证其 pin 真正钉住的东西"。
    - P3 记录不改:P3-4(review-gates/wiki 的摘要层重叠,双方都已声明 reference canonical / 自身非规范)、P3-5(Tier-1 措辞是 AC2 的刻意决定)、P3-6(`curator scan` 是既有全仓约定,超出本卡)。
    - **复审 delta 验证**:coach 复算 32 files / 31-32-12-32 字段计数 / 121-130-52 语料,逐条确认 P2-1、P2-2、P3-1..3 已解决,无回归,**VERDICT: PASS**。其新增的唯一 P3(`docs_now_stale` 的 era 标签)已按其给出的字面 settle 建议改掉;advisory "counts 会老化" 已用 `as of 2026-10-23` 回答 —— 两处 delta 均为复审自己建议的措辞,不涉及结论。
  - **复审钉点与 raw 落点**:coach PASS 的内容 = `SKILL.md` 191 行(`95139331`,即 `6cc31f71`(原 `060402d5`)的源)/ `references/drift-detection.md` 125 行(`0531b4a2`)。第 3 轮 coach 的原始 transcript 未入库(零上下文子进程,1.1 MB,`…/subagents/agent-afa857c4d6298b017.jsonl`);按本仓既有约定,raw 留原地、仓内钉内容哈希 —— 见 `cortex/wiki/03-lessons/2026-10-23-dreaming-drift-probe-manifest.sha256`(含该 transcript 与两变体产物,`shasum -c` 12/12 OK)。**复跑方式**:零上下文 agent 读 `skills/lythoskill-coach/SKILL.md` + `packages/lythoskill-dreaming/skill/` 全文,按 rubric 出报告;钉点哈希可判"评的是不是同一份内容"。
  - **折后未评(5 处,前 4 处为计数/措辞,第 5 处新增示例)**:① `52 dailies` → `51 dailies`;② `121 ADRs` → `117 ADRs`(见 P2-1 的计数口径);③ class 4 note 末句澄清(见 AC3 delta ②);④ **计数快照改为量级**(`2df23759`,用户指示:依赖实时性的精确计数不参与任何结论,不值得花成本维护):`W17–W43, 32 files` → `W17 onward`;`31/32` / `32/32` / `12/32` → `most` / `every` / `a minority`;`117 ADRs + 130 wiki pages + 51 dailies (as of 2026-10-23)` → `100+ ADRs, 100+ wiki pages, 50+ dailies`。Phase 1 的论证未动;⑤ **reference §Output 增加 finding 示例**(`7b66c36d`,用户要求:对方差复跑暴露的三种表达做一次美学评估后给范例):两个示例(findings + 整文件 placement)+ 逐字段"为什么这么写";不是 schema,正文契约(四个字段)不变。现源:`SKILL.md` `09bbc16b`(191 行)、reference `7f27b769`(161 行)。
  → Verify: `shasum -a 256 packages/lythoskill-dreaming/skill/SKILL.md` → `09bbc16b…`;`shasum -a 256 packages/lythoskill-dreaming/skill/references/drift-detection.md` → `7f27b769…`;`grep -c "100+ ADRs" …/SKILL.md` → **1**;`grep -c "31/32\|12/32\|51 dailies" …/SKILL.md` → **0**;`grep -c "Why this shape, field by field" …/drift-detection.md` → **1**
- [x] **AC5** 八类与八组当日实例的**发现记录**由 **wiki pattern** 承载;操作清单的单一载体是 `references/drift-detection.md`。**2026-10-23 修订**:coach 复审发现 reference 与 wiki 的八行问题表构成双载体(正是第 1 类「载体漂移」,当天制造),已删除 wiki 表格并改为指针;patterns INDEX 与 AC5 同步修正。本卡不抄第二份
  → Verify: `grep -cE '^\| [1-8] \|' packages/lythoskill-dreaming/skill/references/drift-detection.md` → **8**;同命令对 wiki pattern → **0**(表格已删,只剩指针)
- [x] **AC6** 未引入覆盖率/通过与否检查。reference § Output 明确 "findings, never pass/fail verdicts unless machine-decidable";AC3 的 after 产物是 13 条 drift findings + 2 条 open code issues(可读、可复查),不是绿色/红色信号。
  → Verify: `grep -c "pass/fail" packages/lythoskill-dreaming/skill/references/drift-detection.md` → **1**(仅该声明句);`git diff 1215cea2 --name-only | grep -E '^(scripts|packages/.+/test)/'` → 空(未新增任何检查)

**AC3 的纪律**(`lythoskill-arena` 自身 CRITICAL 项,写在这里免得执行者踩):
1. 实验跑 **`/tmp`**,绝不进 committed 目录
2. **prompt 必须显式设 `workDir`** —— subagent 继承父 CWD,不设就污染主仓
3. 跑完**恢复 parent deck**,不留 working-set 污染

## Progress Log
<!-- Update during execution, with timestamps -->

- 2026-09-11 — 本卡由 `TASK-20260911080931450` 的执行日挖出的八类漂移凝成。八类**全部**有当日实例;其中第 4 类已顺手刷新(`ADR-20260509170343037` 追加 Status History note,commit `29279edd`)。
- 2026-10-23 — 从 suspended 恢复并完成:
  - 新增 `references/drift-detection.md`(canonical 操作清单:八类问题/探测器/scope/代码侧代理/发现产物);Phase 3 加 6 行段落 + 1 行引用表;SKILL.md 183 → 190 行。
  - AGENTS.md §10 路由行 + §11 Pointer Index;frontmatter 不动(理由见 AC2)。
  - coach 第一轮 NEEDS-CHANGES(双载体/正文复述/class 6 不可执行)→ 全部修复;第二轮确认 RESOLVED,另抓 2 条元数据不一致(patterns INDEX、AC5)→ 已修,PASS。
  - wiki pattern 收敛为发现记录 + 指针;单一载体落到 reference。
  - AC3:隔离 workdir 用 `arena prepare-workdir` 物化、零上下文 subagent(Agent 工具)执行 —— 受控对 = before3(0 条编号 finding / 0 处行号)↔ after3(13 条 drift findings + 2 条 open issues;7/8 finding-classes;42 次 / 35 唯一 `path:line`);ADR 逐字节未改。早期写 `arena host-handoff` 与实际命令不符,已更正。完整口径见 AC3。
  - 本地门:`bun scripts/ci-gate.ts` **7/7 绿 @ `6cc31f71`(tree 同 `060402d5`)**(单测 / cortex BDD / deck BDD / 示例 deck / site snippets / creator align 75-0 / 构建物同步);Bun 1.3.11。探针 fixture 自身 4 pass / 0 fail / 4 expect。
- 2026-10-23 — 证据自审(提交后逐条复算,修正本卡自身的三处不实数据 —— 恰好是本卡要防的那类漂移):
  - SKILL.md 行数:`wc -l` 实测 **183 → 190(+7)**;原记 185 → 190(+5) 不实,已改(3 处)。
  - AC3 `path:line` 计数:原记"41 处"实为 `grep -cE '\.(ts|md):[0-9]+' drift-findings.md` 的**行计数**(只覆盖那一个文件);全目录口径为 `grep -oE '\.(ts|md):[0-9]+'` = **68 次出现**,唯一位置 **43**(带路径前缀的正则 + `sort -u`)。已改为显式写出命令与口径;before 同命令 = 0。
  - after2 与 `1be3ff82` 的 reference 只差一个词(`immutable` 于探针后移除);与**最终** reference 差六处(见 AC3 的"跨构建物一致性")。此前进度日志把它写成"与最终只差一词",已更正。
- 2026-10-23 — **ZK 实现复审(零上下文,审 `10b8852c`;该提交的 tree 为 `de353cc7`,与当前可达的 `1be3ff82` 相同 —— message 经两次重写,内容未变,故仍可按 tree 复核)→ NEEDS-CHANGES:2 P2 / 9 P3,0 P1**,全部处理:
  - **P2-1** 提交信息与卡片 3 处仍写 `185 → 190 (+5)`(实测 183 → 190,修复后 191)—— 卡片已改,提交信息 amend。
  - **P2-2** AC4 的 coach PASS 无仓内证据 —— 已按最终内容重跑 coach,逐条验证与内容哈希钉进 AC4;raw transcript 不入库,改用仓内 evidence manifest(sha256)锚定,复跑方式写在 AC4。
  - **P3 全修**:指标口径写明命令;F15 类整文件发现 → reference 改为 `path[:line]`;`review-gates.md` 不再称 wiki 为 canonical taxonomy;AGENTS §10 触发词改主动式;before 改为"无结构化 finding 记录";哈希标注为内容哈希;补 prompt 与运行元数据;wiki 显式声明自身非规范。
  - **P3 记录不改**:`curator scan` 是既有全仓约定(`packages/lythoskill-curator/src/cli.ts` 已明确无 `scan` 子命令),超出本卡范围。
  - **控制缺陷补救**:原 before 与 after2 的 prompt 差一句 REPORT.md —— 用逐字相同的 prompt 重跑 before3(0 条编号 finding / 0 处 `path:line`)。第二次 ZK 复审指出 after2 并非最终构建物,遂用同一 prompt 再跑 after3(最终构建物:13 drift findings + 2 open issues,7/8 finding-classes —— class 7 问到、无实例);受控对照最终为 before3 ↔ after3。
  - **class 3 自检的顺带产出**:用新问题表扫本仓 present-tense 文档,抓到 `cortex/wiki/04-ssot/agent-onboarding-guide.md:13` 仍在写 `81 ADRs / 54 wiki / 25 dailies`(实测 117 ADRs / 130 wiki / 51 dailies,1,773 commits)—— 已改为量级表述(110+/130+/50+;`120+` 也偏高,实测 117 个 ADR),避免再次瞬时过期。

- 2026-10-23 — **user-sim 复审(扮演用户,零上下文)→ yes-with-conditions:2 P1 / 5 P2 / 8 P3**,逐条处理:
  - **P1-1** 提交信息 `c374e473`(重写后 `1be3ff82`)把 **after2** 的数字(15 / 八类全覆盖 / 68 / 43)当成 AC3 受控结果 —— 该提交尚未推送,已用 `git commit-tree` 重写其 message:受控结果改为 before3↔after3 的 13 + 2 / 7 of 8 / 42 / 35,after2 降级为"旁证",并把 `arena host-handoff` 更正为 `prepare-workdir`。**tree 不变,commit sha 因 message 重写而变**(未推送,无外部引用);卡片内引用同步更新。
  - **P1-2** coach PASS 只有摘要、无 raw —— 采用本仓既有约定(见 `2026-07-27-ab-rerun-evidence-manifest.sha256`):raw 留原地,仓内新增 `cortex/wiki/03-lessons/2026-10-23-dreaming-drift-probe-manifest.sha256`,钉住 coach transcript + 两变体构建物 + 8 份产出,`shasum -c` 12/12 OK;AC4 写明复跑方式,不再声称"日志已钉进 AC4"。
  - **P2-1** 最终内容未提交、gate 未跑在最终内容上 —— 本批改完后提交并重跑 `bun scripts/ci-gate.ts`(结果记在下一条)。
  - **P2-2** 实验方法声明与 setup 不一致、命令未持久化 —— transcript 证实实际用的是 `arena prepare-workdir`(非 host-handoff),命令与 deck 形状已写进 AC3;prompt 逐字在 AC3;证据由 manifest 锚定。
  - **P2-3** 新 routine 无机械触发 —— **有意不加**:reference §Sequence 第 4 条("只机械化反复出现的"),且 AC6 明确拒绝通过/失败检查;一个"输出里有没有 findings 段"的形式检查正是本卡 §Output 说的"会被学坏的检查"。触发面是 SKILL.md Phase 3 + AGENTS §10 路由,与 AC2 的设计一致。
  - **P2-4** daily handoff 过期 —— 本会话收尾时按 G-daily-top 覆盖 `daily/2026-10-23.md` 顶部(Ground Truth / Resume)。
  - **P2-5** ZK 审的是不可达提交 —— 已注明 tree 相同(`de353cc7` = `1be3ff82`),内容等价;raw 由 manifest 锚定。
  - **P3 已修**:P3-2 patterns INDEX 的 "W43 引用 1 次" 经复核不成立(W43 只提到本卡),已改正;P3-4 reference class 4 note 与 ADR 排除对齐(换成第 3 处折后未评);P3-5 AC3 注明 Phase 1 刷新是同一次提交里的伴随改动(fixture 无 weeklies,无影响);P3-8 写清 117/130/51 的计数口径。
  - **P3 记账不改**:P3-1 的 `→ Verify:` 已补到 AC1–AC6;P3-3 `last_consolidated: 2026-10-23` 保留 —— 内容确实改为"截至今日为真",而 `zk_validated: false` 未动,如实表达"未做 ZK";P3-6 gate 日志路径在本地,结果已摘要进卡片;P3-7 reference 的 Source 是 provenance note,adopter 环境无该路径属预期。

- 2026-10-23 — **方差复跑(用户要求:"用 zk agent 多 dreaming 几次,看看结果之间是否会有严重漂移")**。同一 fixture、同一 cold pool、同一份构建物、逐字同一 prompt,仅 `<DIR>` 不同;`run2`/`run3`/`run4` 三轮零上下文并行,与受控 `after3` 对比:
  - **召回无漂移**:4/4 轮都找到全部 7 个埋点(列数矛盾、`strict` 假声明、空白折叠、writer/reader 不对称、`titleCase` 无测试、D1 过期、日期测试自指),连我自己的 fixture 预期被纠正的方向也一致(D1 的触发器**已触发**→ stale,而非"不可满足")。语义证据与 settle 动作逐条对应。
  - **形态有漂移**:
    - 输出格式 **3 种**:`### Fn — Class N`(after3/run4)、`## N. 标题 (class N)`(run2)、表格 `| # | Class | Record / line |`(run3)。
    - **run2 全文 0 个 `path:line`** —— 直接违反 reference §Output 的显式契约,但仍找全了缺陷。契约写了,不保证被执行。
    - 条数 13 / 10 / 10 / 10;差异在**粒度**(after3 拆出 util、deferred 索引、year<1000;run4 把 util 并入 class 1/4、把 ADR-006 单列;run2 把 strict 并进 class 3)。
    - **同一事实的 class 标签不稳定**:`strict` = 3 / 4 / 3+4;ADR-003 被 rejected ADR 宣称取代 = class 7(run2/run4)、class 1(run2 §10 另一个面)、run3 完全没做成编号 finding(只在 key-decisions 记录 + 给 ADR-003 追加 status note);card round-trip 测试 = class 8(after3/run2)vs class 7(run3)。
    - **副作用不一致**:3/4 轮新建 `01-patterns/INDEX.md`,run4 明确拒绝并说明理由;1/4 轮(run3)按 reference 允许的方式给 ADR-003 追加 status note,其余未改。**"ADR 逐字节未改"是 after3 这一次的观察,不是 skill 的不变量**;真正的不变量是"ADR 正文不改"。
    - 成本:每轮另行派生 1–2 个嵌套 ZK subagent。
  - **结论**:在"是否找到真相"轴上无严重漂移;在 skill 自己宣称的"结构化、可复跑"轴上,格式与粒度不稳定,`path:line` 契约 1/4 轮未执行。
  - **后续(用户指示)**:对三种表达做了一次美学评估,并在 reference §Output 钉了**示例**(`7b66c36d`):两个 finding(含整文件 placement)+ 逐字段"为什么这么写"。选择的形状 = 标题是断言而非主题、`Record` 单锚点、`Evidence` 是最小证明、`Settle` 指名产物、结尾"asked; no instance"让缺席可见、按 class 排序(severity 是 verdict,本 pass 不输出 verdict)。**不是 schema** —— 正文契约仍是四个字段,示例只降低"知道契约但写成散文"的概率。
  - 原始产出在 `/tmp/drift-probe/{run2,run3,run4}/work/`,未入库;`compare.sh` 复算命令:`cd /tmp/drift-probe && bash compare.sh`。

- 2026-10-26 — **复核"待用户裁决的 5 个判断点"**。用户质疑"把可推导的东西包装成判断了"。第一稿回复写成"全部可从仓内既有规则推导",**经独立复核后修正**:#1 是先于本卡的 accepted ADR,#2–#4 的载体由本卡自己新增(不算"既有"),#5 是一次真实的窄口径校准。修正后的逐条载体:

  | # | 曾被列为"判断点" | 可推导来源 | 载体先于本 pass? | 结论 |
  |---|---|---|---|---|
  | 1 | 折后未评的记账方式(5 处) | `ADR-20260910113730375` §Decision 1(= §Options Option B 的规则原文):折入 diff 非空时,必须在 commit message **与**卡面标注「折后未评」,**写明 delta 范围与旧结论覆盖到哪个 commit**;`cortex task done` 的提示是同一规则的必经路径植入 | ✅ 2026-09-10 accepted | 按 ADR 执行,无需裁决 |
  | 2 | class 7 "问到无实例" | `packages/lythoskill-dreaming/skill/references/drift-detection.md` §Output:结尾 `asked; no instance` 是输出格式的组成部分("makes absence visible") | ❌ 本卡新增 | **规则有效,但不构成"既有规则"** —— 载体是本卡自己写的 |
  | 3 | 拒绝机械化 | 同 reference §Sequence 第 4 条("Only mechanise the ones that keep recurring")+ §Output("findings, never pass/fail verdicts");本卡 AC6 | ❌ 本卡新增 | 同上:是本次确立的契约,不是本次遵守的约束 |
  | 4 | ADR 排除 | 同 reference §Scope("Do not sweep ADRs or other point-in-time records")+ `SKILL.md:149` | ❌ 本卡新增 | 同上 |
  | 5 | manifest-only 证据 | `cortex/wiki/03-lessons/2026-07-27-agents-md-shed-sections-ab-rerun-vocabulary-not-necessity.md` Appendix B(raw 留原地、仓内提交校验和)+ AC4 实测 `shasum -c` 12/12 | ✅ 2026-07-27 | 既有先例 + 一次实测;**"摘要是否足以作为证据"这一层判断确实不在任何载体里** —— 这是唯一真实的、窄口径的判断点 |

  **复核结论(修正版)**:

  - #1 的引用位置先前写错(写成"§决策 2 / §影响"),正确位置是 **§Decision 1**
    —— 该条以一句话重申 §Options Option B 的规则,而"写明 delta 范围与旧结论覆盖
    到哪个 commit"这半句就在其中。
  - #2–#4 的载体是**本卡自己新增的** `drift-detection.md`。因此"全部可从仓内既有
    规则推导"这个说法**过头了**:这三条不是 pass 之前就存在的约束,而是这次 pass
    确立、此后必须遵守的契约。把它们记成"执行了既有规则"会把新写的东西读成旧账。
  - #5 是唯一成立的判断点,但口径很窄:载体给的是"raw 不入库、只钉哈希"的先例,
    **没写**"一份 sha256 manifest 是否足以构成证据"。这一层由 AC4 的 `shasum -c`
    12/12 结案,属于**本次校准**,应当如实记账,不该被并入"既有规则"。
  - **实例核对**:`7b66c36d`(把 finding 格式钉成示例)自己就是 #1 那条规则的
    **半执行**样本 —— message 写了 delta 范围("only the example and its rationale
    are new"),但**没写旧结论覆盖到哪个 commit**(无 sha)。按 ADR-20260910113730375
    §Decision 1 的要求,这是一次不完整的「折后未评」标注;同条 Cons 已经预言
    "只写四个字的标注视为未标注",实际失效点比预言更早:写了范围、漏了 pin。

  **结论**:handoff 里的"待用户裁决"措辞删去 —— 5 项里 4 项有可指称的载体
  (其中 3 项是本卡自己确立的契约,#1 是先于本卡 accepted 的 ADR),第 5 项是
  一次窄口径校准。真正的用户裁决对象是**带代价的取舍**(例:是否把同样的短形式
  移除应用到 `adr`/`epic`,见 `TASK-20261026022014248`),而不是有现成规则可循的
  执行细节。

## Related Files
- `packages/lythoskill-dreaming/skill/SKILL.md`(**源**;Phase 3 = `### Phase 3: ZK Validate`,line 121)
- `packages/lythoskill-dreaming/skill/references/`(新内容的落点;已有 `hermes-dreaming-field-notes.md`)
- `skills/lythoskill-dreaming/`(**生成物 —— 不许手改**;`@lythos/skill-creator build` 做 `{{PACKAGE_VERSION}}` 替换)
- 实例出处:第3类 `skill/assets/TASK-TEMPLATE.md`;第4类 `ADR-20260509170343037`;第5类 `AGENTS.md:164` + `.husky/pre-commit` §0.5 + `adr-relations.ts` 的 `tasks`;第6类 `ADR-20260503003315478` driver 4 与它那个前置被 supersede 的 ADR-C
- 触发本卡的工作:`TASK-20260911080931450`(commits `47fa5f17` / `04c4d376` / `ba652ae0` / `8dceb0e9`)
- Modified: `AGENTS.md`; `packages/lythoskill-dreaming/skill/SKILL.md`; `skills/lythoskill-dreaming/SKILL.md`(build); `cortex/wiki/01-patterns/INDEX.md`; `cortex/wiki/01-patterns/2026-09-11-drift-classes-eight-named-ways-a-project-diverges-from-its-own-record.md`; `cortex/wiki/04-ssot/review-gates.md`(ZK 复审:改为指向 reference); `cortex/wiki/04-ssot/agent-onboarding-guide.md`(class 3 自检:语料计数); this card
- Added: `packages/lythoskill-dreaming/skill/references/drift-detection.md`; `skills/lythoskill-dreaming/references/drift-detection.md`(build); `cortex/wiki/03-lessons/2026-10-23-dreaming-drift-probe-manifest.sha256`(探针/评审证据锚点)

## Git Commit Message
```
feat(dreaming): drift-detection pass over present-tense docs (TASK-20260911093602710)

- Phase 3 runs eight named cheap questions; the operational list lives in
  references/drift-detection.md, body grows 183 -> 191 lines
- scope: present-tense docs only; ADRs are point-in-time, refresh on encounter
- code-side proxy is the test suite; output is findings, not verdicts
- coach round 1 -> 2: reference is the single carrier, wiki keeps the discovery
  record + pointer (the old duplicate table was itself class 1)
- AC3 controlled pair (before3 <-> after3, arena prepare-workdir + zero-context
  subagents, identical prompt): before 0 numbered findings / 0 path:line; after
  13 drift findings + 2 open code issues, 7 of 8 classes (class 7 asked, no
  instance), 42 path:line occurrences (35 unique); ADRs byte-identical.
  An earlier build (after2) reported 15 / all eight / 68 / 43 - a corroborating
  run on different content, not the controlled result.
```

## Notes
- **本卡不建全库审计** —— 那是完美主义。它建的是一组**便宜到 grep 级**的问题,以及一个**明确的产物类型**。
- 第 6 类是本卡唯一无法用测试辅助的,**也是最容易被忽略的** —— 它需要一个 deferred 决策的清单,而那份清单本身现在没有读者。
