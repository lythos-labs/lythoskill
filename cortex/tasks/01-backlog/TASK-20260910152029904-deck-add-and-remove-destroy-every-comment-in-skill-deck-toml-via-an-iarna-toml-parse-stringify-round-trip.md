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

**owner 定调(2026-09-10)**:「**那说明是解法有问题。参考类似 package.json 等的实际管理做法吧**」

即:**问题不在"选哪个库",在"用对象序列化器去写一份带注释的声明式文件"这个解法本身** ——
`parse → 改对象 → stringify` 天生只认对象里的东西,注释与既有格式不在对象里,所以必然被丢弃。
换一个有同样模型的对象序列化器不会有任何改善。

**成熟做法(这就是答案的形状)** —— 共同原则是**编辑"文档",不是编辑"对象"**:
工具只动它被要求动的那一部分,其余逐字保留。

| 参照 | 做法 |
|---|---|
| **Cargo**(`cargo add` / `cargo remove` 改 `Cargo.toml`) | 用 `toml_edit` —— **格式保留编辑**:注释、空白、键序、行内注释全部保留。TOML 生态里对这件事的标准答案 |
| **Poetry**(改 `pyproject.toml`) | 用 `tomlkit`,同一思路(保存注释与格式) |
| **npm**(改 `package.json`) | JSON 无注释,但它走的是弱一档的同一原则:**检测并保留缩进与行尾**(`@npmcli/package-json`),而不是拿默认格式化重写;且只重排它自己要管的段 |

**因此选项重排(原表的最优项已作废)**:

| | 做法 | 判定 |
|---|---|---|
| **(a)** | **格式保留编辑**(与 Cargo / Poetry 同形) | **首选**。JS/TS 生态的候选:①`@taplo/lib`(taplo 是 Rust `toml_edit` 同族,WASM 形态);②自写行级编辑器(无新依赖,代价是必须自己处理 TOML 边界情形)` |
| **(b)** | 继续 `@iarna/toml` 对象序列化 | **已判定为错**(本卡的成因),不再作为候选;换同类库同理 |
| **(c)** | 只保留缩进/行尾(npm 的弱式) | **不够**:这份文件的人类文档载体正是注释,保不住注释等于没解决 |

**怎么实现 (a)(owner 追加指示 2026-09-10:「可能需要配合 ast 操作」)** —— 两个动作分开:

1. **定位用 AST,不用正则、不用目视**:在 TOML 的语法树里找到 `[tool.skills.<alias>]`
   这个 table 节点(以及 `add` 时要插入的位置)。正则/行匹配会被多行字符串、内联表、
   引号里的 `#` 骗到 —— 那正是"启发式当规格"的老毛病(`feedback_heuristic_is_not_spec`)。
2. **写回用范围替换**:取该节点的 `range`,对原文做**字节级 splice**;文件其余部分逐字不动
   —— 注释、空行、键序、缩进全部天然保留,因为根本没被重写过。

对应的两个实现族:

| | 形态 | 取舍 |
|---|---|---|
| **(a1)** | **无损语法树编辑器**:`@taplo/lib`(taplo 的内核就是 lossless syntax tree + DOM 编辑,与 Rust `toml_edit` 同族) | 最贴近 Cargo/Poetry 的做法;代价 = 新依赖(WASM) |
| **(a2)** | **AST 取 range + 自行 splice**:`toml-eslint-parser` 或 tree-sitter-toml 拿节点范围,只替换那段 | 依赖更轻/可复用既有工具链;代价 = splice 逻辑(缩进、空行、块边界)得自己维护并测 |

两者共同点:**结构化定位 + 逐字写回**。核心不是"用哪个库",是**不把整份文档重新序列化**。

**决策落点**:选 (a) 的 ① 意味着**引入新依赖**并**改变声明式真源的写入方式** ——
命中判据 C1-C6(新依赖 / 改变既有机制)→ **须先落 ADR 再改实现**,本卡只引用该 ADR。
选 ② 是把"格式保留"变成自己维护的实现,同样应在 ADR 里写明为何不走成熟库。

**相关**:
- 复现命令(留档,可直接重跑):造一个带注释与 `also_link_to` 的 deck,`deck remove <alias>` 后 `diff`。

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

## Git Commit Message
```
feat(scope): description (TASK-20260910152029904)

- Detail 1
- Detail 2
```

## Notes
