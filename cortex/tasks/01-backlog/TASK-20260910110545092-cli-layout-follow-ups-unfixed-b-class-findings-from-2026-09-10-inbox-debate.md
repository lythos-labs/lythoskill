# TASK-20260910110545092: cli-layout follow-ups - unfixed B-class findings from 2026-09-10 inbox-debate

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-09-10 | Created |

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

- [ ] **B2** goose data-loss 漏报:`cli-layout.ts:166` goose 行
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
- [ ] **B13** `perRoleScoping` schema 债:自由文本进 typed schema、**全仓零消费方**、
      无 `layoutProblems` 检查。修:`layoutProblems()` 加非空 + 长度上限检查。
- [ ] **B3** `verifiedAt` 语义混:16 行同为 `2026-09-09`,但该字段同时承载
      "普查日 / 复核日 / 补录日"三事件,qwen 行的补录出身只活在 note 散文里。
      修:加 `verifiedBy: "survey" | "restored"` 可选字段,仅 qwen 行标 `restored`;
      `layoutProblems()` 加「restored 行必须有非空 note」自检。**普查本体一行不动。**
- [ ] **取证未留痕**:2026-09-09 的 16-CLI 普查报告未持久化(`original survey report
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

**IO 分离 / 测试**

- [ ] **B9** per-run 半继承:`per-run.ts:97-107` 的 `PerRunIO` 只覆盖 error/exit/log
      (该注的注了),而 `:114-130` 加载段 fs 全裸(existsSync / findFileSync / readFileSync),
      导致 `per-run.test.ts:9/21/78` 被迫 `mkdtempSync` 写真 tmp 才能测入口。
      修:抽 `loadPerRunTargets(deckPath, workdir)` 纯函数(TOML 读盘留在入口一行),
      `renderPerRun` 不动;测试改为纯函数走真 tmp + 入口只留零副作用 smoke。
- [ ] **B10** `safe-remove.test.ts:101-103` 递归删除测试只断言目录消失、**无嵌套内容断言** ——
      Bun 若把 `recursive` 退化成 no-op 仍绿。修:补一行嵌套文件断言。
- [ ] **B19(新,2026-09-10 加)** `also-link-to-bdd/reproduce.sh` 的断言与**新归属语义**相冲:
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

- [ ] **B8** deck `README.md:124-125` drift:宣称 `executePrunePlan(plan, io) — IO injected
      (gitPull, delete, log)`,但 `executePrunePlan` **和** `buildPrunePlan` 在 src 均不存在
      (src 无 prune 模块,双零命中)。修:删行或标 `planned`。
- [ ] **B11** `AGENTS.md` 缺成文纪律:「`node:*` 是 Bun 兼容层;不得拿 Node 文档语义当行为
      论证依据;行为假设必须有 Bun 实测测试钉死」。
- [ ] **B12** `safe-remove.ts:9-10` 注释引 Node 语义(lstat 不跟随)而非 Bun 实测测试。
      修:改引 `safe-remove.test.ts:48-60`。

**构建管线**

- [ ] **B20(新,2026-09-10 实测发现)** 生成式 skill 产物**不会因 `src/` 变更而重建**。
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

- [ ] **B21(新,2026-09-10 实测发现)** **`probe` 的 empty-shell 检测对 ADR 恒为假** ——
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

- [ ] **B4** 卡面 :64 / `daily/2026-09-09.md:20` 的「Goose #11600 防线」措辞夸大:
      judge 实查父 commit,**旧代码无可达的"递归进 symlink 目标"路径**。真实价值 =
      显式不变式 + 断链修复 + 防未来回退。
- [ ] **B5** 测试数无环境标注且值本身不稳:卡面 :71 裸写「213 pass / 0 fail」。
      实为**条件值** —— canonical 调用下 `213 pass / 1 skip / 544 expect / 16 files`
      @ Bun 1.3.11 / macOS;`214/0/0` 仅在 git spawn 探针成功时成立。
- [ ] **B6** 「独立测试」混淆两层:知识独立(prompt 零上下文)**达成**,
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
- [ ] **B7** 卡面 Progress Log 引 `ZK re-trial 8.5/10` 时**未写覆盖范围**。
      judge 特别裁决一:8.5 **只覆盖 `c8ebcc76`**;特别裁决二:折入 `2686e0d4` 后
      的 HEAD **未经任何独立评审**(本次辩论是该状态首次外部审视)。
      缺了这一句,读者必然把 8.5 读成"当前状态 8.5" —— 而折入 diff 是 **6 文件 / +56 / −8**,
      且带进一条后来被证伪的 claim(`65b02db7` 删除)。
      **改法同 B4/B5**:卡面正文不动,由原卡 `## Notes` 注记补「8.5 @ c8ebcc76;折后未评」。
      (B6 改"独立"二字的用法,B7 补"覆盖到哪个 commit" —— 同一句话的两处,分开改)
- [ ] **B16** `decision-log` 时间戳不可信,属**证据卫生**缺陷:
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

B17/B18 的结论(或"待裁决")回填到本卡 `## Notes`。

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

- [ ] `cortex probe` 通过(本卡非空壳)
- [ ] **B20**:pre-commit 重建触发条件覆盖「任一包的 `src/**` 且该包有 `skill/` 产物」;
      并补 dormancy 式校验(重建后 `git diff --quiet skills/` 为空)
- [ ] **B21**:`probe` 能抓出**未填的 ADR** —— 终结条件 = 一条单测:
      `cortex adr` 建出的原始模板 → `isEmptyShell` 为 `true`(现在这条测试会红);
      并核对 EPIC 模板是否同病
- [ ] **B2**:`~/.config/goose/skills` 进 `triggerDirs`(`cli-layout.ts:175`),该目录触发
      data-loss 警告,有测试钉死 —— **且 `cli-layout.test.ts:49` 的
      `toEqual(['.goose/skills'])` 已从"钉住漏报"改为"钉住两目录 + 行为"**;
      用 mutation test 证明新断言能抓住旧行为(`triggerDirs` 改回单目录 → 必须红)
- [ ] **B13**:`layoutProblems()` 对 `perRoleScoping` 有非空 + 长度检查
- [ ] **B3**:`verifiedBy` 字段落地,仅 qwen 行标 `restored`,`layoutProblems()` 对
      "restored 且 note 为空"报错;16 行普查数据未改
- [ ] **B9**:`loadPerRunTargets` 是纯函数,`renderPerRun` 签名与行为未变
- [ ] **B10**:`safe-remove` 递归删除测试断言嵌套文件内容
- [ ] **B8**:deck README 不含 `buildPrunePlan` / `executePrunePlan` 的虚假宣称
- [ ] **B11/B12**:`AGENTS.md` 语义层纪律成文;`safe-remove.ts` 注释引 Bun 实测测试而非 Node 文档
- [ ] **B4/B5/B6/B7**:`daily/2026-09-09.md` **就地**修正完成;卡面**经原卡 Notes 注记**修正
      (正文不动),原卡 Notes 记录了修正项,且注记里写明
      **`ZK 8.5 @ c8ebcc76` + 折入 `2686e0d4` 后未复评**(B7 的验收点 =
      注记里出现 commit sha,而不是只出现数字 8.5)
- [ ] **B16**:`decision-log` 的时序不可用性**在产出端或其契约里有落点** ——
      修时间戳来源,或在 `reproduce-sh-bdd` 契约写明「decision-log 不是时钟」。
      仅在 ADR 里声明"别信它"不算完成(ADR-20260910113730375 证据卫生条款)
- [ ] **取证未留痕**:`/tmp/arena-p2-adapter-retrial/` 的 ZK 证据已落盘入仓;普查证据与 ZK 证据
      的**落盘位置与命名**已成文(否则本条只是把这一份挪个地方,下批照样丢)
- [ ] **B19**:`also-link-to-bdd` 已对齐新归属语义(自建 → 删;外来 → 留 + warn),
      且产出 `decision-log.jsonl` + `judge-verdict.json`(与 `deck-remove-bdd` /
      `to-symlink-snapshot-bdd` 同形 —— 现在只有这两个有产物)
- [ ] **B17/B18**:已整理成可裁决形态并呈现 owner,结论(或"待裁决")落在本卡 Notes
- [ ] `bun test packages/lythoskill-deck/` 全程保持 `0 fail`,测试数变化只在有意的增删处

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

## Related Files
- Modified:
  - `daily/2026-09-09.md`(S4:@20 交付段措辞/环境标注/证据落盘缺口;@29 P6 尾巴)
  - `cortex/tasks/04-completed/TASK-20260909155425926-cli-adapter-hardening-symlink-tiers-hazard-classes-per-run-dirs.md`
    (S4:补 `## Notes`,唯一一处被允许的 `04-completed/` 改动)
- Added:
  - (本卡自身,`01-backlog/`;执行时按下述清单落)
  - 执行时预计动的:待落盘位置定案后回填 `/tmp/arena-p2-adapter-retrial/` 的证据

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

**B17 / B18 结论:待裁决(unresolved)** —— 已整理成「陈述 + 选项 + 影响」形态呈 owner
(见 Requirements 对应小节),但 owner 尚未拍板。**本卡不自裁**。两条都不是技术题:
B17 是"要不要为可归因性付版本维护成本",B18 是"诚实优先还是信噪比优先"。
回填此处的时机 = owner 给出结论时。

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
