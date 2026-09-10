# TASK-20260909155425927: assurance-column investments — revalidation, conformance, constraint composition

## Status History

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-09-09 | Created from wedge-path research synthesis (P4) |

## Background & Goals

Expert peer-review round 2 (skill economics) established: with registry/transport
given (thin pattern), every open infra problem for SURVIVING skill classes
(covenant-SOPs, private incident pitfalls, coordination protocols, anti-default
discipline, env-coupled procedures, taste) sits in the assurance column — evidence
attachment, re-validation/staleness, conformance, activation governance,
attribution. Discovery/curator search is optimized for the asset class depreciating
fastest (capability-transfer skills), so curator stays minimal by economics, not
just ideology. This card tracks the rising-marginal-value investments.

User framing (2026-09-09): the surviving class is enterprise KB + SOP + business
condensed into skill form; the underlying variable is determinism vs
hallucination/improvisation. Assurance infra IS determinism infra.

Source: cortex/wiki/02-research/2026-09-09-wedge-path-research-synthesis.md §A/§E.

## Requirements

- [ ] Staleness/revalidation machinery (elementary form): extend curator's index-
      staleness HATEOAS warning toward capability-decay hints — frontmatter
      maintenance date + model-generation tag; full form (arena as depreciation
      audit triggered by model-upgrade events) specified but scheduled separately
- [ ] Conformance testing for coordination protocols: contract verification
      (does the counterparty satisfy the protocol — JSON-Schema/OpenAPI analogy);
      deck already has deny-by-default admission, lacks counterparty checks
- [ ] Constraint-composition conflict detection ADR: when a deck holds multiple
      anti-default skills + covenant gates, overrides can contradict. Capability-
      composition dependency resolution was correctly rejected (article argument);
      constraint composition is a different, unowned problem (npm/git/harness all
      no). ADR candidate — argue first, implement only on accept
- [ ] Curator minimalism confirmation: L3-first strategy unchanged; no discovery-
      layer ranking investment (record the economic argument in the ADR above or
      a wiki note so future sessions don't regress)

## Technical Approach

- Start with the elementary staleness form (metadata + warning) — cheap, immediate
- Conformance: specify the contract format before building (interface-first:
  mental model → DSL → schema → prototype)
- Constraint-composition ADR must cite: round-2 Q2 table, rejected-alternatives
  discipline (record why dependency-resolution shape is wrong for this), and the
  one place a genuinely NEW mechanism is legitimate per the expert review
- Keep curator changes minimal per the economics argument

## Acceptance Criteria

- [ ] Skill frontmatter carries maintenance/provenance fields; curator surfaces
      decay hints with a dormancy test (happy path emits no false warnings)
- [ ] Conformance contract format has a written spec before any implementation
- [ ] Constraint-composition ADR exists in 01-proposed with the expert-review
      citation; accept/reject recorded
- [ ] No new discovery/ranking machinery merged

## Progress Log

- 2026-09-09: card created from synthesis P4.

- 2026-09-11: **计划闸(零上下文 reviewer,对象 pin `b1176e10`)= 5 HIGH / 6 LOW,不放行**。
  log 逐字:`/tmp/zk-assurance-plan-round1.md`(**待入仓**)。判决:**需要重写计划,不是打补丁**。
  它抓到的分量最重的一条值得单独记:
  - **本卡承载了必须落 ADR 的决策,却只给 4 项里的 1 项排了 ADR**。item 1(`buildSkillMeta` 的硬编码字段集 +
    "decay hint" 这个新命名概念)命中 **C1/C2/C4**;item 2("conformance contract format")命中 **C1/C2/C3**。
    而**本卡正是那篇 ADR 所写事故的同胞**:`ADR-20260910113534807` 点名的事故 2(`adapter-registry.ts`)
    与本卡出自同一次综合、同一个 commit(`a7b830d3`)、**相隔一秒** —— 即"规则已经存在,而它的同胞卡仍在重犯"。
  - 其余 HIGH:`counterparty` **没有主语也没有宿主**(源文里它指*agent 对等方*,而本仓没有那一层);
    "lacks counterparty checks" 不准确(`deck validate --remote` 已在查存在性与 sha256 漂移),且**无视已有契约载体**;
    一项 AC **已经是真的**(无法失败);decay-hint 未对冷池里**实测 975 份 `SKILL.md`** 定界 →
    最可能的实现会刷出约 975 条 warning,正是本卡自己写的 dormancy 条款要防的那个失效。
  - **放行的六个条件**(全部机械可做):①把卡收敛到 item 1 并写清 必达/可选/不做;②先补缺的 ADR;
    ③AC 写成"命令 + 期望输出",并用**真实冷池抽样**做 dormancy fixture;④点名宿主 + 站点 + `deck_` 前缀的可选字段 + 阈值;
    ⑤把 conformance 收敛为"复用某一个具名既有载体";⑥修 commit-message 存根、补 Q2 表路径、删掉无据的"scheduled separately"、填 `## Related Files`。
    之后剩余项均降为 LOW;**重写幅度 = 新计划**,改完要**重跑闸**。

## Related Files
- Modified:
- Added:

## Git Commit Message
```
docs(cortex): assurance-column investments card — revalidation, conformance, constraint-composition (TASK-20260909155425927)

- Rising-marginal-value column per expert round-2 Q2 (surviving skill classes)
- Elementary staleness form first; full depreciation audit scheduled separately
- Constraint-composition ADR candidate: the one legitimately new mechanism
```

## Notes
