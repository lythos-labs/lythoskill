# TASK-20260910160707856: deck add --dry-run crashes with a TDZ ReferenceError before it can print the plan

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-09-10 | Created |

## Background & Goals
<!-- ⚠️ REQUIRED: Why is this task needed? What problem does it solve? Empty = shell, blocked by probe. -->

`deck add <locator> --dry-run` —— 一个**有文档的 flag** —— 会在打印计划之前就崩:

```
ReferenceError: Cannot access 'alias' before initialization
```

**根因(读码确认,静态可判)**:`add.ts:283` 在 `dryRun` 分支(:260 起)里用了 `alias`,
而 `alias` 声明在 `:371`(`const alias = rawAlias`)。同一函数作用域内的 TDZ ——
`--dry-run` 走到那一行必然抛,与该 deck 的内容无关。

**来源**:`TASK-20260910152029904` 的实现 ZK review(对象 `c4e75ec7`,log 在
`showcase/2026-09-10-zk-reviews/904-impl-round1.md`)。review 判定为**先前存在**
(在 `ddddcb16^` 同样可复现),故不在那张卡的范围里 —— 单独记,不夹带。

**为什么不是小事**:`--dry-run` 的用途正是"**动手之前先看清单**" —— 而它恰恰在看清单这一步崩。
用户会以为 dry-run 成功了(或以为 deck 有问题),而真正的动作根本没被执行到判断。

**同类的第二处(2026-09-10,ZK review 实测发现,先前存在)**:`deck remove` 在一个**读取器读不了的 deck**
(实测:含多行内联表 —— `@iarna/toml` 拒、`toml-eslint-parser` 收)上,抛的是**原始 iarna 栈**,
而不是一条说明。已在 `ddddcb16^:remove.ts:87` 复现(**与本卡同因**:崩在"本该给消息"的地方)。
两处一起修:`remove` / `add` 的解析失败都走同一条 catch → 三件套消息(是什么 / 为什么 / 怎么修),
不把栈直接甩给用户。

## Requirements
<!-- ⚠️ REQUIRED: List specific requirements. Keeping placeholders = shell. -->
- [ ] `deck add <github locator> --dry-run` 打印计划并 **exit 0**,不抛 TDZ
- [ ] `alias` 在 dry-run 需要它之前就有值(`rawAlias` 的解析顺序要在 `dryRun` 分支之前),或 dry-run 分支改用已有的中间量
- [ ] 回归测试:`--dry-run` 走通一次(不联网:用现有 IO seam 打桩),断言不抛且输出含计划
- [ ] 顺带核对:`--dry-run` 的输出是否仍与真实执行将要做的**一致**(它是"计划",计划与实际分叉就是另一类失效)

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

**这是实现缺陷,不是架构决策** —— 不涉抽象/边界/命名/封闭数据集,判据 C1-C6 不命中,故本卡不引 ADR。

改法二选一,倾向 (a):
- **(a) 把 `alias` 的确定提前到 dry-run 分支之前**:`rawAlias`/`@skill` 覆盖的解析不依赖冷池或网络
  (读的是 locator 字符串),所以顺序可以前移,`dry-run` 与真实执行共用同一份 alias 决定
  —— 顺带保证"计划"与"实际"不会再分叉(见 AC4)。
- **(b) dry-run 分支改用已有的中间量**(若 `:283` 只用到 `fqPathBefore` 派生的别名)。

**不要**用 try/catch 把一个 TDZ 包起来 —— 那只是把"崩"换成"计划里少一行"。

相关:`add.ts:260`(dry-run 分支起点)、`:283`(使用点)、`:371`(声明点)。

## Acceptance Criteria
<!-- ⚠️ REQUIRED: Testable acceptance criteria. Keeping placeholders = shell. -->
- [ ] **AC1** `deck add <locator> --dry-run` 不抛 `ReferenceError`,退出码 0
- [ ] **AC2** 输出含它该有的计划内容(目标 section / alias / path / clone 或复用判定)
- [ ] **AC3** 一条测试钉住:dry-run 路径走通(IO 打桩,不联网)
- [ ] **AC4** dry-run 与实际执行的 alias 决议一致(同一个来源,不是两份推导)

## Progress Log
<!-- Update during execution, with timestamps -->

## Related Files
- Modified:
- Added:

## Git Commit Message
```
feat(scope): description (TASK-20260910160707856)

- Detail 1
- Detail 2
```

## Notes
