# TASK-20260910181747676: test-review gate trial - expert-role side deck reviews the tests, optionally a live inbox-outbox red-green pairing

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-09-10 | Created |
| in-progress | 2026-09-10 | Started |

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
- [ ] **side deck 形态实测**:用 deck 组合出一个"测试评审者"角色(候选素材:`lythoskill-sober` 质询 /
      `lythoskill-coach` 规则 / `tdd` + `lythoskill-red-green-release` 红绿),给出可复跑的调用方式
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

**候选形态(待实测,不是选型结论)**:
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
