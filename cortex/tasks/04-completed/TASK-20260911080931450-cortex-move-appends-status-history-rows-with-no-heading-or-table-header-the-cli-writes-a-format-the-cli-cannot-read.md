# TASK-20260911080931450: cortex move appends Status History rows with no heading or table header - the CLI writes a format the CLI cannot read

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-09-11 | Created |
| in-progress | 2026-09-11 | Started |
| review | 2026-09-11 | Deliverables committed |
| completed | 2026-09-11 | Done |

## Background & Goals
<!-- ⚠️ REQUIRED: Why is this task needed? What problem does it solve? Empty = shell, blocked by probe. -->

**一句话**:写入端的分支与读取端的判据从来没有被放在一起看过 —— **CLI 写出的格式,CLI 自己读不出来。**

| 环节 | 代码 | 行为 |
|---|---|---|
| 写 | `move.ts:126-129`(`appendStatusHistory`) | 卡**没有** `## Status History` 段时 → 追加一行**裸行**:无标题、无表头 |
| 读 | `probe.ts:220`(`extractStatusHistory`) | 要求 `/##\s+Status\s+History\s*\n/` → 没有标题就 `{ lines: [], hasSection: false }` |
| 结果 | `probe` | 报「Status History 为空或无记录,无法验证。请人工确认真实状态并补充历史。」 |

**为什么是"类"而不是"一次"**:任何**不是由 `template.ts` 生成**的卡(手写的、arena 跟进的、外部 ingest 的)只要走一次状态就中招 —— 它没有 `## Status History` 段,于是 append 走裸行分支。

**先例与本次受害是两个不同的实例,不要合并**
- **先例**:09-09 的 arena decision-log 卡 `TASK-20260909010121918`,卡面自述「my card's 'Status History 为空' warning was **pre-existing** (the card shipped without the table); filled in above」—— **人肉补表,机制没修**。
- **本次受害**:`TASK-20260909010058114`(03-review)。今天 `task start` → `task review` 之后尾部多出两行裸行,probe **12 → 13**,其中恰好 1 条「需人工确认」。

**同族第二形态**:`move.ts:144-146` —— 段存在但**无表头行**时,追加的行同样不带表头行。

**为什么值得单独一张卡**:这写的是**每张卡的状态历史** —— 状态机的记录层。它在最不该出错的地方产生了一个**只有 probe 能看见**的缺陷,而 probe 的措辞把**机制的问题**说成了**卡的问题**,于是修的方向会被带偏成「手工补表」。今天已实测出这条偏路的代价:naive 修复会让 probe 变绿而卡里多出一行**伪造的 `completed`**(见 Progress Log round 1 M3)。

**为什么这是执行既有法,不是立新法**:`ADR-20260910152957509` 的总则「**写入器的语法 = 读取器的语法**」(该 ADR Round-1 ZK review 三处 HIGH 之一),并同形记录在 `cortex/wiki/04-ssot/architecture.md`。**本卡不引新 ADR。**

## Requirements
<!-- ⚠️ REQUIRED: List specific requirements. Keeping placeholders = shell. -->

- [x] 新建 `src/lib/status-history.ts` —— **一份形状定义**:块(标题 + 注释 + 表头 + 分隔行)、`locate()`(**唯一**标题查找:逐行扫描 + 围栏图 + `trim()` 行锚定)、`read()`(只从**规范表**读出结构化行 `{status, date, note}`)。`probe.ts` 的 `extractStatusHistory` 与 `flow.ts` 的 `extractFirstDate` 建于其上;**三份私有副本删除**。
- [x] **规范表 = 带表头的那张表。** 其余任何**词表行**(首格是该 doc kind 的状态词) —— 段内段外、围栏内外 —— 都是**待折叠行**。
- [x] `append(content, kind, status, date, note)`:无段 → 写完整块 + 行;有规范表 → 在**其末尾**追加;有段无表 → 表头 + 分隔行 + 行;有**待折叠行** → **按序移到规范表末尾**再追加。**永不拒绝,永不伪造。**
- [x] kind-keyed 初始行:仅当**折叠进来的行里不含**该 kind 的初始状态(`task→backlog` / `adr→proposed` / `epic→active`)时才插入;日期按**日期列的 UTC 约定**归一(不是 ID 的本地时间 —— 实测 507 张里 73 张本地/UTC 差一天)。
- [x] `note` 取 `cells.slice(2).join(' | ')`,**不是** `cells[2]`(否则 note 含 `|` 的行一重写就被截断)。
- [x] legacy `## Status` 单行分支:**逐字保留** `probe.ts` 现有的 `/##\s+Status\s*\n\s*(\S[^\n]*)/i`(空白跳过)。**不做转换** —— 无门控的转换会让 `ADR-20260509155630`(同时带 `## Status` 与 `## Status History`)产生两个标题而**永久冻结**。

## Technical Approach
<!-- ⚠️ REQUIRED: Implementation plan, key decisions, references. Empty = shell, blocked by probe. -->

**这是实现修复 + 一处范围读法,判据 C1-C6 不命中,故不引新 ADR。**

**根因(计划闸 round 3 的设计层纠正)**:「located = readable」这条性质被定义在 **heading** 上,而它是关于 **record** 的。三轮闸各修了一层 —— v2 加固写入器定位器却留下读取器识别器(→ N1),v3 统一标题扫描却留下**行**扫描(→ 3 张多表卡)。正确的单一规则低一层,**一句话同时吸收孤儿判定、折叠顺序与行遍历**:

> **规范表 = 带表头的那张表。其余任何词表行 —— 段内段外、围栏内外 —— 都是待折叠行。**

**范围读法(本卡记录,不新开 ADR)**:`ADR-20260910152957509` 第 184 行「定位不到不是降级,是报错并说明它看到了什么形状」**不约束卡片写路径**。理由:该 ADR 的论证是「范围外的注释是用户写的,deck 没有创建它就没有删它的授权」—— 关于**声明式文件里用户写的注释**。而 **Status History 表是 CLI 自己的记录**:每张模板都创建它,3 张多表卡的行正是 CLI 自己的写端产生的。故本卡要的性质是「**CLI 读得到自己写的东西**」,由唯一 `read()` + 折叠规则兑现,**不需要拒绝契约**。若将来判定第 184 行确实约束卡片路径,要改的是**那条 ADR 的范围**,不是再补一轮实现。

**为什么不建拒绝契约(账)**:计划闸实测,拒绝契约只对 **1 张卡**(受害卡)起作用,且因 `append` 先折叠而**从 CLI 路径不可达**;`normalize` 动词 1 张;legacy 转换 0 张;>1 标题拒绝 0 张 —— 而**唯一有多实例的形状(多表类,3 张)没有一项碰它**。**对单例过度建造,对唯一活着的类建造不足。**

**测试落点**:CLI 集成(`test/runner.ts` + `test/scenarios/`),**不导出私有函数** —— 这里的契约是**文件形态**。runner 需扩展一个"手写卡"given 形态:`given.tasks` 现在只能经 `createTaskTemplate` 造卡,而**模板自带正确的段**,所以这个缺陷从第一天起就不可能被这套测试发现。夹具用**真实语料**,不用虚构。

## Acceptance Criteria
<!-- ⚠️ REQUIRED: Testable acceptance criteria. Keeping placeholders = shell. -->

- [x] **AC1** 手写一张无 `## Status History` 段的卡(内容**填满,不是空壳**,以免 probe 因第二个理由报它)→ `task start` → `read()` 含新状态,且写出的块**逐字**等于定义(含注释与表头)。**仅"标题 + 裸行"不得满足本 AC。**
- [x] **AC2** 全库 status issue **1 → 0**;**4 张卡**字节变化(3 张多表 + 1 张受害卡),其余逐字节不变(基线实测 541/541);其他类别(empty shell / checklist / lane / staleness / coupling / wiki)计数不变。**实施时记录实测数。**
- [x] **AC3** 变异钉:把写端改回裸行 → AC1 红。**实际跑过**,不是声称。
- [x] **AC4** 旧卡(有标题、有表头)流转后逐字节不变 —— 现有测试全绿。
- [x] **AC5** 3 张多表卡流转后**读端最后一行 = 新状态**(今天读端是 `terminated` / `completed`,而写端落在 `backlog`)。
- [x] **AC6** `probe.test.ts:194` **不改而绿**(legacy 正则逐字保留)。
- [x] **AC7** 词表孤儿规则的**负例**:`TASK-20260503235013705` 的 `## 进度记录` 表(`| RED | 2026-05-04 | … |`)**不得**被判为孤儿;围栏内的示例行同样不算。

## Progress Log
<!-- Update during execution, with timestamps -->

- 2026-09-11 — 本卡由 peer session 登记(它复核了另一会话只读 onboarding 的发现)。随后 `task start` 进入本会话。
- 2026-09-11 — **计划闸 round 1**:verdict **No**。4 HIGH / 8 MED。核心:规格把 `append` 定义成**全函数**而总则要求它有拒绝路径;读端**列表**分支被保留却不处理(H2 会吞掉原有行);AC1 可被"标题 + 裸行"满足(H3);`templates/epic.md` 是**第四份**副本(H4);naive 修复让 probe 变绿而卡里多出伪造的 `completed` 行(M3)。
- 2026-09-11 — **round 2**:verdict **Partially satisfied**。3 HIGH / 4 MED / 3 LOW。核心 **N1 —— 修复自己造出的漂移**:只加固写入器定位器而让读端「保持语义」,于是 fenced 场景下**写入器报成功、读端看不见它写的行**。判词:「v1 里两侧都用围栏,所以**至少一致**;只加固一侧,把『一起错』变成了『两边不一致』—— 而那正是 property 1 本身」。另有 N3(孤儿判定过松会**误伤健康卡**)、N7(ID 本地时间 vs 日期列 UTC,507 张里 73 张差一天)。
- 2026-09-11 — **round 3**:verdict **heading 层闭合、row 层未闭合**。核 **N6-a —— 第二次自造失败类**:无门控的 legacy 转换会让 `ADR-20260509155630` **永久冻结**,即 N6 违反了 N6 自己要立的那条性质。设计层纠正:性质被定义在 heading 上而它关于 record。评审者给出唯一规则 + **实测**:折叠到末尾 → 3 张卡变化、**0 剩余 status issue**。
- 2026-09-11 — **计划闸收敛**:采纳 round 3 的小规格。评审者提议了该设计,故它不能再当设计的评审者(「评审者不能是作者」);对冲放在**实现闸** —— 零上下文评审者,判据 = 上面冻结的这份规格。
- 2026-09-11 — **执行**。`src/lib/status-history.ts` 成为唯一定义(`locate`/`read`/`parse`/`append`);三份私有副本删除(`move.appendStatusHistory`、`probe.extractStatusHistory`、`flow.extractFirstDate`);`moveDoc` 的写后自检放在 `writeFileSync` **之前**。
  - **实测(AC2)**:语料 **542 张**。与**修复前写入器**的输出逐字节不同的恰好 **4 张**(3 张多表 + 受害卡),其余 **538 张逐字节相同**;把机制重放到那 4 张后 status issue **1 → 0**(13 → 12 issue),其他类别(empty shell 0 / staleness 10 + epic drift 1 / wiki 1 / lane / coupling)计数不变。跑法:对每张卡用其目录状态调一次 `append()`,再 `probe`。
  - **中间态(卡面未预期,如实记)**:读端改为"只读规范表"后,3 张多表卡在**各自下一次流转之前**会被 probe 判 mismatch(它们的规范表尾行还是 `backlog`/`backlog (revised)`)。live 仓曾实测 status issue **1 → 4**(13 → 16 issue)。这是**把本来就存在的漂移暴露出来**(规范表里没有终止那一步),不是新缺陷。**后续(2026-09-11 晚):协调者把这 3 张 archive 掉 —— 那是合法流转,机制借它把它们**自己**修好了**(orphan 行折进规范表、尾行变成新状态),没有手工改过一个字节;现场 status issue 回到 **1**(只剩受害卡),受害卡下一次流转即 0。**
  - **AC3 变异钉(实跑)**:把 `append` 的"无段"分支改回裸行 → `bun test packages/lythoskill-project-cortex/src/lib/status-history.test.ts` **22 pass / 7 fail**;`bun packages/lythoskill-project-cortex/test/runner.ts` **13/15**(两个新场景红)。还原后 `shasum -a 256` = `a368ebed5004e634ef7a159aa192b0a46a0ddf52e173dffcf25f2fffb1d28935`,逐字节相同。
  - **三处读法分歧(实现闸请对着判)**:①**初始行只在"从零写表"时插入** —— 全库 **20 张**(10 task + 9 ADR + 1 epic,判据 = 规范表**首行**的状态词不等于该 kind 的初始状态;先前这里写 19 是用了"不含"这个弱判据)的规范表不以初始状态开头,统一插入等于给它们伪造历史。(**更正**:`!table` 是**兜底**不是机制 —— 实现闸证明规范表分支在构建行列表之前就 return 了,见 round-1 修正条目。)②**折叠行按 `read()` 的三元组重写**(故 `| terminated | 2026-05-03 | … |<!-- … -->` 变成 `| terminated | … | … | <!-- … --> |`),依据是规格里「note 含 `|` 的行**一重写**就被截断」那句;③**围栏 —— 已裁决(AC7 优先)**:规格那句「段内段外、围栏内外」与 **AC7 末句**「围栏内的示例行同样不算」互相矛盾,协调者裁定 **AC7 生效**,理由超出文本本身:**加固一个扫描而把它的孪生扫描留在原地,正是 round 2 N1 那个失败形状**(写入器定位器围栏感知、读取器识别器不感知 → 围栏卡上写入器报成功而读取器什么都看不见)。实现改为 **一张围栏图、每个扫描都读它**(`locate` / 规范表 / 折叠行)。复测:全库 **0 张卡**有围栏内词表行,故 538 逐字节相同 / 4 张变化与 1 → 0 的数字**均不变**;新增一条测试钉住"围栏内词表行不折叠 + 围栏逐字节不动"。
  - **未闭合**:`template.ts` / `templates/epic.md` 仍各自携带一份块形状(round 1 的 H4「第四份副本」)。本卡用一条测试钉住"新写的块 = 模板的块逐字相同"(**含 epic 模板** —— F5),但没把模板改成读 `status-history.ts` —— 那会重写每一张新卡的字节,不在冻结交付物里。
- 2026-09-11 — **实现闸 round 1 的三处修正(F1-F5)+ 两处记录(F6/F7)**。最终修订:`status-history.ts` sha **`7025ad2559a03012fd299c2e05d939414da899be777fe8be2deefb2e9c7b36e6`**;模块测试 **46 条**,包内 **206 pass / 0 fail**,BDD **15/15**,全仓 `bun run test` exit 0。**语料拆分(AC2,今日实测)**:与修复前写入器逐字节不同的**只剩 1 张**(受害卡)—— 另 3 张多表卡已被各自的 archive 流转修好(AC 基线那次是 4 张 / 538 张不变);把受害卡按机制修一次后,status issue **1 → 0**,总 issue 12,其他类别不变。
  - **本卡先前记的钉数是已被取代的修订**(`a368ebed…` / 22-7;`f21e4f2b…` / 30 条)—— 下面是最终修订的实测。
  - **AC3 变异钉(最终修订,实跑)**:把写端改回裸行 → 模块测试 **32 pass / 15 fail**,BDD **13/15**;还原后 sha 仍是 `7025ad25…`,`grep -c MUTATION` = 0。(数在 G1-G6 之后复跑过 —— 测试从 46 条增到 47 条后,新增的 F3/F4 断言也一并捕获这个变异,故失败数由 10 变 15。)
  - **F1 —— AC5 重写为"内容而非位置"**。原版把 3 张多表卡的**工作目录**写死,协调者 archive 它们(合法流转)后套件立刻 3 红。现改为冻结夹具 `test/fixtures/multi-table-<id>.md`,**逐字节等于 `git cat-file blob HEAD:<path>`**(冻结时校验;provenance:HEAD = `4838487b`,旧路径 `06-terminated/`、`04-completed/`);受害卡的两条测试同样改用夹具 `writer-damaged-task-card.md`。理由写在测试注释里:**钉内容不钉位置 —— 结果依赖"语料当前在哪"或"环境暴露了哪些工具"的测试都不可复现**。(我最初写下的"`bun test` 里子进程被 shim"是**我这一侧执行环境(sandbox)的现象**,不是 `bun test` 的属性、也不是本仓的属性 —— 协调者在其环境中三次都复现不出来,该说法已从记录里删除。)
  - **F2 —— 交叉校验不再与实现同源**。测试的 `orphanRows`/`rowStatus` 原本文 `statusToken`(被测模块导出),所以"删掉 first-token 规则"这一变异对它是隐形的(实现闸 M9)。现自带独立分词,并新增一条判别性用例:**`| backlog (revised) |` 必须被折叠**。变异钉:删掉 first-token 规则 → **46 pass / 1 fail**(恰好那一条,最终修订复跑);没有它时该变异全绿。
  - **F3 —— 删除 `moveDoc` 的自检拒绝**。那是我加的一条**卡面没要求的拒绝路径**,与卡自己的「不需要拒绝契约」冲突,而且构成**冻结路径**:尾部留着未闭合围栏的文档,写出的块会落进围栏里,`read()` 返回空 → `move` 拒写 → 该卡**永远无法推进**(正是 round 3 N6 那一类)。已删除。改为把 4 种开围栏形状(EOF 处未闭合 ``` / 无尾换行 / 文档中部未闭合 / 未闭合 ~~~)的行为**钉成测试**:`append` 照写(**永不拒绝**),`read()` 看不见该行 —— 记为**已知 0 实例缺口**(全库 542 张 0 命中),另开卡收口。
  - **F4 —— 初始行的日期改由卡 ID 推出(归一到 UTC),并注明是重建**。原先用**流转日期**:受害卡会被写成 `| backlog | 2026-09-11 | Created |`,而它的记录从 `in-progress 2026-09-10` 起、ID 时间戳是 09-09;更糟的是 `flow` 读第 0 行 → 修好的卡年龄被静默归零。现在取 ID 时间戳、按日期列的 UTC 约定归一,note 写明 `Created (reconstructed from card ID)`(ID 无时间戳时 `… ; no card ID`,回落流转日期)。**实跑受害卡(真 CLI)**:第 0 行 = `| backlog | 2026-09-08 | Created (reconstructed from card ID) |`,其后的行序日期单调,`flow` 的 in-progress 平均年龄 **2d**(不是 0d)。**两处更正**:①"规范表不以初始状态开头"实测 **20 张 = 10 task + 9 ADR + 1 epic**(我先前的 19 用的是"不含"这个弱判据,漏了 `ADR-20260509104832428`);②`!table` **效果对、机制错** —— 实现闸证明规范表分支在构建行列表**之前**就 return,`!table` 只是兜底而非机制,卡面与代码注释都已按此改写。
  - **F5 —— 四条"红了不算数"的规则补上判别性测试**:M10(kind 词表:task 卡里的 `active`/`done` 行**不**折叠;同样的字节按 epic 读**才**折叠)、M11(`hasSection`:无标题但有规范表 → true;有标题无表 → true 且 `lines` 空)、M16(legacy `## Status` 与规范表的优先级,并补 **`ADR-20260509155630` 双标题夹具** `legacy-status-heading-adr.md`,逐字节同 HEAD —— 卡面把这份 ADR 当作"禁止转换 legacy"的全部理由,此前没有任何测试或夹具提到它);并把"新写的块 = 模板的块"那条**扩到 epic 模板**(此前只测 task/ADR,epic 这一卡型漂了也全绿 = 装饰)。
  - **F7(a) —— 两处读取能力被删除,记录后果(不恢复)**:①`flow.extractFirstDate` 不再"继续找到第一个**可解析**日期的行",现在只取规范表**首行**的日期,解析失败即无年龄(该卡不进平均);②`probe.extractStatusHistory` 不再有 1b 的**列表回退**(`- status`)—— 列表形态的段现在读出空,于是又走到**本卡存在就是为了不再误发的那句**"Status History 为空或无记录"。两者语料均无实例(`flow`:384/384 与旧实现完全一致;列表形态段:**0/542**),而 `read()` 只认表是冻结设计,故**有意不恢复**,只在此登记。
  - **F7(b) —— `probe` 里两处孪生扫描已改道**:`staleness` 的 backlog 与 epic drift 原先各自 `content.match(/\|\s*backlog\s*\|…/)`,**无围栏图、不锚定规范表**(同类孪生扫描,且在卡自己改过的文件里)。现两者都走 `read()`(取该状态的**最后**一条 = 最近一次进入)。**实测:14 张 backlog 卡 + 1 张 active epic 的日期与旧正则逐条相同(0 差异),现场 `probe` 的 staleness 计数不变(10 stale + 1 epic drift)。**

- 2026-09-11 — **delta 复核干净(8/8)后的最后一轮(G1-G6)**。最终修订:模块 sha `7025ad2559a03012fd299c2e05d939414da899be777fe8be2deefb2e9c7b36e6`(本轮未再改模块代码),`status-history.test.ts` **47 条**,包内 **210 pass / 0 fail**,BDD 15/15。
  - **G1 —— F4 的钉子原先并不成立,已重做并复跑三个变异(证据)**。原夹具 `TASK-20260101120000000` 是退化的:月=日=01(交换看不见)、12:00 本地(任何 −12..+11 时区里本地日期都等于 UTC 日期);而且断言的算式与被测实现同源 —— F2 那一类在 F4 里复发。现钉两个非退化输入:`TASK-20260101003000000`(本地 00:30,落在 [00:00, 08:00) 窗口 → **`2025-12-31`**,同时钉住归一化与 `toISOString`)与 `TASK-20260509120000000`(月≠日 → **`2026-05-09`**,钉住交换)。**时区选择**:在进程内 `process.env.TZ = 'Asia/Shanghai'`(`finally` 还原),**不 spawn 子进程** —— spawn 依赖"环境暴露了什么",进程内设定既不依赖运行者时区也不需要子进程;并加一条自检断言"时区确实生效",否则这条钉会静默失去判别力。**三个变异各自复跑(均红)**:F4-a 朴素切片 → **46 pass / 1 fail**;F4-c 月日交换 → **46 pass / 1 fail**;F4-d 本地格式化 → **46 pass / 1 fail**。**并在 4 个宿主时区下复跑**(UTC / America/New_York / Pacific/Kiritimati / Asia/Shanghai):未变异 47 pass / 0 fail,F4-a 变异**在每个时区都红** —— "只在非 UTC 才有判别力"这条警告已被固定时区消掉。
  - **G2 —— 两处扫描补上 NaN 守卫(小回归,已修)**。`| backlog | (unknown) |` 这类行:旧正则要求 `YYYY-MM-DD` 形状,于是**跳过**它、匹配到有日期的行;改道后取"最后一条匹配行"拿到不可解析的日期 → age = NaN → **警告静默消失**。新增 `lastDatedRow()`(取该状态**最后一条日期可解析**的行;全都不可解析时不下任何判断),两处扫描共用。测试三条(backlog 回退到有日期的行 / 全都不可解析时不下判断 / epic drift 同样覆盖);变异(去掉解析守卫)→ **30 pass / 2 fail**。
  - **G3 —— F7(b) 超出 Requirement 1,登记在案**。Requirement 1 点名的"三份私有副本"不含 `probe` 的 staleness 与 `| active |` 两条正则;实现闸判定整体是严格改进(15 张卡 0 日期差异、计数不变),并列出**两个更差的方向**:①**覆盖变窄** —— 旧正则匹配文档里**任意位置**的 `| backlog | <date> |`(含围栏内、含非规范表),改道后只认规范表,于是"孤儿形状里的日期"不再被计入(现场 0 实例);②**不可解析日期**(见 G2,已修)。**不回退。**
  - **G4 —— 开围栏缺口的实质量比原测试钉住的更重,已补断言**。实测(输入 `# T\n\n## Notes\n\n```\n`):`append` 把块写进围栏区;**事后补上闭合围栏也救不回来**(`read(out + "```\n")` 仍是 `[]`,而文件里明明有 2 行)—— 开围栏之后的一切都在围栏内;而且**下一次流转看不到任何段,于是再写一个完整的块**:文件按"围栏状态每翻转一次"增长一个块(4 种形状实测:标题数 +1、块标记 2 个、行数 2 → 4)。四条形状的测试现在断言"补平衡后仍不可读"与"下一跳写出第二个块"。**实现闸的诊断一并记录**:这类卡会被 `probe` 用**本卡存在就是为了不再误发的那句话**报告 —— 所以缺口卡应让 `probe` 能区分「因围栏未闭合而不可读」与「本来就没有记录」。
  - **G5 —— 两条仍未钉住的发现,记录不消失**:(a)**重建可以被倒置** —— 若 ID 时间戳晚于文件里已有的行,写出的"初始行"会排在它之后(本文档的不变量只在"ID 是最早的刻"时成立,即受害卡那种形状;F4 之前更糟 —— 初始行取流转日期,永远是最新);按构造无法钉住,故测试里显式钉住"倒置确实发生"这一现状,**修好后该用例应当被删除**。(b)**`utcDateFromId` 的 `isNaN` 守卫是死代码** —— JS 会滚动进位,`TASK-20261301990000000` → `2027-01-04`,于是这一行会被标成 `reconstructed from card ID`、带着一个**自信的错日期**,而不是走诚实的 `no card ID` 回退。低危,状态记录在此。
  - **G6 —— 三处一致性漂移(本卡自己就是这一类)**:①`move.ts` 里 F3 删掉自检后遗留的 `read, statusToken` 死导入已删;②本卡**结构化字段**里两条被取代的说法(「写后自检移到 `writeFileSync` 之前」、「29 测试」)已改正(结构字段与 Progress Log 自相矛盾 = 文档↔代码漂移的缩小版);③`status-history.test.ts` 里仍写 "19" 的注释已改为 20,与模块 docblock 和卡面一致。
  - **本地修复过的读取能力(不恢复,登记)**:`flow.extractFirstDate` 不再"继续找第一个可解析日期";`probe.extractStatusHistory` 的 1b 列表回退已删(列表形态的段读出空 → 又会走到本卡要消灭的那句提示)。语料均无实例(384/384 一致;列表形态段 0/542)。

## Related Files
- `packages/lythoskill-project-cortex/src/commands/move.ts`(写端 123-151)
- `packages/lythoskill-project-cortex/src/commands/probe.ts`(读端 220;staleness 557/576)
- `packages/lythoskill-project-cortex/src/commands/flow.ts`(读端 34 `extractFirstDate`)
- `packages/lythoskill-project-cortex/src/lib/template.ts`(**形状的出处**)
- `packages/lythoskill-project-cortex/templates/epic.md`(**第四份副本**,从磁盘读)
- `packages/lythoskill-project-cortex/test/runner.ts`(需扩展 given 形态;第 498 行是**第三套**行语法,要求每格有尾 `|`,5 个真实行没有)
- `cortex/adr/02-accepted/ADR-20260910152957509-…md`(**总则出处**;`tasks:` frontmatter 待补)
- 受害卡:`cortex/tasks/03-review/TASK-20260909010058114-…md`
- 多表类:`TASK-20260503152001333` / `TASK-20260503154401905` / `TASK-20260503152002342`
- 负例:`cortex/tasks/04-completed/TASK-20260503235013705-…md`
- **潜在损伤**(不在 config 扫描面内):`cortex/adr/03-superseded/` 的 4 份 —— 无段无行;「恰好 1 张受损」只对 config 扫描面成立
- Modified:
  - `packages/lythoskill-project-cortex/src/commands/move.ts`(删 `appendStatusHistory`;`DocKindConfig.kind`;把文档 ID 传给 `append` 供初始行取日期。**写后自检已按实现闸 round 1 F3 删除** —— 见 Progress Log)
  - `packages/lythoskill-project-cortex/src/commands/probe.ts`(`extractStatusHistory` = `parse()` 的别名;`staleness` 的 backlog / epic drift 两处扫描改走 `read()` —— **超出 Requirement 1**,见 Progress Log G3)
  - `packages/lythoskill-project-cortex/src/commands/flow.ts`(`extractFirstDate` 建于 `read()` 之上)
  - `packages/lythoskill-project-cortex/test/runner.ts`(手写卡 given 形态 `with content from`;`__status_history__` 改用 `parse()`;新增 `__verbatim_block__`)
- Added:
  - `packages/lythoskill-project-cortex/src/lib/status-history.ts`(**唯一定义**)
  - `packages/lythoskill-project-cortex/src/lib/status-history.test.ts`(**47 测试**;含真语料回归与 5 条语料夹具)
  - `packages/lythoskill-project-cortex/test/scenarios/status-history-handwritten-card.md`
  - `packages/lythoskill-project-cortex/test/scenarios/status-history-writer-damaged-card.md`
  - `packages/lythoskill-project-cortex/test/fixtures/handwritten-task-card.md`(受害卡去掉两行裸行后的真内容)
  - `packages/lythoskill-project-cortex/test/fixtures/writer-damaged-task-card.md`(受害卡当前字节)
  - `packages/lythoskill-project-cortex/test/fixtures/multi-table-{20260503152001333,20260503154401905,20260503152002342}.md`(3 张多表卡的 HEAD blob,逐字节校验)
  - `packages/lythoskill-project-cortex/test/fixtures/legacy-status-heading-adr.md`(`ADR-20260509155630` 的双标题 HEAD blob,M16)

## Git Commit Message
```
fix(cortex): status-history writer and reader share one definition (TASK-20260911080931450)

- src/lib/status-history.ts: one shape definition — locate()/read()/append()
- probe.ts + flow.ts build on it; three private copies deleted
- canonical table = the header-bearing table; other vocabulary rows fold to its end
- legacy ## Status branch regex preserved verbatim (probe.test.ts:194)
```

## Notes
- **执行纪律**:每笔修复必须有变异钉(改回去 → 测试红),否则是装饰。
- 本卡冻结的规格是实现闸的判据 —— 实现闸**对着它**评审,不是对着代码注释。
- 顺手项(不属本卡范围,另记):`ADR-20260509170343037` 正文写「未实施,仅记录决策草案」而 `_meta_fingerprint` 已实现 —— 按仓库惯例**追加一行 Status History note**,正文不动。
