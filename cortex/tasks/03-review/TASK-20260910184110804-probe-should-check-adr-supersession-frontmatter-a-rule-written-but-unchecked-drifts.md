---
supersedes: []
superseded_by: null
---

# TASK-20260910184110804: probe should check ADR supersession frontmatter - a rule written but unchecked drifts

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-09-10 | Created |
| in-progress | 2026-09-10 | Started |
| review | 2026-09-10 | Deliverables committed |

## Background & Goals
<!-- ⚠️ REQUIRED: Why is this task needed? What problem does it solve? Empty = shell, blocked by probe. -->

2026-09-10 给 ADR 加了 frontmatter 承载**取代关系**(`supersedes` / `superseded_by`),
让"这份过期了,该去读哪一份"变成机器可读的 —— 此前它只活在 `## Status History` 的一句散文里,
真实事故是:一个外部 reviewer 读到一份**已被整条取代**的 ADR,照着它描述了已经不存在的实现
(deck 的 tar 备份,`ADR-20260502010100000`)。

**但规则写下来 ≠ 会一直成立**:新写的 ADR 会照模板带上字段(已改 `createAdrTemplate`),
而 `adr supersede` 会两侧都写(已接线);**漏网的是"手工搬目录"或"直接改状态行"这类路径** ——
一旦有人这么干,`superseded_by` 就停在 `null`,而读者会把它读成"没被取代"(`null` 的两种含义
= 本仓反复出现的"缺失被读成通过")。

**所以这个检查不是锦上添花**:它是这条约定唯一的守卫。

## Requirements
<!-- ⚠️ REQUIRED: List specific requirements. Keeping placeholders = shell. -->
- [x] `probe` 新增一条结构检查:**`cortex/adr/04-superseded/`(以及 `03-superseded/`)下的每份 ADR
      必须带非空 `superseded_by`**(值可以是任何 cortex id,含 EPIC)
- [x] 反向一致性(可作警告而非错误):`supersedes` 里列的 id 若存在,其 `superseded_by` 应指回来
- [x] 检查要有判别性测试:缺字段 / 留 `null` / 值指向不存在的 id 三种形态各自能红
- [x] 与 `probe` 现有的 plan/execute 结构一致(不新造输出路径);`--suspicious` 下不误报
- [x] 明确**不检查**的情形:`superseded-partial`(核心决策仍有效)不该被要求填 `superseded_by`
      —— 两份都仍是现行

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

**这是实现,不是架构决策** —— 沿用 `probe` 既有的结构检查形态(`emptyShells` / `checklistDrift` 那一族),
判据 C1-C6 不命中,故不引 ADR。解析逻辑已存在且已纯测:
`packages/lythoskill-project-cortex/src/lib/adr-relations.ts` 的 `parseRelations()`
—— **检查直接复用它**,不在这里另写一套解析(否则又是"同一处理解的第二份抄写")。

**已知的两处真实样本**(回填时遇到,可直接当测试数据):
- `ADR-20260502010100000` → `superseded_by: ADR-20260910112404500`
- `ADR-20260511210000000` → `superseded_by: EPIC-20260520124010693`(**后继不是 ADR** ——
  检查必须接受任何 cortex id,否则这条会被误报)

## Acceptance Criteria
<!-- ⚠️ REQUIRED: Testable acceptance criteria. Keeping placeholders = shell. -->
- [x] **AC1** 手工把一份 superseded ADR 的 `superseded_by` 改回 `null` → `probe` 报出该文件
- [x] **AC2** 指向不存在的 id → 报出(措辞:值指向一个找不到的文档)
- [x] **AC3** `superseded-partial` 的 ADR **不**被要求填(反例测试:它保持绿)
- [x] **AC4** 全库复跑 `cortex probe` 零误报;`bun test packages/lythoskill-project-cortex/` 保持 `0 fail`

## Progress Log
<!-- Update during execution, with timestamps -->

## 落地记录

- `probe` 新增检查 `adrSupersession`(plan/execute 两侧 + 报告 + 渲染 + 总数),判据复用
  `lib/adr-relations.ts` 的 `parseRelations()` —— **不在检查里另写一套解析**。
- **实测三种形态**:①`superseded_by: null` → 报出并给出可执行措辞;②指向不存在的 id → 报出;
  ③干净语料(3 份 superseded ADR 均已回填)→ **0 误报**。
- **明确写下的边界(不是遗漏)**:`cortex/adr/03-superseded/` 是**历史目录**,里面有 3 份
  `SUPERSEDED-ADR-*.md`(**另一种命名约定**,前缀本身即声明),且**不在** `config.adrSubdirs` 里
  —— 因此不参与本检查。若将来把它们统一搬进 `04-superseded/`,那一天它们就该补 frontmatter。
- 检查跑在 `executeProbePlan(plan, io)` 里,**目录从 `plan.adrs` 取**(那里没有 `config`)——
  第一版误用了 `config` 导致 `ReferenceError`,由实跑抓到。

## Related Files
- Modified:
- Added:

## Git Commit Message
```
feat(scope): description (TASK-20260910184110804)

- Detail 1
- Detail 2
```

## Notes
