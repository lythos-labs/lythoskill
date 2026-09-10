# TASK-20260910181747676: test-review gate trial - expert-role side deck reviews the tests, optionally a live inbox-outbox red-green pairing

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-09-10 | Created |
| in-progress | 2026-09-10 | Started |
| review | 2026-09-10 | Deliverables committed |

## Background & Goals
<!-- ⚠️ REQUIRED: Why is this task needed? What problem does it solve? Empty = shell, blocked by probe. -->

测试是**第三个评审对象** —— 它最容易被漏掉,因为"测试都绿了"看起来就是做完了。
`zk-review.md` 的 §第三段:测试闸 立了原则(owner 2026-09-10),但**机制没有实测**:
评审者是否做成 side deck、是否走 inbox/outbox 实时 PK、哪套组合有效,都还没跑过。

**为什么需要**:**作者身份是判别力的敌人。** 本轮实证:`TASK-20260910152029904` 的实现闸里,
作者给自己每条修复写的测试,"把修复改回去"时**一片绿**(三条修复实为摆设:一条死代码、
一条判据换错方向、一条根本没有判别性测试);而**没写这段代码的**评审者用同一批变异,
一轮就点出三条。仓内既有记录同形:*「测试与实现出自同一处理解时,测试不是独立的第二意见,
是同一处理理解的第二份抄写。」*

**边界(owner 明确)**:评审者**可以有项目知识**(熟悉本仓约定更准),但**不能把被测代码当自己写的**。
知识独立与作者独立是**两件事** —— 与本仓 B6 那条"独立要分层写"同源。

**本卡的范围**:把原则变成**可复跑的流程**,并实测哪套形态真的提高判别力 —— 不是再造一套理论。

## Requirements
<!-- ⚠️ REQUIRED: List specific requirements. Keeping placeholders = shell. -->
- [ ] **组一个"测试评审者" deck 并跑通**(**机制已有**:`arena single --deck <path> --brief "<任务>"` ——
      命令行指定 deck、独立跑,不需要造新东西);候选素材:`lythoskill-sober` 质询 /
      `lythoskill-coach` 规则 / `tdd` + `lythoskill-red-green-release` 红绿
- [ ] **判别力对照实验**:同一批代码,分别让①作者②零上下文 agent③专家角色 side deck 写测试,
      用**同一套变异**打,记录各自抓住几条 —— 判据是**抓住数**,不是"测试数量"
- [ ] **inbox/outbox 实时 PK 形态**(若时间允许):一方写红、一方让它绿,逐轮对打;
      明确它**取代还是补充**按轮收敛的形态
- [ ] **driver skill 评估**:"不断追问"类 skill(如 matt 的 `grill-me`)在 PK 里是否真的提高暴露率,
      还是只是变吵
- [ ] **落地**:结论写回 `zk-review.md` §第三段(把"待试"改成实测结论),或写清为什么放弃

## Technical Approach
<!-- ⚠️ REQUIRED: Implementation plan, key decisions, references. Empty = shell, blocked by probe.

     ⚠️ A DECISION DOES NOT BELONG IN THIS SECTION. If this card introduces or
     changes an abstraction, a module boundary, a package boundary, a named
     concept, or a closed data set — that is an architectural decision, and it
     must be recorded in an ADR. This section may only REFERENCE that ADR; it
     must never be the only record. A one-line statement of intent gives a
     reviewer nothing to object to: no options to reject, no rejected
     alternative to question. Two same-shape incidents (feed-adapters.ts 2026-05,
     adapter-registry.ts 2026-09) both rode in exactly this section.

     Prepare it first, in full:  bunx @lythos/project-cortex adr "<decision-title>"
     Criteria (hit >= 2 of C1-C6): AGENTS.md § Decision Records -->

**它是什么**:把"测试闸"从原则(评审者不能是作者)变成**可复跑流程**,并给出**判别力**的实测数字。

**它不是什么**(写清以免范围蔓延):不是重写 ZK Review 协议、不是引入新工具链、
不是要求所有卡都加第三段闸 —— 先在一张卡上跑通再谈推广。

**机制现状(别把它读成"尚不存在")**:这条链是本项目**刻意搭的**"结合点":
①`deck` 负责**目标位置**(`working_set` / `also_link_to` 把任意技能集扇出到任意目录,symlink / snapshot 两种模式);
②**CLI 能指定技能目录**(`deck per-run <cli>` 渲染 `--skills-dir` / `skill-path` 一类参数)。
两者相加 = **给一个 agent 任意技能集、放在任意房间、完全不动主工作集** —— 这正是 side deck 评审者要的形态。
`arena single --deck <path> --brief "<任务>"` 只是这条链上的一个封装,**直接跑 CLI 命令行同样可以**。
**缺的是组合与数字**,不是能力。
**房间**:临时跑在 `playground/<date>-<slug>/` 开一个小 room(gitignored),**不污染本仓** ——
这是沙箱纪律问题,不是代码问题(`arena single` 写 cwd 是正确行为)。候选形态:
1. **单角色 side deck**:deck 声明"专家角色 + 需要的 skill",评审者据此写/审测试;
2. **对抗 pairing**:inbox/outbox 两方,红绿对打(需要确认 inbox/outbox 当前是 local skill 的状态);
3. **追问驱动**:`grill-me` 一类持续追问的 skill 作为驱动,检验它是否把"我没验"逼出来。

**验收焦点**:判据一律是**"变异下抓住几条"**,不是"写了多少条测试" —— 后者是本卡要修的失效模式本身
(`TASK-20260910110545092` 的 B5:裸计数会漂移)。

## Acceptance Criteria
<!-- ⚠️ REQUIRED: Testable acceptance criteria. Keeping placeholders = shell. -->
- [ ] **AC1** side deck 评审者的调用方式可复跑(写进 `zk-review.md` 或该 deck 的 README,含实际命令)
- [ ] **AC2** 对照实验有数字:作者 / 零上下文 / 专家角色 三者各自在**同一套变异**下抓住几条
- [ ] **AC3** 结论落回 `zk-review.md` §第三段:要么把"待试"改成实测结论(含数字与环境),
      要么写明放弃的理由
- [ ] **AC4** 若采用 PK 形态:说明它与按轮收敛的关系(取代 / 补充),以及何时用哪个
- [ ] **AC5** 不引入新工具链依赖;不要求其他卡改造(先单卡跑通)

## Progress Log
<!-- Update during execution, with timestamps -->

- 2026-09-10: **试验跑完:形态 A(零上下文)vs 形态 B(角色特化 side deck),同一份代码、同一套变异。**
  房间 `playground/2026-09-10-test-reviewer-trial/`(side deck = `tdd` + `lythoskill-red-green-release` + `diagnose`
  经 `deck link` 扇进 `.claude/skills/`,评审者被指向那个目录)。两份测试都**不许读**已有测试,各自从规格 + 代码写。

  **打分(唯一可比的尺子:本卡自带的 5 条变异,先验证变异真的生效、先跑基线)**:A `5/5`、B `5/5` —— **平手**。
  - **阴性结果,如实记**:"专家角色 deck"在这个场景**没有**表现出更高的判别力,所以**不能**用"抓得更多"主张它的正当性。
  - 各自的**自**变异数(A 63 抓 62、B 57 抓 55)**不可互比** —— 变异集不同;A 还用差分模糊证明了那 1 条是等价变异体,
    B 用 1248 组 A/B 差分证明了那 2 条是**冗余代码**(见下)。
  - 成本也相当(两者都是分钟级、token 量同级)。

  **两者真正不同的地方(记下,不折算成分数)**:
  - **B 能点名"哪个 skill 推动了哪个决定"**(A 不能):`diagnose` 的"先建一个能变红的回路"→ 它**先**搭变异 harness,
    把"能红"当成交付物;`tdd` 的"反同义反复"→ 全部期望值**手推字面量**、不取快照;`red-green` 的禁用词
    (`final/done/fix/ok`)→ 测试名写成规格陈述,且在变异真红之前**拒绝**声明已验证。A 也做了变异自测,
    但那是**收尾时的自证**,不是**开工前的交付物定义** —— **同一个终点,不同的路线**。
  - **发现的性质不同**:A 报的是"注释规则与级联规则在⑤上相撞"与"非 ASCII alias 插入返回 would-corrupt"(潜在限制);
    B 报的是**规格与目的的张力**与**死代码**(下条)。

  **副产品(比分数值钱):两份测试合计报出 5 条真实发现,全部可执行**:
  1. **legacy 数组带尾逗号时插入会产出双逗号**(`[ "a/b",\n]` + 插入 → `, "c/d"]`)→ 被结果护栏拦下(失败向安全),
     但**违反总则**("写入器的语法 = 读取器的语法"):读取侧合法的形状,写入侧写不了。(B)
  2. **删掉一个 key-value 时会吃掉一行空行**(`max = 1\n\n[combo.x]` → `max = 1\n[combo.x]`):
     规格的**机制**("至多 2 个行尾序列")要求它,但规格写下的**目的**("让接缝仍是一行空行")在这里没达到 ——
     **规格的机制与目的不一致,值得回 ADR 澄清**。(B)
  3. **注释与级联相撞**:⑤ 清空内联 map → 空的 `[tool]` 被删 → 夹在 `[tool]` 与 `skills` 键之间的注释随合并区间一起被删。
     与 ADR「范围外注释一行不删」冲突。(A,两份都故意没钉成"正确")
  4. **死代码(差分证明)**:`cutOne` 的"前置逗号"分支与后面的回收循环完全冗余;`skillsShape` 里那个裸文本
     `startsWith` 探针的**结果从未被消费**(`tables` 与 `absent` 走同一条路)—— 讽刺的是那个裸文本比较
     正是模块头注释警告的**静默收窄语法**反面教材,**只因为它是死的才无害**。(B)
  5. **非 ASCII alias 插入**返回 `would-corrupt`(裸 `γ` 作键非法):与"宁拒不写坏"一致,但可能是潜在限制。(A)

  **未执行的一项(写明,不假装完成)**:inbox/outbox 的**实时 PK 红绿**形态没跑 —— 本轮只跑了
  "单角色 side deck vs 零上下文"这一对;PK 是**另一个假设**(对抗式配对是否提高暴露率),留给下一轮。

  **结论(第三段闸该怎么落地)**:原则(**评审者不能是作者**)有效且已被本日实证;但 **deck 组合的正当性在于
  "注入方法并让它可归因"**,不在于"抓得更多" —— 本轮同尺打平。要把"更高判别力"作为主张,需要**更大的靶子与更多轮**,
  不能靠这一次。**5 条发现已分流**:②属 ADR 澄清,①③④属实现修复,⑤待判(是否有真实用户需要非 ASCII alias)。

## Related Files
- 决策载体:**ADR-20260910181957316**(两段闸门;本卡是它 Follow-up 里的第三段闸实测项)
- 原则已落:`packages/lythoskill-project-cortex/skill/references/zk-review.md` §第三段(SOURCE,已重建)
- Modified:
- Added:

## Git Commit Message
```
feat(scope): description (TASK-20260910181747676)

- Detail 1
- Detail 2
```

## Notes
