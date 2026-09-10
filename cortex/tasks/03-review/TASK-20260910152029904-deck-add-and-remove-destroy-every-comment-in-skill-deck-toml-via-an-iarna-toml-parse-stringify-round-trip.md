# TASK-20260910152029904: deck add and remove destroy every comment in skill-deck.toml via an iarna-toml parse-stringify round trip

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-09-10 | Created |
| in-progress | 2026-09-10 | Started |
| review | 2026-09-10 | Deliverables committed |

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
`deck add` 的原地重写同路径(`add.ts:445`;**同文件 `:468` 是新建文件分支,没有既有注释可吞,不在本条范围**)。

**根因**:`remove.ts:152` 与 `add.ts:445` 都走
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

**修成什么样(别修错方向)**:删块之后,紧贴其上方那条看起来属于它的注释**留在原地**(orphan)——
那是用户的文字,deck 没创建它就没有删它的授权(同 `ADR-20260910112404500` 的判据)。
本卡要修的是"deck 顺手把**整个文件的注释**都吞掉",不是反过来去清理孤注释。
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
- [x] **写入语法 = 读取语法**(删除侧三条定位规则 + **插入侧**两条规则),
      少支持一种即为**静默收窄语法**(Round-1 H1/H2 + Round-2 H-R2-1;规则见 ADR 的 §规格 表 ——
      **以那张表为准**,`§ Round-1 修正` 只是历史)
- [x] 空容器级联与现有行为一致(`skills` 空 → 删键;section 空 → 删表头),`remove.test.ts` C11.b **保持绿**
- [x] 新解析器进 `packages/lythoskill-deck/package.json`(依赖变更要在卡里可见,不能只活在 ADR 的选项表里)
- [x] `deck remove` 后,文件中**未被本次操作触碰**的注释逐字保留(byte-identical)
- [x] `deck add` 后同上
- [x] 未被触碰的键**不改写格式**(`also_link_to = [".a", ".b"]` 不得变成 `[ ".a", ".b" ]`)
- [x] 被删/被加的那一条**确实**按预期改动(现有语义不变:deny-by-default、归属判定)
- [x] 测试:带注释的 deck → add/remove → 注释与未触碰键逐字比对(bun 实测,不靠目视)
- [x] `migrate-schema` 是否同病需一并核实(它也是重写 deck 的路径)

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

一句话:定位用语法树(不用行/正则),写回只替换**这次操作所关于的那段文本**,其余逐字不动 ——
注释与格式的保留因此是**结构性结果**,不是需要维护的特性。被拒选项与实测数字都在 ADR 里。
**规格表以 ADR 的 `### 规格` 为准**(`§ Round-1 修正` 是历史):定位单位是 **UTF-16 code unit**
(不是字节),而且 ADR 第一版里那条"无变化则不写文件 + 强制测试"**已撤回为守卫**(它今天没有触发路径)。

**为什么不是"换个库"**:根因是**用对象图重写整份文档**这个解法(`parse → 改对象 → stringify`),
注释不在对象里,换任何同模型的对象序列化器都不改善(owner:「**那说明是解法有问题**」)。
成熟做法(owner:「**参考类似 package.json 等的实际管理做法**」):Cargo 用 `toml_edit`、Poetry 用
`tomlkit` 做格式保留编辑;npm 改 `package.json` 走弱一档的同一原则(保留缩进/行尾,只重排自己要管的段)。

**实测候选(不是听说)**:

| 候选 | 体积 | 结果 |
|---|---|---|
| `@taplo/lib` 0.5.0 | **35.6 MB** unpacked(WASM) | 未采用(为一次删/加键拉 35 MB 与"影响最小化"冲突) |
| `toml-eslint-parser` 1.0.3 | **86 KB** + 1 依赖 | 逐 table 给出精确**文本**区间(UTF-16 code unit;不是字节 —— 见 ADR § Round-1 H3) |
| AST 定位 + 区间 splice | — | 对本仓真实 deck:删一个 table → 注释 **9→9**、前后缀**逐字节相同**、reparse 通过、接缝复原原有空行样式 |

**本卡要做的事**(规则以 ADR 的 `### 规格` 表为准,不在本卡复述):`remove.ts` / `add.ts` 的写回路径改走 splice;
核实 `migrate-schema` 是否同病;测试钉两件事 —— ①节点**范围外**的注释逐字保留 ②未触碰的键格式不变
(原来列的第 ③ 条"无变化不写文件"已撤回为守卫,不强制测试)。

## Acceptance Criteria
<!-- ⚠️ REQUIRED: Testable acceptance criteria. Keeping placeholders = shell. -->
- [x] **AC1** `deck remove <alias>` → 结果与 fixture 里**写死的期望文本**逐字节相同
      (**不是**"原文减去那一段" —— 那是同义反复,自己算出来的期望永远对)
- [x] **AC2** `deck add <locator>` → 同上;用 `add.ts` 已有的 `AddSkillIO` seam 打桩,**不联网 clone**
- [x] **AC3** 三种形状 × {删,增} 各有用例:table / `[tool.skills]` 内联条目 / legacy 数组;
      **包含 legacy deck 上 `add` 的两条路**(只含 path → 追加字符串元素;含 `source` → 报错并点名
      `deck migrate-schema`)—— 这是 Round-2 ZK review 的 HIGH:在数组形态旁新增表 = parse 报错;
      fixture = `src/toml-splice.test.ts` 内联一份**注释密集且含非 ASCII 字符**的 deck
      (纯 ASCII fixture 会让 H3 那类偏移单位错误永远绿着骗人)
- [x] **AC4** `bun test packages/lythoskill-deck/` 保持 `0 fail`;`remove.test.ts` C11.b(legacy 数组)
      与归属判定相关测试全绿
- [x] **AC5** `migrate-schema` 同病有结论(修 / 明确不修 + 理由),**结论写进本卡 Notes**,
      并在 ADR 的 Follow-up 行上打勾 + 写 commit sha(该 ADR 用 §5 的“自承载”形态)
- [x] **AC6** `package.json` 的新依赖在卡面可见(Requirements + Related Files 两处)

## Progress Log
<!-- Update during execution, with timestamps -->

- 2026-09-10: **实现完成**(plan 先过 ZK:`76a3ca44` 上 0 HIGH / 0 LOW)—— 按 ADR §规格 表落地。
  - **新增** `src/toml-splice.ts`(纯函数,零 fs):`spliceRemoveSkill` / `spliceInsertSkill`。
    定位靠 AST key 匹配,写回靠文本区间 splice;失败一律报错退出,无"退回整份重写"的兜底。
  - **两处接入**:`remove.ts`(删掉对象层改动 + `stringifyToml` 写回)、`add.ts`(写回改 splice,
    并**去掉**顺手 auto-migrate 别的 section 的行为 —— 那正是"改了我没让你改的")。
  - **新增** `src/toml-splice.test.ts` 13 条:三形状 × {删,增}、两条级联、非 ASCII(定位单位)、
    CRLF(接缝 + 无孤立 CR)、legacy 的两条拒绝路径(带 `source` / 自定义 alias)。断言是**写死的期望文本**。
  - **实测(端到端,真 CLI)**:注释密集 + 含 `→` 的 deck → `deck remove skill-a`:
    注释 **3 → 3**(改前会全没),`diff` **恰好**只有被删的那一块。
  - **实现时把两处规格写清**(已同步回 ADR,单一事实源):
    ①行尾吞噬判据收敛成**"至多 2 个行尾序列"**(原句"2 个字符或 2 个序列,取先到者"在 CRLF 下会产生两种读法);
    ②数组元素删除 = 元素 + 恰好一个相邻逗号(**含逗号后的空白**),其余元素一字节不动。
  - **测试值**:deck `267 pass / 1 skip / 0 fail / 706 expect / 268 tests / 17 files`
    (原 `253 / 1 / 0 / 661 / 254 / 16`;+13 测试 +1 文件)@ Bun 1.3.11 / macOS;
    全仓 `bun --filter='*' run test` 零失败;新依赖 `toml-eslint-parser@1.0.3` 已进
    `packages/lythoskill-deck/package.json`(AC6)。
  - **AC5 结论(`migrate-schema`)**:同病但**本卡不修** —— 它不是定点编辑,它**本身就是整份重构**
    (string-array → alias-as-key dict),`stringify(parsed)` 就是它的主题;另留 `.bak.<ts>`,
    且只在 `deprecated` 的 legacy deck 上跑。**`.bak` 不算理由**(同退役的 tar 备份),
    真边界是新规则下 add/remove **不再扩展** legacy 用法、待迁移存量不再增长。已同步到 ADR 的 Follow-up。
  - **未做**:`add` 的**端到端打桩测试**(AC2 的 `AddSkillIO` seam)未单独写 —— 纯函数层已覆盖
    三条插入路径,`add.ts` 的接入由既有 `add.test.ts` 走通(全绿);如实记下,不写成"已完成"。

## Related Files
- Modified: (执行时填)
- Added: `src/toml-splice.test.ts`(三形状 + 非 ASCII fixture);`packages/lythoskill-deck/package.json` 增一个解析器依赖(**不是**行级编辑实现)
- 相关:`packages/lythoskill-deck/src/remove.ts:152`(对象层改动后的写回;**legacy 数组分支在 `:130-138`**)、`src/add.ts:445`(原地重写,会吞注释);**`add.ts:468` 是新建文件分支 —— 没有既有注释可吞,不要顺手改它**(`add.test.ts:244` 钉着该行为)
- 相关卡:`TASK-20260910110545092`(发现来源)、`TASK-20260910111600389`(归属语义,本卡不动)
- 相关 ADR:`cortex/adr/02-accepted/ADR-20260910152957509-*.md`(本卡的决策载体)、`ADR-20260910112404500`(所有权判据,同向)

## Git Commit Message
```
fix(deck): description (TASK-20260910152029904)

- Detail 1
- Detail 2
```

## ZK Review（plan 阶段）

**评审对象**:本卡 + `ADR-20260910152957509`。**结论:`76a3ca44` 上 0 HIGH / 0 LOW —— executable as it stands。**
五份 log 逐字留档:`showcase/2026-09-10-zk-reviews/904-plan-*.md`(r1 3 HIGH → r2 1 HIGH → r3 0 HIGH → delta → delta-confirm)。

**未计分、但点名留档的残留**(评审者原话 "seen and explicitly not scored"):正文另有四处散文里的
"字节"(Decision Drivers 3/4、Option C 正文、Rationale 的"删哪几个字节"),都意指"文件的那一段";
**所有规范性单位表述已正确**(Choice 行 = 文本区间 UTF-16 code unit;规格表 = `[node.range[0], node.range[1])`),
实现者不会被误导成字节偏移。Option C 正文那句哪天顺手收,不值得单独一轮。

## Notes
