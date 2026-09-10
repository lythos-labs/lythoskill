# TASK-20260910152029904: deck add and remove destroy every comment in skill-deck.toml via an iarna-toml parse-stringify round trip

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-09-10 | Created |

## Background & Goals
<!-- ⚠️ REQUIRED: Why is this task needed? What problem does it solve? Empty = shell, blocked by probe. -->

**实测(2026-09-10,独立复现,非推断)**:`deck remove` 之后 `skill-deck.toml` 里**所有注释消失**。

```diff
 [deck]
+# KEEP ME: a human comment that must survive   ← 改动前存在
 max_cards = 10
-also_link_to = [".agents/skills", ".kimi/skills"]
+also_link_to = [ ".agents/skills", ".kimi/skills" ]   ← 未触碰的键也被重排
```
第二次复现里 `# section comment for skill-b` 与 `[tool.skills.skill-b]` 一起消失 ——
即 **`deck remove` 会删掉整个文件的所有注释**,不管那一条是否与被删的技能有关。
`deck add` 同路径(`add.ts:445` / `:468`)。

**根因**:`remove.ts:152` 与 `add.ts:445/468` 都走
`parseToml(raw)` → 改对象 → `stringify`(`@iarna/toml`)→`writeFileSync`。
注释不在解析出来的对象里,序列化器自然写不回来;数组间距由序列化器决定。

**为什么值得修**(不是"少了几行字"):
- `skill-deck.toml` 是本项目的**声明式真源**,而且是 **git-tracked、进 diff、进评审**的
  —— 这正是 B18 那条"静默的出处必须可追溯"依赖的前提。
- 注释是这份文件的**人类文档**:本仓自己的 `skill-deck.toml` 用注释解释 `cold_pool` /
  `working_set` / `also_link_to` 各自是什么。一次 `deck remove` 就会把它们全删掉。
- 删除注释之后,diff 里会出现一个**与本次操作无关的整体重排** ——
  评审者必须把一大片噪音判为"正常"。**噪音正是真改动藏身之处**(与 B8/B20 同一族:
  输出没有如实说明它做了什么)。
- **定性边界**:丢的是注释与格式,**不是技能数据**;技能、冷池、symlink 都不受影响。
  所以这不是 data-loss 级,是"文档与 diff 信噪比"级。

来源:执行 `TASK-20260910110545092` 的 B19 收口、真跑 `also-link-to-bdd` 时由
task agent 报出(它把"TOML 被加了内层空格"列为 anomaly),随后在本卡独立复现并扩大范围。

**两次观察都指向同一处,且第一次自我判轻了**(值得留档):
- task agent 的 decision-log 里对这一条的结论是 *"cosmetic only, no semantic change,
  no action needed"* —— **在不该收口的地方收了口**:它看到的是数组空格,没往下看注释;
  而"格式变了"与"文件里的人类文档没了"是两件事。
- BDD 裁判独立撞到同一条,并在 `judge-verdict.json` 的 summary 里点名了这次误判
  ("without noting the comment loss")。两次独立观察 → 本卡成立。

## Requirements
<!-- ⚠️ REQUIRED: List specific requirements. Keeping placeholders = shell. -->
- [ ] `deck remove` 后,文件中**未被本次操作触碰**的注释逐字保留(byte-identical)
- [ ] `deck add` 后同上
- [ ] 未被触碰的键**不改写格式**(`also_link_to = [".a", ".b"]` 不得变成 `[ ".a", ".b" ]`)
- [ ] 被删/被加的那一条**确实**按预期改动(现有语义不变:deny-by-default、归属判定)
- [ ] 测试:带注释的 deck → add/remove → 注释与未触碰键逐字比对(bun 实测,不靠目视)
- [ ] `migrate-schema` 是否同病需一并核实(它也是重写 deck 的路径)

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

**决策已落 ADR,本节只引用(不得是唯一记录)**:

> **ADR-20260910152957509** — *deck declaration writes must touch only the bytes they are about:
> locate with an AST, splice back by range, never re-serialise the document*

一句话:定位用语法树(不用行/正则),写回只替换**这次操作所关于的那段字节**,其余逐字不动 ——
注释与格式的保留因此是**结构性结果**,不是需要维护的特性。被拒选项与实测数字都在 ADR 里。

**为什么不是"换个库"**:根因是**用对象图重写整份文档**这个解法(`parse → 改对象 → stringify`),
注释不在对象里,换任何同模型的对象序列化器都不改善(owner:「**那说明是解法有问题**」)。
成熟做法(owner:「**参考类似 package.json 等的实际管理做法**」):Cargo 用 `toml_edit`、Poetry 用
`tomlkit` 做格式保留编辑;npm 改 `package.json` 走弱一档的同一原则(保留缩进/行尾,只重排自己要管的段)。

**实测候选(不是听说)**:

| 候选 | 体积 | 结果 |
|---|---|---|
| `@taplo/lib` 0.5.0 | **35.6 MB** unpacked(WASM) | 未采用(为一次删/加键拉 35 MB 与"影响最小化"冲突) |
| `toml-eslint-parser` 1.0.3 | **86 KB** + 1 依赖 | 逐 table 给出精确字节区间 |
| AST 定位 + 区间 splice | — | 对本仓真实 deck:删一个 table → 注释 **9→9**、前后缀**逐字节相同**、reparse 通过、接缝复原原有空行样式 |

**本卡要做的事**(规格表在 ADR 的 Decision 节):`remove.ts` / `add.ts` 的写回路径改走 splice;
核实 `migrate-schema` 是否同病;测试钉三件事 —— ①注释逐字保留 ②未触碰键格式不变
③**无变化时不写文件**(mtime 不变)。

## Acceptance Criteria
<!-- ⚠️ REQUIRED: Testable acceptance criteria. Keeping placeholders = shell. -->
- [ ] **AC1** 带注释的 deck → `deck remove <alias>` → `diff` 只显示被删的那一块,**无其他行变化**
- [ ] **AC2** 带注释的 deck → `deck add <locator>` → 同上
- [ ] **AC3** 回归测试钉住:注释保留 + 未触碰键格式不变(新增测试文件或并入现有 deck toml 测试)
- [ ] **AC4** 现有语义零回归:`bun test packages/lythoskill-deck/` 保持 `0 fail`,归属判定相关测试全绿
- [ ] **AC5** `migrate-schema` 的同类风险有结论(修 / 明确不修 + 理由)

## Progress Log
<!-- Update during execution, with timestamps -->

## Related Files
- Modified: (执行时填)
- Added: (执行时填:测试 + 可能的行级编辑实现)
- 相关:`packages/lythoskill-deck/src/remove.ts:152`、`src/add.ts:445/468`
- 相关卡:`TASK-20260910110545092`(发现来源)、`TASK-20260910111600389`(归属语义,本卡不动)
- 相关 ADR:`cortex/adr/01-proposed/ADR-20260910152957509-*.md`(本卡的决策载体)、`ADR-20260910112404500`(所有权判据,同向)

## Git Commit Message
```
feat(scope): description (TASK-20260910152029904)

- Detail 1
- Detail 2
```

## Notes
