# ADR-20260910152957509: deck-declaration-writes-must-touch-only-the-bytes-they-are-about-locate-with-an-ast-splice-back-by-range-never-reserialise-the-document

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-09-10 | Created |

## Background
<!-- ⚠️ REQUIRED: Problem description and context. Empty = shell, blocked by probe. -->

`deck add` 与 `deck remove` 会**摧毁 `skill-deck.toml` 里的全部注释**,并重排它们没被
要求改的键。实测(2026-09-10,两次独立观察 + 本 ADR 复现):

```diff
 [deck]
+# KEEP ME: a human comment that must survive   ← 操作前在
-also_link_to = [".agents/skills", ".kimi/skills"]
+also_link_to = [ ".agents/skills", ".kimi/skills" ]   ← 没被要求改的键也被重排
```

**根因**:`remove.ts` 与 `add.ts` 走 `parseToml(raw)` → 改对象 → `stringify`(`@iarna/toml`)
→ `writeFileSync`。注释不在解析出来的**对象**里,序列化器自然写不回来;格式由序列化器决定。
**换任何有同样模型的对象序列化器都不会改善** —— 问题不在库,在**用对象图重写整份文档**这个解法。

**为什么值得单独决策**(不是"少了几行字"):
- `skill-deck.toml` 是本项目的**声明式真源**,且 **git-tracked、进 diff、进评审** ——
  B18 那条"静默的出处必须可追溯"正依赖于此(静默的出处就是这份文件)。
- 注释是它的人类文档:本仓自己的 `skill-deck.toml` 用注释解释 `cold_pool` / `working_set` /
  `also_link_to` 各自是什么。一次 `deck remove` 就会把它们全删掉。
- 删除注释之后,diff 里出现一整片**与本次操作无关的重排**:评审者必须把一大片噪音判为"正常",
  **噪音正是真改动藏身之处**。
- **同一份文档里还有一条更硬的依据**:`ADR-20260910112404500` 规定 deck 只删**它能证明是自己
  创建的**东西。注释是**用户写的**,deck 从未创建它们 —— 按同一条判据,deck 无权删除它们。
  这不是比喻:两处错用的是同一个错误(把"我能写这个文件"当成"文件里的东西都是我的")。

**定性边界**:丢的是注释与格式,**不是技能数据**;技能、冷池、symlink 都不受影响。
不是 data-loss 级,是"文档与 diff 信噪比"级 —— 但它同时是所有权级。

## Decision Drivers
<!-- ⚠️ REQUIRED: Why does this decision need to be made? -->

1. **最小影响(owner 定调)**:「**目的很明显,影响最小化。参考 package json 等会用的做法**」
   —— 一次写操作应当只改动它**这次操作所关于的**那部分字节。
2. **成熟做法就是"编辑文档,不是编辑对象"**:Cargo(`cargo add/remove`)用 `toml_edit`、
   Poetry 用 `tomlkit`,都是**格式保留编辑**;npm 改 `package.json` 走的是弱一档的同一原则
   —— **检测并保留缩进与行尾**,只重排它自己要管的段,而不是拿默认格式化重写全文。
3. **判据不能是启发式**:用行/正则去找 `[tool.skills.x]` 会被多行字符串、内联表、引号里的
   `#` 骗到(`feedback_heuristic_is_not_spec`)。**定位必须由语法结构给出**(owner:可能需要
   配合 ast 操作)。
4. **写回必须是最小 splice**:只替换被定位的那段字节,其余逐字保留 —— 这样"注释保留"不是
   一个需要单独维护的特性,而是**不重写就不会丢**的必然结果。
5. **不为此拉进重量级依赖**:候选实测 `@taplo/lib` 0.5.0 unpacked **35.6 MB**(WASM);
   `toml-eslint-parser` 1.0.3 **86 KB** + 1 个依赖。为一份 CLI 的声明式文件写入拉进 35 MB
   运行时依赖,是"影响最小化"的反面。
6. **无变化就不写**:操作若没有实际改变,不应重写文件(npm 的同类行为)—— 保住 mtime,
   也让"文件变了"永远意味着"内容真的变了"。

## Options

### Option A — 维持对象序列化重写(现状)

**Pros**: 零改动。
**Cons**: 就是本条要修的缺陷;且**它不是"库选错了"**,任何对象图序列化器都会丢注释。

### Option B — 换用无损文档编辑器库(如 `@taplo/lib`)

**Pros**: 与 Cargo / Poetry 同形,最"标准答案";库自身就是语法树 + DOM 编辑。
**Cons**: unpacked **35.6 MB**(WASM),为一次删/加键而引入;供应链与新依赖面的代价
与"影响最小化"直接冲突。**Rejected**,理由是不可量化的收益对可量化的成本。

### Option C — AST 定位 + 字节区间 splice(**Selected**)

用一个小解析器拿到节点区间(实测 `toml-eslint-parser` 86 KB;逐 table 给出精确 range),
把**要改的那一段字节**替换掉,其余不重写。

**Pros**:
- 注释与格式的保留是**结构性结果**,不是需要维护的特性。
- 定位来自语法结构,不受多行字符串/内联表/引号内 `#` 影响。
- 依赖面小;实现是一条纯函数:`(src, 操作) → src'`,可单测、无需文件系统。
**Cons**: splice 逻辑(边界、分隔空行、插入点)得自己定义并测 —— 见 Decision 的规格表。

### Option D — 不再写文件:输出补丁/heredoc 交给 agent 应用(**Deferred,不是 rejected**)

本项目已有先例(cold-pool `prune` 输出 `rm` 脚本供审计,不自己删)。它把"影响"降到
零写入,代价是 UX 变成两步、且脚本化调用要跟着改。
**Deferred 的理由**:C 能满足需求且不改变现有契约;若 splice 的边界情形开始堆积,
这里就是回退点。**记录在此以防下个 agent 把它当新想法重提。**

### Option E — 禁止在 deck 里写注释 / 文档化"别写注释"

**Pros**: 零代码。
**Cons**: 让**工具去限制真源的表达**,而本仓自己的 deck 就是注释密集的 —— 自相矛盾。
**Rejected**。

## Decision
<!-- ⚠️ REQUIRED: Explicit choice + rationale. Keeping placeholders = shell. -->

**Choice**: **Option C —— AST 定位,字节区间 splice;永不重序列化整份文档。**

**Rationale**: 把"注释要不要保留"从**特性列表**降级成**结构必然**。只要不重写整份文档,
就不存在"注释丢了"这个 bug 类别;剩下的只是"删哪几个字节"的规格问题,而那是可以写清、
可以测的。

### 规格(实现即照此,测试即钉此)

| 项 | 规则 |
|---|---|
| 定位 | 解析成 AST,按 **key 文本**匹配顶层 table 节点(`tool.skills.<alias>`);**不用行/正则匹配** |
| 删除的区间 | `[node.range[0], node.range[1])`,**再加**紧随其后的一段换行,最多吞 2 个(`\n\n`)—— 让接缝处仍是一行空行,与文件原有分隔样式一致 |
| 不删的东西 | **注释一行都不删**(包括紧贴在块上方、看起来属于它的注释)。理由同 `ADR-20260910112404500`:注释是用户写的,deck 没有创建它,就没有删除它的授权。要清就走 `remove` 之后由用户/agent 自己删 |
| 插入(新增) | 插到**最后一个同前缀 table 之后**,`\n\n` + 新块;无同前缀者 → 文件末尾 |
| 不动的部分 | 其余全部字节:注释、空行、键序、缩进、行尾、其他 table 的写法 |
| 无变化则不写 | 操作若未改变内容,不写文件(保住 mtime;"文件变了"恒等于"内容变了") |
| 幂等 | 同一操作重复执行,内容不变(第二次是 no-op,连写入都不发生) |
| 失败即不写 | 解析失败 / 定位不到目标 → 报错退出,**绝不**退回"整份重写" |

### 实测(2026-09-10,对本仓真实 `skill-deck.toml` 3416 字节)

| 操作 | 结果 |
|---|---|
| 删 `tool.skills.diagnose` | 注释 **9 → 9**;前缀与后缀**逐字节相同**;重解析通过;目标键消失、邻居键不受影响 |
| 接缝 | 复原为文件原有的 `…"

[next]` 样式,不留多余空行 |
| 插入 `tool.skills.new-skill` | 落在最后一个 `tool.skills.*` 之后;注释 **9 → 9**;重解析通过且新键在场 |

（对照:`@taplo/lib` 35.6 MB unpacked / `toml-eslint-parser` 86 KB —— 体积数据来自
`npm view`,非估算。）

## Impact
<!-- ⚠️ REQUIRED: Positive / negative / follow-up. Empty = shell, blocked by probe. -->

- **Positive**:
  - "写 deck 不会动我的注释"成为**不改写就没有的故障类**,而不是靠复查守住的性质。
  - diff 回到"只显示这次操作":评审者不必再训练自己忽略噪音 —— 噪音区正是真改动藏身处。
  - 与 `ADR-20260910112404500` 的所有权判据同向:两处都在拒绝"我能写这个文件 ⇒ 文件里的东西都是我的"。
  - `(src, 操作) → src'` 是纯函数,测试不需要文件系统(同 B9 的教训)。
- **Negative**:
  - splice 的边界规格(尤其"接缝空行")要自己定义并测 —— 好在规格短、可枚举、可断言。
  - 解析失败时**必须报错而不是退回重写**:少了一条"总能成功"的兜底路径,这是刻意的。
- **Follow-up**:
  - `packages/lythoskill-deck/src/remove.ts` 与 `add.ts` 的写回路径改走 splice(**本 ADR 的落地**)。
  - `migrate-schema` 也是重写 deck 的路径,需核实是否同病并一并处理。
  - 测试:带注释的 fixture deck → `add`/`remove` → 断言①注释逐字保留 ②未触碰键格式不变
    ③无变化时不写文件(mtime 不变)。
  - 卡:`TASK-20260910152029904`(本 ADR 由它派生;卡的 Technical Approach 只引用本 ADR)。

## Related
- Related ADR: **ADR-20260910112404500**(删除边界是所有权) —— 本条是它在**写入**方向的同一条判据。
- Related ADR: **ADR-20260910113730375**(claims-not-scores / 证据卫生)—— "文件变了"必须恒等于"内容变了"。
- Related Task: `TASK-20260910152029904`(toml 注释被摧毁;发现于 `TASK-20260910110545092` 的 B19 收口)。
<!-- ^ Follow-up work of an ALREADY-ACCEPTED ADR is carried by THIS ADR — do not open a
     separate card for it. Tick the item here and write the commit sha next to it.
     A card is for work that needs its own criteria / plan / owner decision; an accepted
     ADR's follow-up is that ADR's own consequence, and the ADR is where the next agent
     will look for it. Boundary + the 2026-09-10 evidence: writing-guide.md →
     "An accepted ADR carries its own follow-up" (ADR-20260910113534807 § 5). -->

