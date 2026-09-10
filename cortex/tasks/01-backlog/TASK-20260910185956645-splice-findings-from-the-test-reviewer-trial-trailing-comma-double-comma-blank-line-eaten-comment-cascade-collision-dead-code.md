# TASK-20260910185956645: splice findings from the test-reviewer trial - trailing comma double-comma, blank line eaten, comment-cascade collision, dead code

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-09-10 | Created |

## Background & Goals
<!-- ⚠️ REQUIRED: Why is this task needed? What problem does it solve? Empty = shell, blocked by probe. -->

来源:第三段闸的对照试验(`TASK-20260910181747676`)。两名**只从规格 + 代码**写测试的评审者
(一个零上下文、一个角色特化 side deck)各自报出了实现/规格层面的真实问题 —— **它们不是"抓到了回归",
是"写测试时撞上来的"**,所以比分数值钱。逐条如下,均已复现:

1. **legacy 数组带尾逗号时插入产出双逗号**:`skills = [\n "a/b",\n]` + 插入 → `, "c/d"]`。
   被结果护栏拦下(失败向安全),但**违反本 ADR 的总则**("写入器的语法 = 读取器的语法"):
   读取侧合法的形状,写入侧写不了。
2. **删掉一个 key-value 时会吃掉一行空行**:`max = 1\n\n[combo.x]` → `max = 1\n[combo.x]`。
   规格的**机制**("至多 2 个行尾序列")要求它,而规格写下的**目的**("让接缝仍是一行空行")在这里没达到 ——
   **机制与目的不一致**,属 ADR 澄清题,不是纯实现题。
3. **注释规则与级联规则在规则⑤上相撞**:⑤ 清空内联 map → 空的 `[tool]` 被删 → 夹在 `[tool]` 与 `skills` 键之间
   的注释随合并区间一起被删,与「节点范围外注释一行不删」冲突。
4. **死代码(差分证明)**:`cutOne` 的"前置逗号"分支与后面的回收循环**完全冗余**;`skillsShape` 里那个裸文本
   `startsWith` 探针的**结果从未被消费**(`tables` 与 `absent` 走同一条路)—— 讽刺的是那个裸文本比较正是模块头
   注释警告的**静默收窄语法**反面教材,**只因为它是死的才无害**。
5. **非 ASCII alias 插入**返回 `would-corrupt`(裸 `γ` 作键非法):与"宁拒不写坏"一致,但可能是**潜在限制**
   —— **待判**:是否有真实用户需要非 ASCII alias?按"先问这个边界有没有用户"的纪律,先不修。

## Requirements
<!-- ⚠️ REQUIRED: List specific requirements. Keeping placeholders = shell. -->
- [ ] **①** legacy 数组带尾逗号时,插入要么正确产出(把尾逗号与新增项处理好),要么给出**针对该形状**的明确错误
      (不是笼统的 `would-corrupt`)—— 与总则一致
- [ ] **②** 决定"删 key-value 时该不该保留接缝的空行":是改实现(保留),还是改 ADR 的**目的**表述(承认机制优先)?
      **先改规格再改代码**(规格是 normative)
- [ ] **③** 注释与级联相撞有明确裁决并写进 ADR(哪条规则优先、以及在哪些形状上)
- [ ] **④** 清掉两处死代码(`cutOne` 前置逗号分支 / `skillsShape` 未消费的裸文本探针)——
      其中第二处是"静默收窄语法"的反面教材,删掉它同时消掉一个坏示范
- [ ] **⑤** 判定非 ASCII alias 是否需要支持:需要 → 实现;不需要 → 在 ADR/注释里写明"已知不支持 + 为什么"
- [ ] 每一条都要有**判别性测试**(改回去即红)—— 试验里已经写出过能抓住它们的测试,可直接借用

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

**②③ 是 ADR 澄清题,①②④⑤ 是实现题** —— 混合卡,但都以 `ADR-20260910152957509` 为规格;
**若 ② 的结论是"机制优先"**,那要改的是 ADR 的目的表述(规格是 normative,先动规格再动代码)。

**纪律复用**:试验产出的两份测试(`playground/2026-09-10-test-reviewer-trial/shape{A,B}.*.test.ts`)
已经能抓住其中若干条 —— **先看它们抓的是哪几条**,能借用的借用,不重写一遍。
测试值基线:`deck` 292 pass / 1 skip / 0 fail @ Bun 1.3.11 / macOS(改动前)。

## Acceptance Criteria
<!-- ⚠️ REQUIRED: Testable acceptance criteria. Keeping placeholders = shell. -->
- [ ] **AC1** ①-⑤ 每条都有结论(修 / 明确不修 + 理由),结论写进本卡 Notes
- [ ] **AC2** 凡"修"的,都有一条**判别性测试**(改回去即红,实测过变异)
- [ ] **AC3** ② 的结论若改了 ADR 表述,ADR 的 Status History 追加一行(规格是 normative)
- [ ] **AC4** `bun test packages/lythoskill-deck/` 保持 `0 fail`;④ 删死代码后不减少覆盖

## Progress Log
<!-- Update during execution, with timestamps -->

## Related Files
- Modified:
- Added:

## Git Commit Message
```
feat(scope): description (TASK-20260910185956645)

- Detail 1
- Detail 2
```

## Notes
