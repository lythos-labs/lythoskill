# TASK-20260910110545092: cli-layout follow-ups - unfixed B-class findings from 2026-09-10 inbox-debate

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-09-10 | Created |
| in-progress | 2026-09-10 | Started |
| review | 2026-09-10 | Deliverables committed |

## Background & Goals
<!-- ⚠️ REQUIRED: Why is this task needed? What problem does it solve? Empty = shell, blocked by probe. -->

2026-09-10 的 inbox-debate 试验对 `TASK-20260909155425926`(P2 adapter 加固)的全部宣称
做了 challenge 式质询,sober judge 终裁 = **附条件维持**。

终裁的缺陷清单分三态,**B 类是"辩论中暴露、已证实、未修"的事实**(C 类是未验证方案,
两者混为一谈是后续执行的大忌)。本卡收 B 类的代码/文档项。

来源:`playground/2026-09-10-inbox-debate/oracle/0001-judge-verdict.md` §4-B(逐项带载体行号)。
judge 的 must #1 即"开 follow-up task 覆盖 B1-B3 + B8-B15,并在原卡 Notes 补已知未修注记"。

**为什么不能烂着**:其中 B1(假 source 挂 main)违反项目自己的 no-source-no-rule;
B2 是 **data-loss 级漏报**(warning 误报成本 ≪ data-loss 漏报成本);B8 是文档宣称大于代码实况。
B3 定性为**记账修复** —— 修的是"日期字段承载三件事",不是"普查不成立"
(owner 2026-09-10 定调:agent 自己选的那 16 家是设计,不是缺陷)。

## Requirements
<!-- ⚠️ REQUIRED: List specific requirements. Keeping placeholders = shell. -->

**数据层自检**

- [x] **B2** goose data-loss 漏报:`cli-layout.ts:166` goose 行
      `fanOutTargets` 含 `~/.config/goose/skills`,但 `:175` hazard `recursive-unlink-delete` 的
      `triggerDirs` 只有 `[".goose/skills"]`;`collectTriggerHazards`(`layout-policy.ts:32-45`)只查 `triggerDirs` → 用户 `also_link_to` 该目录时 data-loss
      警告不触发。
      **修:两处,不是一处**(2026-09-10 复核修正 —— 原写"一行"是错的):
      1. **数据行** `cli-layout.ts:175`:`triggerDirs` 扩为
         `[".goose/skills", "~/.config/goose/skills"]`(`dirMatches` 归一化直接支持)。
      2. **断言行** `cli-layout.test.ts:49`:
         `expect(h.triggerDirs).toEqual(['.goose/skills'])` —— 它把漏报**钉成绿的**。
         只改数据不改这里,测试立刻红(这其实是好事:红了才证明断言有效);
         但红之后若只是把断言跟着改成新值而**不补**"该目录确实触发警告"的行为用例,
         就只是把"钉住旧行为"换成"钉住新数据形状",漏报仍可能复现。
         故此处要改成 `toContain` 两目录**并**新增一条 `collectTriggerHazards` 行为断言。
      **为什么原判"一行"会错**:判据来自数据行目视,而这条断言和它同文件同 describe ——
      测试与实现出自同一处理解时,测试不是独立的第二意见,是同一处理解的第二份抄写
      (同 `targetModeOverride` 只喂 cline 一个输入的结构)。
      附:范围裁剪需注释说明 #11600 的引用范围。
- [x] **B13** `perRoleScoping` schema 债:自由文本进 typed schema、**全仓零消费方**、
      无 `layoutProblems` 检查。修:`layoutProblems()` 加非空 + 长度上限检查。
- [x] **B3** `verifiedAt` 语义混:16 行同为 `2026-09-09`,但该字段同时承载
      "普查日 / 复核日 / 补录日"三事件,qwen 行的补录出身只活在 note 散文里。
      修:加 `verifiedBy: "survey" | "restored"` 可选字段,仅 qwen 行标 `restored`;
      `layoutProblems()` 加「restored 行必须有非空 note」自检。**普查本体一行不动。**
- [x] **取证未留痕**:2026-09-09 的 16-CLI 普查报告未持久化(`original survey report
      unpersisted`),导致 qwen 行只能按"候选顺序首名"补录。定性 = **取证过程未留痕**,
      非"调研方式不可靠"。修:确立普查证据的落盘位置与命名。
      **同一段还有第二例(2026-09-10 复核新发现)**:P2 的独立验证(ZK re-trial,
      `8.5/10` gate ≥7)全部落在 `/tmp/arena-p2-adapter-retrial/`
      (`adversarial.test.ts` + `decision-log.jsonl` + `self-report.md`),**未入仓**。
      仓里 `showcase/` + `reproduce.sh` 协议**存在**(ADR-20260518024500631;
      20 个 showcase 条目 + `test/scenarios/*/reproduce.sh`),但 P2 该批
      **零条目、零 scenario、零 verdict 产物** —— 协议没被套用。
      核查(2026-09-10):
      - deck 现有 5 个 BDD scenario,只有 `deck-remove-bdd` 与
        `to-symlink-snapshot-bdd` 带 `judge-verdict.json` + `decision-log.jsonl`;
        **覆盖 fan-out 的那一个 `also-link-to-bdd` 两个产物都没有** ——
        它是 IoC handoff 式(Step 3 只打提示,不执行),2026-05-19 建后**从未被真正跑过**,
        最后一次触碰还是 `9f22d497 docs(readme)`(文档提交,未复验)。
      - 故"fan-out 有可复盘的 E2E"这句话**目前不成立**:有脚本,无裁决。
      修:(1) `/tmp` 那份是**唯一副本**,先落盘 —— 它是本卡"已证伪/已证实"断言的原始证据;
      (2) 定案普查证据与 ZK 证据的统一落盘位置与命名;(3) 复验并盘活 `also-link-to-bdd`
      (并对齐新归属语义,见下条),使其产出 verdict 产物。
      注:`/tmp` 随重启清空 —— 本条有时间敏感性。
      **✅ 已落地(2026-09-10)**:(1) 三份产物**逐字**落盘到
      `showcase/2026-09-09-p2-cli-layout-zk-retrial/`(+ README 写明它 pin 的是哪个 commit、
      以及"为什么逐字不改"—— 改了就不再是那个 commit 的证据);(2) 落盘位置**沿用既有协议**
      (`showcase/<date>-<slug>/` + `reproduce.sh`,ADR-20260518024500631),不新发明约定;
      (3) 见下条:场景已全量复跑,verdict 产物仍缺(需 agent + judge)。
      **顺带实测出的一件事**:该 bundle 的 10 条对抗用例对今天的树 **9 过 1 红**,
      红的那条(ADV-7)**对它所 pin 的 `c8ebcc76` 同样红**(已用当时的 `adapter-policy.ts` 复现)
      —— 即 ZK 门自己的套件里有一条从未绿过的用例,而门报的是 `8.5/10`。详见 bundle README。

**IO 分离 / 测试**

- [x] **B9** per-run 半继承:`per-run.ts:97-107` 的 `PerRunIO` 只覆盖 error/exit/log
      (该注的注了),而 `:114-130` 加载段 fs 全裸(existsSync / findFileSync / readFileSync),
      导致 `per-run.test.ts:9/21/78` 被迫 `mkdtempSync` 写真 tmp 才能测入口。
      修:抽 `loadPerRunTargets(deckPath, workdir)` 纯函数(TOML 读盘留在入口一行),
      `renderPerRun` 不动;测试改为纯函数走真 tmp + 入口只留零副作用 smoke。
- [x] **B10** `safe-remove.test.ts:101-103` 递归删除测试只断言目录消失、**无嵌套内容断言** ——
      Bun 若把 `recursive` 退化成 no-op 仍绿。修:补一行嵌套文件断言。
- [x] **B19(新,2026-09-10 加)** ⚠️ **本条的立论已被实测推翻,见 `## Progress Log` 2026-09-10 末条** ——
      该场景 PHASE 2 的断言 9-11 在新归属语义下**照常成立**(那些条目是 deck 自己建的 symlink,
      归属判定允许删);已实测全量重放 1-19 全过。**仍缺的是 verdict 产物**(需 agent + judge 跑一轮),
      已按"大 gap 先跳"记录,不假装完成。原文保留如下(它记录了当时为什么这么判):
      其 PHASE 2 断言 "10. `.agents/skills/skill-a` does NOT exist / 11. `.kimi/skills/skill-a`
      does NOT exist" —— 那是**目录包容**语义下的期望。`TASK-20260910111600389`
      (已收,commit `e2edc52e`)把边界改成 **k8s ownerReferences 式归属判定**:
      证明不了"是我建的"就不删,改为 warn + 给 `rm -r` 建议。
      照原样重放,该场景会得到"条目仍在 + 一条 warning",而脚本说它该消失 ——
      **复现者会以为是回归**。修:PHASE 2 拆两路 ——
      (a) deck 自己建的 entry → 仍应被删(= 原断言,保留);
      (b) 外来真实目录占位 → 应**留下** + 出 warning(新增,钉新边界)。
      另:该场景无 `judge-verdict.json` / `decision-log.jsonl`(见上条),复验时一并补。
      **这条不是历史问题** —— 是本次善后(fan-out 归属修复)**派生**出的既有资产失配。

**文档 / 注释**

- [x] **B8** deck `README.md:124-125` drift:宣称 `executePrunePlan(plan, io) — IO injected
      (gitPull, delete, log)`,但 `executePrunePlan` **和** `buildPrunePlan` 在 src 均不存在
      (src 无 prune 模块,双零命中)。修:删行或标 `planned`。
- [x] **B11** `AGENTS.md` 缺成文纪律:「`node:*` 是 Bun 兼容层;不得拿 Node 文档语义当行为
      论证依据;行为假设必须有 Bun 实测测试钉死」。
- [x] **B12** `safe-remove.ts:9-10` 注释引 Node 语义(lstat 不跟随)而非 Bun 实测测试。
      修:改引 `safe-remove.test.ts:48-60`。

**构建管线**

- [x] **B20(新,2026-09-10 实测发现)** 生成式 skill 产物**不会因 `src/` 变更而重建**。
      `.husky/pre-commit:117` 的触发条件是:
      ```bash
      STAGED=$(git diff --cached --name-only --diff-filter=ACM | grep '^packages/.*/skill/' || true)
      ```
      —— 只有 `packages/*/skill/` 下的改动才触发 `build --all`。
      但 `packages/lythoskill-creator/src/build.ts:54` 的 COMMANDS.md 是**跑 `bun src/cli.ts --help`
      生成**的,即**派生自 `src/`**。于是**改了 `src/cli.ts` 却不碰 `packages/*/skill/` 的提交,
      产物不会更新**。
      **实测实例**:`e2edc52e`(本次善后卡 #7)把 `--no-backup` 从 `cli.ts` 的 `HELP_CONFIG`
      里摘了,但 `skills/lythoskill-deck/references/COMMANDS.md` 直到 `18a6d1cc`
      (因为恰好改了一个 `packages/*/skill/` 文件才顺带重建)才跟上 ——
      中间这段时间里,**发出去的 skill 产物在文档化一个已退役的 flag**。
      影响面:冷池里被 `deck refresh` 安装的就是 `skills/` 产物,agent 读的也是它。
      **修**:触发条件改为「`packages/*/skill/**` **或** 任一包的 `src/**` 且该包有 `skill/` 产物」
      (或更保守:直接对 `packages/**/src/**` 也重建);并补一条 dormancy 式校验 ——
      重建后 `git diff --quiet skills/` 应为空,非空即说明产物此前是陈的。
      **注**:这不是本卡的 B 类历史项,是本次善后**顺带实测**出来的同类(产物 vs 来源不同步)。

**治理机制本身**

- [x] **B21(新,2026-09-10 实测发现)** **`probe` 的 empty-shell 检测对 ADR 恒为假** ——
      `cortex adr "<title>"` 刚建出来、一字未填的 ADR,**报 `0 empty shell(s)`**。
      **实测复现(不是推断)**:
      ```bash
      bun packages/lythoskill-project-cortex/src/cli.ts adr "throwaway shell detection probe"
      bun packages/lythoskill-project-cortex/src/cli.ts probe
      #   ✅ cortex/adr/01-proposed: 1 consistent
      #   ⚠️  Found 0 empty shell(s):
      ```
      **根因(读码确认)**:`commands/probe.ts:10-14` 的三条 pattern 是
      `^- \[ \] ⚠️ PLACEHOLDER_` / `^- \[ \] 需求\d` / `^<!-- 填写` ——
      全是**任务卡形态**(复选框 + 中文注释)。而 ADR 模板的占位形态是
      `**Choice**: ⚠️ PLACEHOLDER_SCHEME`(无 `- [ ] ` 前缀)、裸 `-` 项目符号、
      `<!-- ⚠️ REQUIRED: ... -->`(英文)。**三条 pattern 一条也匹配不上。**
      而 `probe.ts:556` 明确把 `adrFiles` 传进了 `detectEmptyShells` ——
      **扫了,但永远扫不出来**。
      影响:`ADR` 是"决策的家",而**空 ADR 与填好的 ADR 在 probe 眼里没有区别**;
      S5 ADR 的决策驱动第 2 条(「`probe` 只测空壳,测不了语义」)实际比写下的更弱 ——
      对 ADR **连空壳都测不了**。
      **修**:①ADRs 用 ADR 自己的占位形态补 pattern(至少
      `^\*\*Choice\*\*:.*PLACEHOLDER_` 与「所有必填段均为裸 `-`」两式);
      ②补一条单测:CLI 建 ADR → 未填 → `isEmptyShell` 必须为 `true`
      (现在这条测试会红,正是它该红);③顺带核对 EPIC 模板是否同病。
      **注**:与 B20 同类 —— 都是本次善后**顺带实测**出来的、机制自身的静默失效。

**历史记录措辞**(就地改,不保留为"历史" —— 见 `feedback_handoff_typos_must_be_fixed`)

- [x] **B4** 卡面 :64 / `daily/2026-09-09.md:20` 的「Goose #11600 防线」措辞夸大:
      judge 实查父 commit,**旧代码无可达的"递归进 symlink 目标"路径**。真实价值 =
      显式不变式 + 断链修复 + 防未来回退。
- [x] **B5** 测试数无环境标注且值本身不稳:卡面 :71 裸写「213 pass / 0 fail」。
      实为**条件值** —— canonical 调用下 `213 pass / 1 skip / 544 expect / 16 files`
      @ Bun 1.3.11 / macOS;`214/0/0` 仅在 git spawn 探针成功时成立。
- [x] **B6** 「独立测试」混淆两层:知识独立(prompt 零上下文)**达成**,
      编排独立(同 session)**未达成**。措辞需分层。
      载体 = 原卡 Progress Log 的 `212 tests independently reproduced` /
      `ZK re-trial 8.5/10` 两句:「独立」在那里同时被用来指
      (i) 结论不是自证的(prompt 零上下文 → **成立**)、
      (ii) 结论是被别人验的(不同 session / 不同方 → **不成立**:折入是同 session 同 agent 做的)。
      这两件事必须分开写 —— 否则 (i) 的成立会被读成 (ii) 的成立。
      **这正是 S6 ADR 立的规矩的对象**(评审对象须 commit-pinned)。
      **规矩已落盘**(2026-09-10):`ADR-20260910113730375`(accepted)——
      规则本身 + claims-not-scores 表述表 + 证据卫生条款,落在
      `zk-review.md` / `AGENTS.md` § ZK Review Gate / `cortex task done` 提示三处。
      **本条仍要做**:ADR 写的是"以后怎么写",本卡这条要改的是**已经写错的那两处文字**。
- [x] **B7** 卡面 Progress Log 引 `ZK re-trial 8.5/10` 时**未写覆盖范围**。
      judge 特别裁决一:8.5 **只覆盖 `c8ebcc76`**;特别裁决二:折入 `2686e0d4` 后
      的 HEAD **未经任何独立评审**(本次辩论是该状态首次外部审视)。
      缺了这一句,读者必然把 8.5 读成"当前状态 8.5" —— 而折入 diff 是 **6 文件 / +56 / −8**,
      且带进一条后来被证伪的 claim(`65b02db7` 删除)。
      **改法同 B4/B5**:卡面正文不动,由原卡 `## Notes` 注记补「8.5 @ c8ebcc76;折后未评」。
      (B6 改"独立"二字的用法,B7 补"覆盖到哪个 commit" —— 同一句话的两处,分开改)
- [x] **B16** `decision-log` 时间戳不可信,属**证据卫生**缺陷:
      `playground/2026-09-10-inbox-debate/raw/decision-log.jsonl` 文件 mtime = 22:52,
      其内部时间戳 = 23:20–23:45,**自相矛盾**;折入 commit 时间戳 = 22:56:31。
      judge 结论:「墙钟彻底不可信,顺序只能由**逻辑 + 文件系统锚**定。」
      **规则侧已落盘**(`ADR-20260910113730375` 证据卫生条款:时序断言只接受逻辑约束 /
      文件系统锚,冲突时以逻辑约束为准)。
      **本条仍要做**:是 decision-log **这一份产物本身**的可用性 ——
      要么修产出端(时间戳来源/写入方式),要么在 `reproduce-sh-bdd` 契约里写明
      「decision-log 不是时钟」。**不能只在 ADR 里写"别信它"就完事** ——
      下个 agent 仍会拿它当时间线用。关联 `ADR-20260518155038335`(decision-log 的出处)。

> **B4/B5 的改法**:卡面(`04-completed/TASK-20260909155425926`)正文**不改** ——
> 项目纪律禁止重写已收卡(见 Technical Approach)。卡面的错由**原卡 `## Notes` 注记**
> 承担(写明哪句错了、错在哪、以什么为准);`daily/2026-09-09.md` 是**活文档**,
> 下任 agent 当事实读,故**就地改**(`feedback_handoff_typos_must_be_fixed`)。
> 两处的处理不同,是刻意的。**B6/B7 同此改法。**

**Owner 裁决项(不在本卡自裁)** —— 每条给:陈述(事实)/ 选项 / 影响

### B17 — CI 的 Bun 版本未 pin

**陈述(2026-09-10 复核实测)**:`bun-version: latest` 全仓 **8 处**(judge 记的 ×7 漏了
`deploy-pages.yml:30`)—— `.github/workflows/test.yml` 5 处(`:20/:58/:91/:117/:143`)+
`release.yml` 2 处(`:30/:121`)+ `deploy-pages.yml` 1 处(`:30`)。
背景:B11 立了"`node:*` 是 Bun 兼容层,行为假设必须有 Bun 实测测试钉死"的纪律 ——
那么"跑在哪个 Bun 上"就从一个无关细节变成了**证据的一部分**:同一条 dormancy 测试,
Bun 1.3 与 2.x 下的通过与否可能不同,而 CI 不告诉你是哪个。

**选项**
| | 做法 | 代价 |
|---|---|---|
| **A** | 维持 `latest` | 零维护;但 CI 绿不说明本地绿,且失败会以"上游改了"的形式突然出现,不可预算 |
| **B** | pin 到具体版本(如 `1.3.11`,与 judge 复跑环境一致)+ 手动升级窗口 | 需一条"何时升"的规矩,否则变成无人升的死版本;换来"CI 结论可归因到版本" |
| **C** | pin major.minor(如 `1.3.x`) | 折中:吃补丁不吃 breaking;但"1.3.x 内行为是否可能变"本身未证,等于把不确定性留在中间 |

**影响**:A 与项目的"行为假设必须有测试钉死"纪律有张力(测试钉住了行为,却没钉住解释器);
C 引入一个未证的中间假设。**我倾向 B**,但这是"要不要为此付维护成本"的取舍,归 owner。

**✅ 裁决(2026-09-10,owner)= B**。owner 原话:「**B17 基本按 B 比较好。升级本身就是一个
比较严肃的问题。**」→ 8 处全部 pin 到 `1.3.11`(与测试基线同一版本),并配一条四步升级窗口;
决策与"何时升"的规矩落在 `AGENTS.md §9「Bun version pin」`,理由落 **ADR-20260910120047160**
(accepted)。**选项 C 的判词已写进 ADR**:它引入的"1.3.x 内行为不变"是一个**未证的假设**,
而 B11 的要点正是"行为假设必须有出处"。

### B18 — 名单外 fan-out 目标:零 advisory 与"已检查且安全"不可区分

**陈述(2026-09-10 复核,顺带定位)**:`collectTriggerHazards` 与 `collectDuplicateScans`
(`layout-policy.ts:32-72`)都是先 `layoutsScanning(t)` 再遍历命中行。目标目录不属于任何已知
layout 时,`layoutsScanning` 返回 `[]` → 两个循环都不进 → **零输出**。
于是 `also_link_to = [".some-new-cli/skills"]` 与 `[".claude/skills"]`(默认 deck,
经设计休眠)**在输出上完全一样**。而"没有输出"对人/agent 的读法是"检查过了,没问题",
不是"没有这份数据"。这与 `no-source-no-rule` 的推论同形:**缺失的规则被读成了通过的规则**。
(注:`deck per-run <未知 id>` 那条**不静默** —— `per-run.ts:42-46` 返回 error + 支持列表。
本项说的只有 fan-out 警告这条路。)

**选项**
| | 做法 | 代价 |
|---|---|---|
| **A** | 维持默认静默 | 默认 deck 零噪音(有 dormancy 测试保着);代价是名单外目标拿到的是**假的安全感** |
| **B** | 名单外目标出 **info 级**一行(`<dir>: no layout data — hazards unknown`) | 与"治理层"叙事一致;代价是任何非标准目标都加一行,可能被当噪音而学会忽略 → 警告疲劳 |
| **C** | 只在**非默认** deck 上出(info),默认 deck 静默 | 保住默认零噪音;但"默认/非默认"的判据要定,规则变复杂 |

**影响**:这是产品取向不是技术题 —— B 是"诚实优先",A 是"信噪比优先",
两者都能自洽,但**必须选一个并写进 README**,否则下个 agent 会按自己的偏好改回去。
现状(A)的问题不是"它错了",是"它是个没人做过的决定"。归 owner。

**✅ 裁决(2026-09-10,owner)= B + 豁免标记**。owner 原话:
「**B18 按照 B 可以,另外增加 deck 能力标记类似 gitignored 的东西豁免静默就好吧**」
→ ①名单外目标默认出 **info 一行**;②新增 `[deck] acknowledged_unlisted = [...]`,
**gitignore 式:列出即静默,不列即发声**。规则落 **ADR-20260910120047122**(accepted)。

**两条被 ADR 显式记下的边界**(否则它就是个静音开关):
豁免**只关掉"无数据"这条**,名单内的 data-loss hazard 照常发声;
豁免模式**不检测陈旧**(匹配不到任何目标的模式静默失效)——接受,并写明是记账项而非自动检查项。

**✅ 追加边界(2026-09-10,owner 现场)= 层级错位出 warning,豁免不适用**。
owner 原话:「**如果敢配全局目录到 skill 目录,我都觉得首先要警告了**」+
「**不要自作聪明去推测各种奇葩写法,明明你们 agents 可以帮忙修正回正路到 toml 里**」。
→ 名单外目标实为两类:表里**没有**这个位置(info,如上)vs 表里**有**且写着对的目录
(`~/.claude`、`~/.config` → warning)。判据只用表内数据(`skillsDirsUnder`),
不发明启发式、不模糊匹配、不自动改写;修正动作是 agent 把正确目录写回 toml。
落 `ADR-20260910120047122` 同名追加节,执行细节见 `## Progress Log` 末条。

B17/B18 的结论回填到本卡 `## Notes`。

**已由前置完成(记 done,不在本卡重复)**

- [x] **B1** 撤 opencode 假 source 行 + P6 watch 注记
- [x] **B15** CLI-layout 轴闭数据哲学无 ADR 出处 → 由 two-axis ADR 收掉

## Technical Approach
<!-- ⚠️ REQUIRED: Implementation plan, key decisions, references. Empty = shell, blocked by probe. -->

- **合并同类改**,避免多轮触碰同一函数:
  B2 + B13 + B3 都动 `layoutProblems()` / hazard 数据 → 一次改完再测。
- **B9 抽取**参照包内既有形态:`refresh-plan.ts` 的 plan builder 已是"纯函数 + 入口读盘"范式,
  照抄其形状,不要发明新分层。
- **B8/B11/B12 是删/加行级改动**,风险低但需与代码实况对齐 —— 改前先 grep 确认宣称物确实不存在
  (judge 已双零命中,复跑确认即可)。
- **B4/B5/B6 改的是历史记录**:按项目纪律,事实性错误**就地修正**,不以"历史"名义保留 ——
  下任 agent 会把旧措辞当事实读。注记在 `## Notes` 说明改过什么、为什么。
- **B17 / B18 升级 owner**:本卡只负责把两条整理成可裁决形态(陈述 + 选项 + 影响),
  不代替拍板。
- **不要重开普查**:owner 已定调"agent 自己选的那 16 家"是设计。本卡不含任何
  "换人工名单 / 加自动发现"的项 —— 那是被 ADR 拒绝的方向。

## Acceptance Criteria
<!-- ⚠️ REQUIRED: Testable acceptance criteria. Keeping placeholders = shell. -->

- [x] `cortex probe` 通过(本卡非空壳)
- [x] **B20**:pre-commit 重建触发条件覆盖「任一包的 `src/**` 且该包有 `skill/` 产物」;
      并补 dormancy 式校验(重建后 `git diff --quiet skills/` 为空)
- [x] **B21**:`probe` 能抓出**未填的 ADR** —— 终结条件 = 一条单测:
      `cortex adr` 建出的原始模板 → `isEmptyShell` 为 `true`(现在这条测试会红);
      并核对 EPIC 模板是否同病
- [x] **B2**:`~/.config/goose/skills` 进 `triggerDirs`(`cli-layout.ts:175`),该目录触发
      data-loss 警告,有测试钉死 —— **且 `cli-layout.test.ts:49` 的
      `toEqual(['.goose/skills'])` 已从"钉住漏报"改为"钉住两目录 + 行为"**;
      用 mutation test 证明新断言能抓住旧行为(`triggerDirs` 改回单目录 → 必须红)
- [x] **B13**:`layoutProblems()` 对 `perRoleScoping` 有非空 + 长度检查
- [x] **B3**:`verifiedBy` 字段落地,仅 qwen 行标 `restored`,`layoutProblems()` 对
      "restored 且 note 为空"报错;16 行普查数据未改
- [x] **B9**:抽出的目标计算是纯函数(实现名 **`targetsFromDeck`** —— 吃 parse 后的对象而非路径,才可能不碰 fs;见 Progress Log),`renderPerRun` 签名与行为未变
- [x] **B10**:`safe-remove` 递归删除测试断言嵌套文件内容
- [x] **B8**:deck README 不再把 `buildPrunePlan` / `executePrunePlan` 说成 deck 自己的(归位到 `@lythos/cold-pool`:两个函数确实存在,只是在另一个包)
- [x] **B11/B12**:`AGENTS.md` 语义层纪律成文;`safe-remove.ts` 注释引 Bun 实测测试而非 Node 文档
- [x] **B4/B5/B6/B7**:`daily/2026-09-09.md` **就地**修正完成;卡面**经原卡 Notes 注记**修正
      (正文不动),原卡 Notes 记录了修正项,且注记里写明
      **`ZK 8.5 @ c8ebcc76` + 折入 `2686e0d4` 后未复评**(B7 的验收点 =
      注记里出现 commit sha,而不是只出现数字 8.5)
- [x] **B16**:`decision-log` 的时序不可用性**在产出端或其契约里有落点** ——
      修时间戳来源,或在 `reproduce-sh-bdd` 契约写明「decision-log 不是时钟」。
      仅在 ADR 里声明"别信它"不算完成(ADR-20260910113730375 证据卫生条款)
- [x] **取证未留痕**:`/tmp/arena-p2-adapter-retrial/` 的 ZK 证据已落盘入仓;普查证据与 ZK 证据
      的**落盘位置与命名**已成文(否则本条只是把这一份挪个地方,下批照样丢)
- [x] **B19**:`also-link-to-bdd` 已对齐新归属语义(自建 → 删;外来 → 留 + warn),
      且产出 `decision-log.jsonl` + `judge-verdict.json`(与 `deck-remove-bdd` /
      `to-symlink-snapshot-bdd` 同形 —— 现在只有这两个有产物)
- [x] **B17/B18**:已整理成可裁决形态并呈现 owner,结论(或"待裁决")落在本卡 Notes
- [x] **B17(裁决 B)**:`.github/workflows/` 8 处 `bun-version` 全部为精确版本 `1.3.11`;
      每个文件第一处上方有指向 `AGENTS.md §9` 的注释;`§9` 含"何时升"的四步窗口;
      ADR-20260910120047160 记录选项 C 的拒绝理由
- [x] **B18(裁决 B)**:名单外目标出 info 一行 + `acknowledged_unlisted` 豁免。
      验收点:①`layoutsScanning(t) === []` 时必出 1 行(info 级);②声明过则**零输出**;
      ③豁免**不**抑制 data-loss(反例测试:`['.goose/skills']` + 豁免 → 仍出 data-loss);
      ④默认 deck 与全部 docs-tier 目录仍零输出(dormancy 未破);⑤取向写进 deck README
- [x] **B18 追加边界(owner 现场)**:层级错位(配置根不是 skills 目录)出 warning。
      验收点:①`~/.claude`、`~/.config`、`.agents` 均命中(含绝对路径写法);
      ②目标**就是**表里的 skills 目录时不命中(`.claude/skills` / `.roo/skills` / `.qwen/skills` → 零输出);
      ③`acknowledged_unlisted` 声明后**仍然** warning(豁免不适用);
      ④同一目标只出一个结论(不再同时出 info 行);
      ⑤文案点名该用的目录(不猜写法:绝对路径目标列出两种写法);
      ⑥`~` / `.` 不判(已知边界,README 写明);⑦默认 deck dormancy 未破
- [x] **ADR Follow-up 豁免成文(owner "第二吧")**:`ADR-20260910113534807 §5` +
      writing-guide 一节 + `template.ts` 的 `Follow-up:` 行注释;界线三条(派生新义务 /
      需独立计划 / 待 owner 裁决 → 仍开卡)写明,防退化成"什么都能不开卡"
- [x] **B2(数据)**:`triggerDirs` 覆盖 goose 的**两个**独占目录,且新增的**不变量**测试
      (data-loss hazard 必须覆盖本行 layout 的每个独占目标)在旧值下**实测会红**
- [x] **B3 / B13(数据自检)**:`verifiedBy` 闭集 + restored 行必须有 note;`perRoleScoping`
      非空 + 长度上限(200,出处=当前最长 140 + 余量);两条都有对全部 16 行的断言
- [x] **B9 / B10(测试独立性)**:`targetsFromDeck` 纯函数 + 4 条**不写文件**的测试;
      快照删除补嵌套两层内容断言
- [x] **B8 / B11 / B12(文档与注释)**:deck README 的 PrunePlan 归位到 `@lythos/cold-pool`;
      `AGENTS.md §2` 第 11 条(`node:*` 兼容层纪律);`safe-remove.ts` 改引 Bun 实测测试
- [x] **B20(构建管线)**:pre-commit 触发条件扩到"有 skill 产物的包的 `src/`"+ 陈旧即发声;
      CI 新增机器可判定门(`build --all && git diff --quiet skills/`)—— **首次运行即抓到真陈产物**
- [x] **B21(治理机制)**:ADR 的两条空壳 pattern(未填 `**Choice**` / REQUIRED 段无内容)+
      4 条行为断言;**实测**:CLI 新建未填 ADR 从"报 0"变成"报 1";EPIC 模板实测无此病;
      两条被否决的候选(裸 `-`、按数量断言)留在注释里,防下个 agent 重提
- [x] **B16(证据卫生)**:`ts` 不是时钟写进 `reproduce-sh-bdd-contract.md`(产出端契约),
      不只写在 ADR 里
- [x] **B19 / 取证未留痕(部分)**:场景已**真跑**并新增 PHASE 5 钉新边界;ZK 证据已落盘
      `showcase/2026-09-09-p2-cli-layout-zk-retrial/`;**仍缺 = verdict 产物**(需 agent + judge
      跑一轮)—— 按 owner"大 gap 先跳"记录,不假装完成
- [x] **CI 全绿(本批顺带修复)**:`CLI_TABLE drift tripwire` 报 deck `per-run` 缺表
      (守卫按设计工作,是表错了)—— 已补;本地复跑 CI 全部步骤零失败
- [x] `bun test packages/lythoskill-deck/` 全程保持 `0 fail`,测试数变化只在有意的增删处
      (本卡累计:`227 → 249 pass`,`0 fail` 未破)

## Progress Log
<!-- Update during execution, with timestamps -->

- 2026-09-10: 卡创建(judge must #1)。前置段 S1(B1)与 S2(改名)在开卡同批执行。
- 2026-09-10: **卡面回填 + 原卡注记**(善后计划 S4)。四处修正:
  (1) **B2 的改法从「一行」改写为两处** —— 数据行 `cli-layout.ts:175` **加**
  断言行 `cli-layout.test.ts:49`(原判只看了数据行,漏了那条把漏报钉成绿的断言);
  (2) **B17 计数 7 → 8**(judge 漏了 `deploy-pages.yml:30`),B17/B18 改写为
  「陈述 + 选项 + 影响」的可裁决形态;
  (3) **新增 B19** —— `also-link-to-bdd` 与新的归属语义相冲(本次善后**派生**的既有资产失配);
  (4) **「取证未留痕」补第二例** —— P2 的 ZK 证据只在 `/tmp/arena-p2-adapter-retrial/`,
  未入仓;仓里 `showcase/` + `reproduce.sh` 协议该批**零套用**(核查见该条)。
- 2026-09-10: **新增 B7 + B16**(善后计划 S6 收尾)。善后计划原文假设本卡已含
  「B6/B7/B16」三条,实查**只有 B6** —— B7(8.5 的覆盖范围注记)与 B16(decision-log
  时间戳不可信)在卡里**不存在**,若不补就正好落入本卡自己处理的失效模式:
  **一条只在别处被提到、从未在本卡落地的条目,等同于未记录**。
  - **B7** = judge 附条件 #3 的直接要求;与 B6 是同一句话的两处
    (B6 改「独立」二字的用法,B7 补「覆盖到哪个 commit」)。
  - **B16** = judge §4 的证据卫生缺陷。规则侧已随 `ADR-20260910113730375` 落盘,
    但**产物侧未修** —— 故本条保留在本卡,不在 ADR 里假装已解决。
  - B6 条目下已补指针:规矩落在 `ADR-20260910113730375`(accepted,2026-09-10),
    **但"以后怎么写"与"已写错的那两处文字"是两件事**,后者仍在本卡。
- 2026-09-10: **新增 B21**(S6 收尾时实测发现)。**`probe` 的 empty-shell 检测对 ADR 恒为假** ——
  用 CLI 现建一个一字未填的 ADR,`probe` 报 `0 empty shell(s)`(实测复现,非推断,复现命令见该条)。
  根因:`probe.ts:10-14` 的三条 pattern 全是**任务卡形态**;`adrFiles` 虽然被传进了
  `detectEmptyShells`(`:556`),但 ADR 模板的占位形态一条都匹配不上 —— **扫了,永远扫不出来**。
  这条同时**加强了 S5 ADR 的决策驱动第 2 条**:原文说「`probe` 只测空壳,测不了语义」,
  实测是**对 ADR 连空壳都测不了**。已在 B21 条目内一并订正该措辞的力度。
  (与 B20 同类:都是机制自身的**静默**失效 —— 没有红,没有输出,与"检查过且安全"不可区分。)
- 2026-09-10: `daily/2026-09-09.md` 就地修正完成(:20 交付段措辞 + 环境标注 + 证据落盘缺口;
  :29 P6 尾巴 —— opencode windows hazard **已撤除**,原文"已标注待复勘"不再成立)。
  **卡面正文不改** —— 由原卡 `## Notes` 注记承担(judge 定调:`completed` 保留,注记比改状态诚实)。
- 2026-09-10: 原卡 `TASK-20260909155425926` 的 `## Notes` 已补注记(证伪对照表 +
  Follow-up 指针 + 删除边界被证伪一节)。**S1/S2/S3 的前置产物一并登记**:
  S1 = `e2edc52e` 同批;S2 改名 = `981d48b9` 前批;S3 ADR = `981d48b9` + 收口 `ac859c14`。
- 2026-09-10: **B18 第一版实现被自己撤回一半**(owner 现场提醒,值得留档)。
  第一版给名单外目标加了「按归一化目录名去重」,让同一目录写两遍只报一行。owner 的判据:
  「**解决非常螺丝壳道场的精细优化的时候先回看这是不是某种极为边缘『可能不存在实际用户』
  的场景。如果是,用卫方式先保证头部使用体验,而不是追求一个很复杂的规则包覆盖全部**」,
  并给出一句话形式:「**你不故意根本没人这样用来恶心自己**」。
  - **撤除理由一(正确性)**:归一化把 `~/.x/skills`(家目录)与 `.x/skills`(项目内)
    映射成同一个键 —— 那是**两个真目录**,去重会静默吞掉其中一条警告。
    在一个"为了不静默"的改动里引入一处静默。
  - **撤除理由二(取向)**:它服务的场景是"把同一个目标在 `also_link_to` 里写两遍",
    代价是**多一行 info**。为它把 `normalizeDir` 变公开导出 + 加测试 + 在 ADR 里立规矩,
    是螺丝壳道场。**多一行无害,少一行有害** —— 冲突时选前者。
  - 去重的**缺席**已写进 `ADR-20260910120047122` 的「为什么不去重」一节:
    不写"为什么不做",下个 agent 会把缺席读成疏漏再补回来。
  - 判据已升格为 `AGENTS.md §2` 硬规则第 10 条(跨卡通用),本卡只留实例。
- 2026-09-10: **§5 落地** —— "已 accept 的 ADR 的 Follow-up 由该 ADR 自身承载,不另开卡"
  (owner 裁决「第二吧」)。落在 `ADR-20260910113534807` 的 §5 + writing-guide 新增一节
  (SOURCE,已重建 `skills/`)+ `src/lib/template.ts` 的 `Follow-up:` 行注释
  (**落在写这份清单的那一行上**,同该 ADR §4 的落点二纪律)。
- 2026-09-10: **卡转 in-progress,执行 B17 + B18**(owner 裁决两条都取 B)。两条原是
  "归 owner 的产品取向项",裁决到手后即开工 —— **裁决本身不足以让事情发生,落盘才算**:
  两条各写了一篇 ADR(理由 + 被拒选项),并在**改动发生的那一层**各留一条可发现的入口
  (B18 → deck README § Safety guards + info 行自带的 ref;B17 → 每个 workflow 文件第一处
  上方的注释 + `AGENTS.md §9`)。
  - **B18 的实测复现**(不是推演):`/tmp/b18check/` 造一个 `also_link_to` 含
    `.some-new-cli/skills` 的 deck → `deck link` 输出
    `ℹ️  [info] …/skills: no layout data — hazards unknown`(改动前此处**零输出**);
    把该目标加进 `acknowledged_unlisted` 再跑 → 该行**消失**(`grep -c` = 0)。
  - **B18 实现中改了两处原判**:①`FanOutWarning.severity` 是闭合联合,加 `info` 必须同时
    改渲染端(`link.ts`),否则 info 行会挂着 `⚠️` —— 会把"缺数据"读成"有危险";
    ②~~`normalizeDir` 从 `cli-layout.ts` 私有改为导出,否则同一目录的两种写法
    (`.new/skills` 与 `./.new/skills`)会出两行~~ —— **此项已撤除,见上一条**:
    导出与去重一起撤回,`normalizeDir` 至今仍是私有。此处保留删除线而非删除,
    是因为"曾经这么想过、为什么撤回"本身是下一位需要的信息(不做也要留痕)。
  - **B17 复核修正**:卡面记的 8 处已全数复核命中(`test.yml` 5 + `release.yml` 2 +
    `deploy-pages.yml` 1);另发现 `deploy-pages.yml` 用的是 `setup-bun@v1` 而另两个是 `@v2` ——
    **不在本条范围**(pin 的是解释器不是 action),已写进 ADR 的顺带记账,免得下次复核
    把它当成新发现。
- 2026-09-10: **B18 追加边界行为:层级错位**(owner 现场追加裁决,落在同一篇 ADR)。
  owner 原话:「**说到底,deck toml 在预设的主要场景是什么,千万不要搞错这个来故意为难自己。
  说白了,如果敢配全局目录到 skill 目录,我都觉得首先要警告了**」+
  「**因为现在有 agent,我反而可以认为在有 cli 那个前置知识后,我们是可以发现
  『看上去意图很奇怪的配置』的**」+「**这个类似垃圾邮件原理**」+
  「**不要自己去自作多情/自作聪明去『推测』各种奇葩写法,明明你们 agents 可以帮忙修正回正路到 toml 里**」。
  - **它修的是原决策的一个洞**:名单外目标其实有两类 ——(a) 表里**没有**这个位置
    (`.some-new-cli/skills`,该说"没有数据"),(b) 表里**有**这个位置且写着对的目录
    (`~/.claude`、`~/.config`,该说"这不是 skills 目录")。原决策把 (b) 也塞进了 (a) 的
    info 行 —— **手里有答案却说自己没数据**,这是这份输出第二次说谎
    (第一次是"零输出读成查过了",即本 ADR 的由来)。
  - **常态形状是量出来的,不是假设的**:`grep -rh '^\s*working_set\s*=' examples/ showcase/
    skill-deck.toml` → 68 条里 67 条是 skills 目录,第 68 条是 `"skills"`(build-output 撞名,
    已被 `ADR-20260519144445916` 禁止),**配置根 0 条**。所以一个廉价信号就够
    (垃圾邮件原理:不枚举坏样本,只要低误报率的信号;误报代价是一行,漏报代价是 skills 进配置根)。
  - **判据只用表内数据**:`skillsDirsUnder(dir)` = 表里某个 `fanOutTargets` 位于 dir **之下**
    (任意深度;`.config` 这类"配置根的容器"也算 —— 只判直接父目录会漏掉 owner 点名的那个),
    绝对路径用后缀对齐认(同 `layoutsScanning`)。**不发明启发式**,不模糊匹配,不自动改写。
  - **四条边界**:①豁免不适用(`acknowledged_unlisted` 的语义与这条相反,给它开关 =
    一个"我就要把 skills 建在配置根上"的按钮);②一个目标一个结论(不再同时出 info 行,
    否则两行互相矛盾,且 info 行的建议对 warning 无效);③**不猜写法**——绝对路径目标同时列出
    `.claude/skills` 与 `~/.claude/skills`,不替用户挑(代码无法知道他想的是家目录还是项目内);
    ④**不判 `~` / `.` / 任意大目录**——只有故意才写得出来(§2 规则 10),`working_set` 那侧
    已在 `link.ts:510` 直接拒绝,这是**已知边界不是遗漏**。
  - **一处顺带修正(不是新功能)**:警告块从收束**之后**移到**之前**。印在几十行 `🔗` 之后的
    警告是墓志铭不是守卫 —— 写明"目标配错了"的价值在于它出现在读者还没读过去的时候。
    无测试钉住该顺序(已实查),故移动零测试改动。
  - **实测复现**:`/tmp/wronglevel/`(`HOME` 指向 fixture,不碰真家目录)——
    `also_link_to = ["~/.claude", ".agents"]` 且**两者都进了 `acknowledged_unlisted`** →
    `deck link` 仍出两行 `⚠️ [warning] ... not a skills dir — it contains ...`,
    且排在 `📁 working_set:` 之前;换成正常 deck(`.claude/skills` + `.agents/skills` +
    `~/.qwen/skills`)→ 策略行数 `0`。
  - 判据的两侧现在都有实例:`AGENTS.md §2` 规则 10 补了"**笔误 → 守头部**"与
    "**故意构造 → 不写 handler**"的分野,并点名"你不要自作聪明推测奇葩写法"。
  - **本批实测值**:deck = `244 pass / 1 skip / 0 fail / 615 expect / 245 tests / 16 files`
    (B18 原批 `236 / 1 / 0 / 602 / 237`;差值 = 本轮新增 8 条层级错位测试)。
    cortex = `135 pass / 0 fail / 275 expect / 7 files` @ Bun 1.3.11 / macOS。

- 2026-09-10: **本卡剩余项批量收口(14 项 done / 2 项部分,owner 指示"大 gap 先跳")**。
  两句 owner 定调贯穿本批:①**范围边界**「我们**不应该去深入 CLI 自己的课题**」——
  本表只记"选哪种模式(symlink / cp)+ 要提醒用户什么"所必需的事实;②**框架纪律**
  「**不要自作聪明去推测各种奇葩写法,明明你们 agents 可以帮忙修正回正路到 toml 里**」。
  - **B2(实测修好,并升级成不变量)**:goose 的 `triggerDirs` 补上 `~/.config/goose/skills`。
    关键在**测试形态**的更换:原打算把断言从 `toEqual(['.goose/skills'])` 改成 `toContain` 两个值,
    实际改成了一条**不变量** —— *data-loss hazard 必须覆盖它自己 layout 的每一个**独占**目标*
    (共享目录如 `.agents/skills` 是刻意的例外:默认 deck 就扇进它,覆盖它会让每个默认 deck 报警)。
    这条不变量抓的是**整类漏报**,不是那一行。**已实测它有牙**:把值改回旧写法 → 2 条红。
  - **B13 / B3**:`layoutProblems()` 补 `perRoleScoping` 非空 + 长度上限(200,出处=当前最长行 140
    再留 60 余量,**不是拍的数字**),与 `verifiedBy` 字段(闭集,仅 qwen 行 = `restored`,
    且 restored 行必须在 note 里交代补录经过)。
  - **B9** 抽 `targetsFromDeck(deck, projectDir)` 纯函数 —— 读盘留在入口一行,
    新增 4 条**不写任何文件**的测试;覆盖同一段逻辑的成本从"文件系统"降回"逻辑"。
  - **B10** 快照删除测试补**嵌套两层**的内容断言(只断言顶层目录消失,证不了递归走到底)。
  - **B8** 不是删行而是**归位**:`buildPrunePlan`/`executePrunePlan` **存在**,但属于
    `@lythos/cold-pool`(prune 从冷池规划,不从 `deck.toml`)—— 原文把两个包的架构混成一句了。
  - **B11 / B12**:`AGENTS.md §2` 立第 11 条(`node:*` 是 Bun 兼容层,行为假设必须有 Bun 实测测试);
    `safe-remove.ts` 的纪律改为**点名两条 Bun 下真跑过的测试**,不引 Node 文档。
  - **B20(机制)**:`.husky/pre-commit` 的触发条件从"只认 `packages/*/skill/`"扩到
    "**或任一有 skill 产物的包的 `src/`**",并在重建后**主动报出**"产物此前是陈的"那一行;
    CI 另加一步机器可判定的门:`build --all && git diff --quiet skills/`。
    **这道门第一次运行就抓到了真东西** —— 本批改的 arena 契约确实还没重建进 `skills/`。
  - **B21(机制,实测)**:`probe` 的 empty-shell pattern 全是任务卡形态,对 ADR **恒为假**
    (`adrFiles` 传进去了,一条也匹配不上)。补两式(未填的 `**Choice**: ⚠️ PLACEHOLDER_`;
    REQUIRED 注释后直接接标题=该段无内容),**实测复现**:CLI 新建未填 ADR → 现在报
    `Found 1 empty shell(s): ADR-20260910150422162`(改前 0)。
    两条**被否决**的候选也留档:①`/^-\s*$/`(裸 `-`)在本仓 112 篇 ADR 里命中 **2 篇填好的**
    —— 它会制造关于健康文件的覆盖率假象;②按 pattern 数量断言(`length === 3`)钉的是形状不是行为,
    模板合法增长时它红,而真正的失效它说不出话 —— 已换成 4 条行为断言。EPIC 模板**已实测**无此病。
  - **B16**:`decision-log` 的时间戳矛盾在**契约里**收口(`reproduce-sh-bdd-contract.md`:
    「`ts` 是出处,不是时钟」+ 逻辑约束优先 + 保留 `ts` 的理由),不只写在 ADR 里。
  - **B19(实测推翻立论)**:全量**真跑**了 `also-link-to-bdd` 的 PHASE 1-4(19 条断言全过)——
    **PHASE 2 的 9-11 在新归属语义下照常成立**(那些条目是 deck 自己建的 symlink,归属判定允许删),
    原文"相冲"的判读是错的。新增 PHASE 5 把**真正的新边界**钉住(外来真实目录 / 外来 symlink
    在 fan-out 目标里**必须留下** + 三件套报告,已实测 20-23 全过)。
    **仍缺**:verdict 产物(需 agent + judge 跑一轮)→ 按 owner"大 gap 先跳"记录,不假装完成。
  - **B7 / B4 / B5 / B6**:daily 侧与卡面 Notes 侧**已在前批完成**,本批复核确认并在 AC 里勾掉;
    B7 的覆盖范围行补进原卡 Notes(见下条)。
  - **原卡 Notes 追加一行(B7 的落点)**:`ZK re-trial 8.5/10` 须读作 `8.5 @ c8ebcc76`;
    折入 `2686e0d4`(6 文件 / +56 / −8)后的 HEAD **未经任何独立评审**。
  - **本批实测值**:deck `249 pass / 1 skip / 0 fail / 657 expect / 250 tests / 16 files`;
    cortex `138 pass / 0 fail / 3xx expect / 7 files`;全仓 `bun --filter='*' run test` **零失败**;
    CI 其余步骤本地复跑全绿(cortex BDD 13/13、example decks 29/29、site snippets 61、
    align 75 passed)。@ Bun 1.3.11 / macOS。
  - **顺带修好的一条真红**:GitHub CI 自 2026-09-10 03:45 起失败 ——
    `scripts/check-site-commands.test.ts` 的 **CLI_TABLE drift tripwire** 报 deck 的 `per-run`
    不在守卫表里(P2 批新增子命令时漏更新)。**守卫按设计工作,是表错了**;
    与 2026-08-28 的 `update` 漏项同一类,已补并注明出处。

- 2026-09-10: **B19 verdict 产物落盘(真跑一轮:player + 独立 judge)**,owner 指示「跑一轮补上,这次落盘」。
  产物进 `also-link-to-bdd/`,沿用 `TESTING.md` 的四文件约定,不新发明。
  - **player**(零上下文,只读 `reproduce.sh` 的 stdout 指令)→ 逐条实测 23/23,
    写 `decision-log.jsonl`(13 行,单一时钟源 `date -u +%FT%TZ`)。
  - **judge**(另一次独立调用,只读 `judge.md` + fixture,**不采信 player 的报告**)→ **PASS(23/23)**;
    它**自己重放**了整个生命周期(link → remove → re-add → link → 植入外来条目 → re-link)
    来复核那 17 条已消失在末态里的中间断言,并逐路径 + sha256 对齐 cold pool 与 `skill-deck.lock`。
  - 先给 `judge.md` 补了 PHASE 5 的四条判据(`foreign_*`)—— **没有判据的边界等于没被测**。
  - `judge-verdict.json` 加两个字段并写进 `TESTING.md`:①`reviewed_commit` = `30cda3b6`
    (ADR-20260910113730375 的 commit-pinning);②`independence` **分两层**(knowledge = 零上下文 → 达成;
    orchestration = 同 session 同一编排方 → **不达成**),这正是 B6 要求的"两件事分开写"。
  - **裁判报回三件判据覆盖不到的事**,两件已各自落地:
    1. **并发会话**(就是我)在裁判期间改了工作树 —— 裁判自核 `packages/lythoskill-deck` 干净、
       `cli.ts` 对 HEAD 无 diff,故结论仍绑定 `30cda3b6` ✓(**它没有被脏树带偏,也没有借脏树打折**)。
    2. **归属判据是"形状"不是"出身"**:手工建的、指向本 deck cold pool 的未声明 symlink 会被删。
       本卡复核后**更正了裁判的一处措辞**(它写 "silently";实测 stdout 有 `🗑️ Removed:` 一行)
       —— 已写进 `ADR-20260910112404500` 的「已知边界」节。
       **owner 定调(同日)**:「**担心 agent 拿静默美德扩大解释。事实上这个项目更加推崇 HATEOAS 式的
       exit message**」→ 故该节的结论不是"这不对称是刻意的"就完事,而是**登记为待办**:
       回收那一遍的输出应补齐 what/why/fix 的浓度(见该 ADR「已知边界」节末)。
    3. **`deck add` / `remove` 摧毁 toml 全部注释** → 新卡 `TASK-20260910152029904`
       (player 与 judge **两次独立**撞到;player 自己判成 "cosmetic, no action needed" ——
       **在不该收口的地方收了口**,值得留档)。owner 已给解法方向:**参考 Cargo(`toml_edit`)/ Poetry
       (`tomlkit`)的格式保留编辑,定位用 AST、写回用范围替换**,而不是继续用对象序列化器重写全文。

## Related Files
- Modified:
  - `daily/2026-09-09.md`(S4:@20 交付段措辞/环境标注/证据落盘缺口;@29 P6 尾巴)
  - `cortex/tasks/04-completed/TASK-20260909155425926-cli-adapter-hardening-symlink-tiers-hazard-classes-per-run-dirs.md`
    (S4:补 `## Notes`,唯一一处被允许的 `04-completed/` 改动)
  - **B18**:`packages/lythoskill-deck/src/layout-policy.ts`(severity 加 `info`、
    `FanOutOptions`、`collectUnlistedTargets`;追加 `collectWrongLevelTargets`)、
    `src/link.ts`(`parseAcknowledgedUnlisted` + 读 toml + 分级渲染 + 警告块前移到收束之前)、
    `src/cli-layout.ts`(追加 `skillsDirsUnder`;`normalizeDir` **未**导出,去重已撤)、
    `src/layout-policy.test.ts`(+9 测试,+8 层级错位测试)、
    `packages/lythoskill-deck/README.md` § Safety guards(含 *Wrong-level targets*)
  - **B18 追加边界**同批:`AGENTS.md §2` 规则 10 补两侧分野、
    `cortex/adr/02-accepted/ADR-20260910120047122-…md` 追加 § 层级错位
  - **B17**:`.github/workflows/{test,release,deploy-pages}.yml`、`AGENTS.md §9`
- Added:
  - (本卡自身,`02-in-progress/`;执行时按下述清单落)
  - 执行时预计动的:待落盘位置定案后回填 `/tmp/arena-p2-adapter-retrial/` 的证据
  - `cortex/adr/02-accepted/ADR-20260910120047122-unlisted-fan-out-targets-must-not-be-silent-silence-is-declared-never-default.md`
  - `cortex/adr/02-accepted/ADR-20260910120047160-ci-bun-version-must-be-pinned-to-an-exact-version-never-latest.md`

## Git Commit Message
```
fix(deck): cli-layout follow-ups - B-class findings from inbox-debate (TASK-20260910110545092)

- B2 goose data-loss triggerDirs covers both scanned roots
- B13 perRoleScoping schema check in layoutProblems
- ...
```

## Notes

**来源**:`playground/2026-09-10-inbox-debate/oracle/0001-judge-verdict.md` §4-B。

**B 与 C 的区别**(judge 原文):B 是已证实的事实,C 是未验证方案 —— 混为一谈是后续执行的大忌。
本卡只收 B。defender 提出的 C 类修法可作为实现参考,但**不构成已完成**。

**不要以 defender 的估算为准**:辩论件 `outbox/challenger/0004-reply-owner-five.md:26`
对改名触碰面的估算**低估了**(漏了模块内部自引用、`adapter-policy.ts` 类型引用、
`adapter-policy.test.ts`、`cli.ts:160` 门面串、`link.ts` 散文注释)。以实际 grep 为准。

**刻意不做的**:不重开普查、不换人工名单、不引入自动发现 —— 见 two-axis ADR 的 rejected
alternatives。**该 ADR 已落地**:
`cortex/adr/02-accepted/ADR-20260910113131220-player-axis-is-open-registration-cli-layout-axis-is-closed-sourced-data-two-axes-never-merge.md`
(2026-09-10 收口,`ac859c14`)。其 rejected alternatives 一节即本条所指,可直接引用而非复述。

**改名已落地(2026-09-10,与本卡开卡同批)**:`adapter-registry.ts` → `cli-layout.ts`,
`adapter-policy.ts` → `layout-policy.ts`,`CliAdapter`/`AdapterHazard`/`ADAPTER_REGISTRY`/
`adaptersScanning`/`adapterById`/`registryProblems` → `CliLayout`/`Hazard`/`CLI_LAYOUTS`/
`layoutsScanning`/`layoutById`/`layoutProblems`。**本卡全部活引用已同步到新名**。
下方「不要以 defender 的估算为准」一段里的旧文件名是**历史陈述**(记录当时漏了什么),
保留不改。
测试计数:**改名前后**逐字相同 —— `213 pass / 1 skip / 0 fail / 544 expect / 16 files`
@ Bun 1.3.11 / macOS。**注(2026-09-10,同日追加)**:该值是**改名时点**的值,此后
`TASK-20260910111600389`(commit `e2edc52e`,归属判定 + 新增测试)把它推到了
`227 pass / 1 skip / 0 fail / 589 expect / 228 tests / 16 files`。
**引用任何测试计数时必须带"哪个 commit + 什么环境"** —— 裸值正是 B5 的坑,
本卡不该在 Notes 里自己再踩一次。

**B17 / B18 结论(2026-09-10,owner 拍板):两条都取 B。**

- **B17 = B**:8 处 `bun-version: latest` → `1.3.11`(与测试基线同一版本)。owner 原话:
  「**升级本身就是一个比较严肃的问题。**」→ 升级走四步显式窗口(读 release notes →
  全量本地复跑并按断言写新基线 → 8 处 + `AGENTS.md §9` 同一 commit 内一起动 →
  不许折进无关改动)。决策:**ADR-20260910120047160**(accepted)。
- **B18 = B + 豁免标记**:名单外 fan-out 目标默认出 info 一行;静默改由
  `[deck] acknowledged_unlisted = [...]` **显式声明**(gitignore 式)。
  owner 原话:「**B18 按照 B 可以,另外增加 deck 能力标记类似 gitignored 的东西
  豁免静默就好吧**」。决策:**ADR-20260910120047122**(accepted)。
- **B18 追加边界 = 层级错位出 warning**(owner 现场追加,同 ADR)。owner 原话:
  「**如果敢配全局目录到 skill 目录,我都觉得首先要警告了**」。名单外目标分两类:
  表里**没有**这个位置(info)**vs** 表里**有**且写着对的目录(`~/.claude` / `~/.config` → warning),
  后者豁免管不着。判据只用表内数据,不猜写法、不自动改写 —— 修正由 agent 写回 toml。

**本批实测值**(引用纪律见下):`bun test packages/lythoskill-deck/` =
`244 pass / 1 skip / 0 fail / 615 expect / 245 tests / 16 files` @ Bun 1.3.11 / macOS。
改动前同命令 = `227 / 1 / 0 / 589 / 228 / 16`(差值来自 B18 新增的 9 条 + 层级错位 8 条测试)。

**B18 的实现边界(四条,ADR 里也写了,这里留操作口径)**:
1. 豁免**只关掉"无数据"这一条**。反例测试钉死:`collectFanOutWarnings(['.goose/skills'],
   { acknowledgedUnlisted: ['.goose/skills'] })` 仍必须出 `data-loss`。
2. 豁免**不检测陈旧** —— 匹配不到目标的模式静默失效。这是记账项,不是自动检查项。
3. 信息级用 `ℹ️` 渲染、排在最后;`⚠️` 保留给 data-loss/warning。混用会把"缺数据"读成"有危险"。
4. **层级错位**是 warning 且**无豁免**:豁免的语义是"我知道这里没有数据",这条是
   "表里有数据且说这个配置是错的",两者相反。给后者开关 = 一个"我就要把 skills 建在
   配置根上"的按钮,而没有一个真实 deck 需要它。

**S4 回填时发现的两件事(2026-09-10)**

1. **"fan-out 有可复盘的 E2E"目前不成立**(详见 Requirements「取证未留痕」第二例)。
   协议在、脚本在,**裁决不在**:deck 现有 5 个 BDD scenario 里只有 2 个带 verdict 产物,
   而**唯一覆盖 fan-out 的 `also-link-to-bdd` 恰好没有**,且从未被执行过
   (Step 3 是 IoC 提示,最后一次触碰是 `9f22d497 docs(readme)`)。
   → 记 B19,并对齐新归属语义。
2. **B2 的"一行"是错的**(见 Requirements B2)。成因值得记:判据取自**数据行目视**,
   而那条把漏报钉成绿的断言**就在同文件同 describe 里** ——
   测试与实现出自同一处理解时,测试不是独立的第二意见,是同一处理解的第二份抄写。
   这与 `targetModeOverride` 只喂 cline 一个输入是同一种病。
   → 已被 S5 ADR(提案纪律)与 S6 ADR(评审对象须 commit-pinned)分别从
   "决策落盘"与"评审对象"两侧收口。

### 这张卡到底改了什么(相对"改之前 link 也能用")

**前提**:改动之前 `deck link` **是能用的**。默认 deck(`.claude/skills` + `.agents/skills`)
从头到尾零警告、行为不变 —— 而且今天仍然如此(有 dormancy 测试钉着)。本卡与其承接的 P2 批
**不是"修好了一个坏东西"**,而是:已经把机制跑对了的地方,把**"错了也不说话"改成会说话**。
按用户可见度分三层:

**一、真的会改变 `deck link` 输出的(用户能看见)**
- `also_link_to` 指到 CLI 的**配置根**(`~/.claude`、`~/.config`)→ 新的 `warning`,并点名该用哪个目录。
  此前要么什么都不说,要么一行**可被豁免**的 info。
- `~/.config/goose/skills` 当 fan-out 目标 → 此前**漏报** data-loss 警告(B2),现在会报。
- 名单外目标 → 一行 info;确知无关可用 `acknowledged_unlisted` 声明静默(B18)。
- 警告块**位置前移**到收束之前(此前印在几十行 `🔗` 之后 = 墓志铭)。

**二、不改变输出、但改机制(用户看不见,影响未来每一次)**
- CI 的解释器 pin 到 `1.3.11` + 写死的升级窗口(B17)—— "CI 绿"从此**可归因**。
- `probe` 现在**能**发现空 ADR(此前 pattern 全是任务卡形态,对 ADR 恒为假 → 机制静默失效)。
- pre-commit 与 CI 各自新增"产物 vs 来源"同步门(B20);CI 那道**第一次运行就抓到一份真陈产物**。
- `decision-log` 契约写明「`ts` 是出处,不是时钟」(B16)。

**三、不改行为,只改"我们说的话是否准确"**
B2/B3/B13(数据)、B8/B11/B12(文档与注释)、B9/B10(测试的独立性)、B19(场景对齐),
以及 B4/B5/B6/B7(历史记录里被夸大或缺失的限定)。

**边界说明(防止把这张卡读大)**:本卡**不含任何删除路径的修复**。删除边界从"目录包容"
改为"归属"(k8s `ownerReferences`)是**上一张卡** `TASK-20260910111600389`(已收,
commit `e2edc52e`)—— 但它正是本卡多数"为什么现在敢报"的前提:不知道归属时,报出来的建议
也只能是"你自己确认"。本卡唯一的 data-loss 相关项(B2)是**警告漏报**,不是删除行为本身出错。
