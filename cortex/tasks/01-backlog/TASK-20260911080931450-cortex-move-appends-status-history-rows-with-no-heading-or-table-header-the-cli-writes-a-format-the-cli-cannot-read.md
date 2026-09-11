# TASK-20260911080931450: cortex move appends Status History rows with no heading or table header - the CLI writes a format the CLI cannot read

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-09-11 | Created |

## Background & Goals
<!-- ⚠️ REQUIRED: Why is this task needed? What problem does it solve? Empty = shell, blocked by probe. -->

**CLI 写出的格式,CLI 自己读不出来。** 这条由**另一个会话**发现并交给我复核(它做的是只读 onboarding,
只把它当成我 handoff 里"第一顺位观察项"的答案),我逐条实测确认:

| 环节 | 代码 | 行为 |
|---|---|---|
| 写 | `move.ts:126-129`(`appendStatusHistory`) | 卡片**没有** `## Status History` 段时 → `content + '\n\n| status | date | note |\n'`,即一行**裸行**:无标题、无表头 |
| 读 | `probe.ts:220`(`extractStatusHistory`) | 要求 `/##\s+Status\s+History\s*\n/` → 没有标题就 `{ lines: [], hasSection: false }` |
| 结果 | `probe` | 报 **"Status History 为空或无记录,无法验证。请人工确认真实状态并补充历史。"** |

**实跑复现**:`TASK-20260909010058114` 在今天被我 `task start` → `task review` 之后,**card 尾部多了两行裸行**,
probe 从 12 → **13 条**,且这 13 条里**恰好 1 条**是"需人工确认"的 status issue —— 就是它。

**为什么是"类"而不是"一次"**:任何**不是由 `template.ts` 生成**的卡(手写的、arena 跟进的、外部 ingest 的)
只要走状态就中招 —— 它没有 `## Status History` 段,于是 append 走裸行分支。旁证:09-09 那张 arena 卡
(`TASK-20260909010058114` …… 更正:09-09 的 arena 卡,**peer 报告**)中过同一次,当时的 executor
手工把表补上并留了说明 —— 即**人肉修过,而机制没修**。

**同族的第二种形态**(`move.ts:144-146`):段**存在**但**没有表头行**时,追加的行同样不带表头行 ——
不过这一种**仍能被解析**(`hasSection: true`),所以它只掉信息、不掉可读性。两处一起修。

**为什么值得单独一张卡**:这写的是**每张卡的状态历史** —— 状态机的记录层。它在最不该出错的地方
(所有卡的状态流转都经过它)产生了一个**只有 probe 能看见**的缺陷,而 probe 的措辞("请人工确认真实状态")
把**机制的问题**说成了**卡的问题**,于是修的方向会被带偏成"手工补表"。

## Requirements
<!-- ⚠️ REQUIRED: List specific requirements. Keeping placeholders = shell. -->
- [ ] `appendStatusHistory` 在**无** `## Status History` 段时,写入**完整**结构:
      `\n## Status History\n<!-- machine-parseable table: directory = current status, last row = latest record -->\n\n| Status | Date | Note |\n|--------|------|------|\n| … |`(与 `template.ts` 的形态逐字一致)
- [ ] 在**有段但无表头行**时,追加的表头行 + 数据行成对出现(`move.ts:144-146` 同族)
- [ ] 大小写/空格形态与 `template.ts` 对齐 —— **写入端与读取端用同一份形状定义**,不是各写一遍
      (否则又是"同一处理解的第二份抄写")
- [ ] 判别性测试:对一张**手写的、没有 Status History 段**的卡走一次 `task start` →
      `extractStatusHistory()` 必须返回 `hasSection: true` 且 `lines` 含新状态(**改回去即红**)
- [ ] 回归:已有卡的形态不被改写(读取端仍认旧卡);`probe` 全库复跑**不新增**任何 status issue
- [ ] 顺带核对:**是否还有别的写端**在无段时追加(如 `epic`/`adr` 的 move 路径)—— 同族一次收口

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

**这是实现修复,不是架构决策** —— 判据 C1-C6 不命中(不改抽象/边界/命名/封闭数据集),故不引 ADR。

**根因一句话**:写入端的分支(`无段 → 裸行`)与读取端的判据(`必须见标题`)从来没有被放在一起看过。
**修法的纪律**:两端共用**一份**形状(标题 + 表头 + 分隔行 + 数据行),而不是在写端再抄一遍——
本仓已经为"同一处理解的第二份抄写"付过代价(测试与实现同源)。

**测试落点**:`appendStatusHistory` 目前是 `move.ts` 的私有函数。优先用**CLI 集成**测
(造一张手写卡 → `task start` → 读回),而不是为测它把私有函数导出 —— 导出会把内部形状变成契约,
而这里的契约是**文件形态**。

## Acceptance Criteria
<!-- ⚠️ REQUIRED: Testable acceptance criteria. Keeping placeholders = shell. -->
- [ ] **AC1** 手写一张无 `## Status History` 段的卡 → `task start` → `extractStatusHistory()` = `{ hasSection: true, lines: [..., 'in-progress'] }`
- [ ] **AC2** 该卡经 `probe` **不再**出现在"需人工确认"里;全库 status issue 计数回到本次变更前的值
- [ ] **AC3** 判别性:把写端改回裸行 → AC1 的测试**红**(实测过变异,不是声称)
- [ ] **AC4** 旧卡(有标题、有表头)流转后形态不变 —— 现有测试全绿
- [ ] **AC5** 同族第二形态(有段无表头)一并收口,并有对应断言

## Progress Log
<!-- Update during execution, with timestamps -->

## Related Files
- `packages/lythoskill-project-cortex/src/commands/move.ts`(写端:126-129 无段分支 / 144-146 无表头分支)
- `packages/lythoskill-project-cortex/src/commands/probe.ts`(读端:220 `extractStatusHistory`)
- `packages/lythoskill-project-cortex/src/lib/template.ts`(**形状的出处** —— 修完两端要与它对齐)
- 发现者:另一个会话(只读 onboarding),把根因与实测交给本会话复核;本卡由本会话登记
- Modified:
- Added:

## Git Commit Message
```
feat(scope): description (TASK-20260911080931450)

- Detail 1
- Detail 2
```

## Notes
