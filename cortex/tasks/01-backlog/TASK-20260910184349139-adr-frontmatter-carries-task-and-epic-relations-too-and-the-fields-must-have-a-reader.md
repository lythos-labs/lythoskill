# TASK-20260910184349139: ADR frontmatter carries task and epic relations too - and the fields must have a reader

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-09-10 | Created |

## Background & Goals
<!-- ⚠️ REQUIRED: Why is this task needed? What problem does it solve? Empty = shell, blocked by probe. -->

ADR 的顶部 frontmatter(2026-09-10 引入)先承载**取代关系**(`supersedes` / `superseded_by`),
本次扩到**与 task / epic 的关联**(`epic` / `tasks`)—— 理由同一个:`## Related` 那一段是给人读的,
而 agent 读不出"这份 ADR 属于哪个 epic、由哪张卡实现"。

**流程记账(如实)**:这一笔**已经先落地了**(模板 + 解析 + 读者 + 测试),本卡是事后补的 ——
按 `AGENTS.md`"非平凡改动先开卡",这次是**先改代码后开卡**。不粉饰:这类"卡在事后"正是本仓反复修的失效模式,
记在这里而不是悄悄补一张看起来合规的卡。

**更要紧的一半:字段必须有读者。** 没人读的字段是装饰(本日同类教训:声明的形状 ≠ 生效的形状) ——
所以 `findLinkedEpic()` 改成**先读 frontmatter**、没有才回退正文正则(老 ADR 因此**不需要回填**),
并由判别性测试钉住(把 frontmatter 分支去掉即红,实测 1 红)。

## Requirements
<!-- ⚠️ REQUIRED: List specific requirements. Keeping placeholders = shell. -->
- [x] ADR 模板顶部 frontmatter 增 `epic` / `tasks`(与 `supersedes` / `superseded_by` 并列)
- [x] `parseRelations()` 解析/回写这两项(纯函数 + 测试)
- [x] **有读者**:`findLinkedEpic()` 先读 frontmatter,再回退正文正则
- [x] 判别性测试:frontmatter 优先 / 正文回退 各一条(去掉 frontmatter 分支即红)
- [x] 文档落点:skill 参考 `template-guide.md`(SOURCE,已重建)
- [ ] **未做(已在 `TASK-20260910184110804` 里)**:`probe` 尚未校验"superseded 目录下的 ADR 必须带非空
      `superseded_by`" —— 规则写了但无守卫会漂

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

**这是实现,不是架构决策** —— 沿用已定的 frontmatter 约定与既有解析层,判据 C1-C6 不命中,不引 ADR。
**纪律复用**:解析与回写在 `lib/adr-relations.ts`(纯函数,字符串进字符串出);`findLinkedEpic` 只做
"先读 frontmatter、再回退"的取舍 —— **不在调用点另写一套解析**(否则又是"同一处理解的第二份抄写")。

**踩到并值得记的坑**:用机械替换插入模板字段时**打偏**过一次(命中的是 task 模板而不是 ADR 模板),
而插进去的 YAML 注释里带**反引号**,直接把 TS 模板字面量**截断**成语法错误 —— 由 `bun build` 抓到。
教训不是"小心点",而是:**模板字面量里的注释也是代码**(反引号与 `${}` 都会截断它)。

## Acceptance Criteria
<!-- ⚠️ REQUIRED: Testable acceptance criteria. Keeping placeholders = shell. -->
- [x] **AC1** `createAdrTemplate()` 顶部含四项 frontmatter;task 模板不受影响
- [x] **AC2** `findLinkedEpic()` 在 frontmatter 有 `epic` 时返回它(即使正文写着另一个)
- [x] **AC3** 无 frontmatter 的老 ADR 仍从正文解析(回退路径保住,无回填需求)
- [x] **AC4** `bun test packages/lythoskill-project-cortex/` 全绿(147 pass / 0 fail @ Bun 1.3.11 / macOS)

## Progress Log
<!-- Update during execution, with timestamps -->

## Related Files
- Modified:
- Added:

## Git Commit Message
```
feat(scope): description (TASK-20260910184349139)

- Detail 1
- Detail 2
```

## Notes
