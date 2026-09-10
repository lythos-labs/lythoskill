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

- [ ] **B2** goose data-loss 漏报:`adapter-registry.ts`(→`cli-layout.ts`)goose 行
      `fanOutTargets` 含 `~/.config/goose/skills`,但 hazard `recursive-unlink-delete` 的
      `triggerDirs` 只有 `[".goose/skills"]`;`collectTriggerHazards`(`adapter-policy.ts`→
      `layout-policy.ts:32-45`)只查 `triggerDirs` → 用户 `also_link_to` 该目录时 data-loss
      警告不触发。修:`triggerDirs` 扩为两目录(`dirMatches` 归一化直接支持,一行)。
      附:范围裁剪需注释说明 #11600 的引用范围。
- [ ] **B13** `perRoleScoping` schema 债:自由文本进 typed schema、**全仓零消费方**、
      无 `registryProblems` 检查。修:`registryProblems()` 加非空 + 长度上限检查。
- [ ] **B3** `verifiedAt` 语义混:16 行同为 `2026-09-09`,但该字段同时承载
      "普查日 / 复核日 / 补录日"三事件,qwen 行的补录出身只活在 note 散文里。
      修:加 `verifiedBy: "survey" | "restored"` 可选字段,仅 qwen 行标 `restored`;
      `registryProblems()` 加「restored 行必须有非空 note」自检。**普查本体一行不动。**
- [ ] **取证未留痕**:2026-09-09 的 16-CLI 普查报告未持久化(`original survey report
      unpersisted`),导致 qwen 行只能按"候选顺序首名"补录。定性 = **取证过程未留痕**,
      非"调研方式不可靠"。修:确立普查证据的落盘位置与命名。

**IO 分离 / 测试**

- [ ] **B9** per-run 半继承:`per-run.ts:97-107` 的 `PerRunIO` 只覆盖 error/exit/log
      (该注的注了),而 `:114-130` 加载段 fs 全裸(existsSync / findFileSync / readFileSync),
      导致 `per-run.test.ts:9/21/78` 被迫 `mkdtempSync` 写真 tmp 才能测入口。
      修:抽 `loadPerRunTargets(deckPath, workdir)` 纯函数(TOML 读盘留在入口一行),
      `renderPerRun` 不动;测试改为纯函数走真 tmp + 入口只留零副作用 smoke。
- [ ] **B10** `safe-remove.test.ts:101-103` 递归删除测试只断言目录消失、**无嵌套内容断言** ——
      Bun 若把 `recursive` 退化成 no-op 仍绿。修:补一行嵌套文件断言。

**文档 / 注释**

- [ ] **B8** deck `README.md:124-125` drift:宣称 `executePrunePlan(plan, io) — IO injected
      (gitPull, delete, log)`,但 `executePrunePlan` **和** `buildPrunePlan` 在 src 均不存在
      (src 无 prune 模块,双零命中)。修:删行或标 `planned`。
- [ ] **B11** `AGENTS.md` 缺成文纪律:「`node:*` 是 Bun 兼容层;不得拿 Node 文档语义当行为
      论证依据;行为假设必须有 Bun 实测测试钉死」。
- [ ] **B12** `safe-remove.ts:9-10` 注释引 Node 语义(lstat 不跟随)而非 Bun 实测测试。
      修:改引 `safe-remove.test.ts:48-60`。

**历史记录措辞**(就地改,不保留为"历史" —— 见 `feedback_handoff_typos_must_be_fixed`)

- [ ] **B4** 卡面 :64 / `daily/2026-09-09.md:20` 的「Goose #11600 防线」措辞夸大:
      judge 实查父 commit,**旧代码无可达的"递归进 symlink 目标"路径**。真实价值 =
      显式不变式 + 断链修复 + 防未来回退。
- [ ] **B5** 测试数无环境标注且值本身不稳:卡面 :71 裸写「213 pass / 0 fail」。
      实为**条件值** —— canonical 调用下 `213 pass / 1 skip / 544 expect / 16 files`
      @ Bun 1.3.11 / macOS;`214/0/0` 仅在 git spawn 探针成功时成立。
- [ ] **B6** 「独立测试」混淆两层:知识独立(prompt 零上下文)**达成**,
      编排独立(同 session)**未达成**。措辞需分层。

**Owner 裁决项(不在本卡自裁)**

- [ ] **B17** CI `bun-version: latest` ×7(`test.yml` 5 处 + `release.yml` 2 处)未 pin ——
      `node:fs` 兼容层语义随版本漂移;真正的钉是 dormancy 测试不是版本号,但 pin + 升级窗口是加固。
- [ ] **B18** 名单外 CLI 的 advisory 静默(默认 fallback):与"治理层"叙事有缝隙。
      "默认静默 vs 默认提示(info 级)"是产品取向,非技术题。

**已由前置完成(记 done,不在本卡重复)**

- [x] **B1** 撤 opencode 假 source 行 + P6 watch 注记
- [x] **B15** CLI-layout 轴闭数据哲学无 ADR 出处 → 由 two-axis ADR 收掉

## Technical Approach
<!-- ⚠️ REQUIRED: Implementation plan, key decisions, references. Empty = shell, blocked by probe. -->

- **合并同类改**,避免多轮触碰同一函数:
  B2 + B13 + B3 都动 `registryProblems()` / hazard 数据 → 一次改完再测。
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
- [ ] **B2**:`~/.config/goose/skills` 进 `triggerDirs`,该目录触发 data-loss 警告,有测试钉死
- [ ] **B13**:`registryProblems()` 对 `perRoleScoping` 有非空 + 长度检查
- [ ] **B3**:`verifiedBy` 字段落地,仅 qwen 行标 `restored`,`registryProblems()` 对
      "restored 且 note 为空"报错;16 行普查数据未改
- [ ] **B9**:`loadPerRunTargets` 是纯函数,`renderPerRun` 签名与行为未变
- [ ] **B10**:`safe-remove` 递归删除测试断言嵌套文件内容
- [ ] **B8**:deck README 不含 `buildPrunePlan` / `executePrunePlan` 的虚假宣称
- [ ] **B11/B12**:`AGENTS.md` 语义层纪律成文;`safe-remove.ts` 注释引 Bun 实测测试而非 Node 文档
- [ ] **B4/B5/B6**:卡面与 daily 措辞修正完成,`## Notes` 记录了修正项
- [ ] **B17/B18**:已整理成可裁决形态并呈现 owner,结论(或"待裁决")落在本卡 Notes
- [ ] `bun test packages/lythoskill-deck/` 全程保持 `0 fail`,测试数变化只在有意的增删处

## Progress Log
<!-- Update during execution, with timestamps -->

- 2026-09-10: 卡创建(judge must #1)。前置段 S1(B1)与 S2(改名)在开卡同批执行。

## Related Files
- Modified:
- Added:

## Git Commit Message
```
fix(deck): cli-layout follow-ups - B-class findings from inbox-debate (TASK-20260910110545092)

- B2 goose data-loss triggerDirs covers both scanned roots
- B13 perRoleScoping schema check in registryProblems
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
alternatives。
