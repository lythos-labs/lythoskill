# ADR-20260910152957509: deck-declaration-writes-must-touch-only-the-bytes-they-are-about-locate-with-an-ast-splice-back-by-range-never-reserialise-the-document

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-09-10 | Created |
| accepted | 2026-09-10 | Accepted |
| accepted | 2026-09-10 | 追加 Round-1 ZK review 的三处 HIGH:写入语法必须等于读取语法 / 偏移单位是 UTF-16 code unit / 两处规格行更正 —— 见 § Round-1 修正 |

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

### Option C — AST 定位 + 文本区间 splice(**Selected**)

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

**Choice**: **Option C —— AST 定位,按文本区间(UTF-16 code unit)splice;永不重序列化整份文档。**

**Rationale**: 把"注释要不要保留"从**特性列表**降级成**结构必然**。只要不重写整份文档,
就不存在"注释丢了"这个 bug 类别;剩下的只是"删哪几个字节"的规格问题,而那是可以写清、
可以测的。

### 规格(实现即照此,测试即钉此)

> **本表是唯一规格**。下一节 `## Round-1 修正` 是**历史**(它记录了为什么变成现在这样),
> 与本表冲突时**以本表为准**。第一版**全文**里那几处措辞(规格表的单条定位规则、`\n\n`、
> 强制 mtime 测试;以及 Choice 行与 Option C 标题里的"字节区间")都已被本表与上文取代,
> 不要在实现时回读它们 —— 见 ZK review 指出"过期措辞散落在正文各处,不在同一张表里"。

**总则:写入器的语法 = 读取器的语法。** 少支持一种形状 = 静默收窄语法,
其表现是"昨天还能跑的 deck 今天报错"。定位不到不是降级,是**报错并说明它看到了什么形状**。

| 项 | 规则 |
|---|---|
| 定位(删除) | 解析成 AST,**按 key 文本**匹配;**不用行/正则匹配**。按序尝试三条:<br>**①** `[tool.skills.<alias>]` table 节点<br>**②** `[tool.skills]` 表**内部**该 alias 的 key-value 节点(`foo = { path = … }`)<br>**③** legacy `[tool] skills = [...]` 数组里的那个元素节点<br>三条都不命中 → 报错退出 |
| 删除的区间 | `[node.range[0], node.range[1])`,**再加**紧随其后的一段行尾,最多 **2 个字符或 2 个行尾序列**(取先到者)—— 让接缝仍是一行空行,与文件原有分隔样式一致。**按字符数而不是只找 `\n`**:CRLF 下 node 之后是 `\r`,只找 `\n` 会一个都不吞,留下 `\r\n\r\n\r\n` 残渣 |
| 注释 | 节点**范围之外**的注释一行都不删(包括紧贴块上方那条看起来属于它的);节点**范围之内**的注释(块内键值之间的那种)随节点一起走 —— 它就是那个块的一部分。理由同 `ADR-20260910112404500`:范围外的注释是用户写的,deck 没有创建它就没有删它的授权 |
| 空容器级联 | 与现有对象层行为**逐字一致**(`remove.test.ts` C11.b 钉着其中一段):`skills` 空 → 删 `skills` 键;section 随之空 → 删 `[<section>]` 表头。规则 ③ 删空数组时同理;规则 ② 删空 `[tool.skills]` 表时**递归套用同一条级联** |
| 插入(常规) | 插到**最后一个同前缀 table 之后**,分隔符 + 新块;无同前缀者 → 文件末尾。**新块不带结尾换行**(分隔由文档自己的空行提供);分隔符**复制文件自己的行尾** |
| 插入(legacy 数组 section) | **判据按 section 定,不按整个 deck 定**:该 section 用的是数组形态(`[<section>] skills = [...]`,无 `[<section>.skills.*]` 节点)时,能否追加取决于**这次操作是否携带字符串表达不了的东西** —— 至少两类:①`source` 等额外字段;②**自定义 `--alias`**(alias 是 TOML 的**键**,数组里只能由 `basename(path)` 推出,所以 `--alias custom` 会被静默写成 `basename`)。**表达得了 → 追加字符串元素**(alias 须等于 basename);**表达不了 → 报错并点名 `deck migrate-schema`**,并在错误里说明**克隆已经落在冷池**,`migrate-schema` 之后重试不需要重新下载。**绝不**在数组形态旁新增表(实测 `Defining a key multiple times is invalid`:那是把 deck 写坏)。section 由**各路径自己的解析**得出(插入侧 `add.ts` 的 `skillType`,删除侧 `remove.ts` 的 `match.type` —— 不是同一个变量),**示例里的 `tool` 只是例子**。报错时**点名它看到的 locator / ref** —— 只传了 `#v1` 这类字符时,消息要与原因对得上 |
| 数组内剩余元素的间距 | **不重排**。删元素会留下 `skills = [ "b"]` 这类残留空格,**刻意保留** —— 任何整理都是重写 |
| 不动的部分 | 其余全部字节:注释、空行、键序、缩进、行尾、其他 table 的写法 |
| 无变化则不写 | **守卫,不是可测行为**:两条命令要么改内容、要么在写之前退出(实测:查找失败时文件逐字节不变)。故**不强制为它写测试**(它今天没有触发路径) |
| 重复执行 | 重复 `remove` = **exit 1**(找不到 alias)且不写文件 —— **不是** no-op 成功 |
| 失败即不写 | 解析失败 / 定位不到目标 → 报错退出,**绝不**退回"整份重写" |
| 尾部残渣 | 删除的是文件**最后一个**节点时,尾部的空行块不额外整理(留 `\n\n\n` 也不动):整理 = 重写 |

### 实测(2026-09-10,对本仓真实 `skill-deck.toml` —— 3416 **code unit** / 3439 **字节**)

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

## Round-1 修正(2026-09-10,零上下文 ZK review 的三处 HIGH + 若干 LOW)

review log 逐字留档:`showcase/2026-09-10-zk-reviews/904-plan-round1.md`(它 pin 的也是 `6ac2324d`)。
结论是:**本规格只写了"happy shape"** —— 它给"一个 skill 就是 table 节点 `tool.skills.<alias>`"
定了语法,而它要替换的代码还接受**另外两种形状**,规格把它们静默丢掉了,其中一种还有绿的测试
钉着旧行为。三处 HIGH 全部接受并修,规格新增/更正如下。

### H1 + H2 的根因是同一个,所以用同一条规则收口

| | |
|---|---|
| **新规则(写入语法 = 读取语法)** | 写入器必须接受**当前 CLI 能读的每一种形状**;少支持一种就是**静默收窄语法**,而收窄会以"昨天还能跑的 deck 今天报错"的形式出现。定位不到不是"降级",是**报错并说明看到了什么形状** |

据此,§规格 的「定位」一行展开为**三条定位规则**,按序尝试:

| # | 形状 | 定位对象 | 删除动作 |
|---|---|---|---|
| 1 | `[tool.skills.<alias>]`(本仓与文档的常态) | 该 table 节点 | 删节点 + 至多一个空行分隔 |
| 2 | `[tool.skills]` 下的**内联条目** `foo = { path = … }` | 该 **key-value** 节点 | 删 key-value 及其所在行 + 至多一个空行分隔 |
| 3 | **legacy 数组** `[tool] skills = ["…"]` | 数组里的那个**元素**节点 | 删元素 + 相邻逗号 |

**空容器级联(必须与现有对象层行为一致,`remove.test.ts` C11.b 钉着其中一段)**:
`skills` 空了 → 删掉 `skills` 键;section 随之空了 → 删掉 `[<section>]` 表头本身。
这条级联是**文本级**照做的,不是"重写文件"的借口 —— "永不重序列化整份文档"在这条路径上同样成立。

**H2 的正面回答**:那条绿测试(C11.b:删掉最后一个数组元素后文件不再含 `skills = [`)在本规格下
**仍然绿**,因为"删掉 `skills = [...]` 这个 key-value"由规则 3 + 级联完成,不需要退回整份重写。
原规格"定位不到就报错、绝不退回重写"与它**不矛盾**;矛盾的是原规格**没有规则 3**。

### H3 偏移单位:UTF-16 code unit,不是字节

解析器给的 `range` 是 **JS 字符串下标(UTF-16 code unit)**,不是字节偏移。实测:本仓 deck 的
`[tool.skills.lythoskill-red-green-release]` 在 AST 里是 **1674**,而它的字节偏移是 **1686** ——
差 12,来源就是上一段 `role =` 里的 `→`。

- **规格更正**:"按 AST 给的下标在**字符串**上切片;文件按 UTF-8 **文本**读入,全程不碰 `Buffer`。"
  (现有代码本来就是 `readFileSync(p, 'utf-8')`,所以这是**措辞陷阱而非必然故障**;但措辞必须对。)
- **本文档的数据更正**:前文"对本仓真实 `skill-deck.toml` 3416 字节"应为
  **3416 code unit / 3439 字节** —— 3416 恰好是 code unit 数,这个巧合本身就是当初写错单位的原因。
- **配套测试**:fixture 必须**含非 ASCII 字符**,断言未触碰的前缀/后缀**逐字节相同**。
  纯 ASCII fixture 会让这条永远绿着骗人。

### LOW 级更正(同批)

| 项 | 更正 |
|---|---|
| 插入块的行尾 | 插入的块**不带结尾换行** —— 分隔由文档自己的空行提供(`\n\n` + 块 → 恰好一行空行) |
| 换行风格 | 插入用的分隔符**复制文件自己的行尾**(从插入点相邻字节判定);被删区间永远消费文件自己的字节,所以删除路径在两个风格下都对(实测:吞 2 个字符在 CRLF 下恰好是 `\r\n`)。**不给 CRLF 单独建测试**(本仓与非本仓都没有 CRLF deck,不为不存在的用户建规则),但规则写明,免得静默混行尾 |
| "无变化则不写文件" | **降级为守卫,并撤回对其强制测试的要求**:两条命令要么改内容、要么在写之前就退出(实测:查找失败时文件逐字节不变)。它今天是"没有触发路径的守卫",不是可测行为 |
| 幂等一行 | 原写"重复执行内容不变"不够准:**重复 `remove` 是 exit 1(找不到 alias)且不写**,不是 no-op 成功 |
| `migrate-schema` | 同病(`migrate-schema.ts` 也是 `stringify` + `writeFileSync`),但它只在 `deprecated` 的 legacy deck 上跑,且写前留 `.bak.<ts>`。**那个 `.bak` 不构成不修的理由** —— 它与已被退役的 tar 备份同类("假的安全承诺");但本条是否纳入由卡片处置并记录结论 |

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

