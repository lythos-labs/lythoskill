---
supersedes: []
superseded_by: null
# 下面两项是与 task / epic 的机器可读关联(与 ## Related 段同一件事的两份)
epic: null
tasks: []
---

# ADR-20261013143648588: declarative reminder registry as skill

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-10-13 | Created |
| accepted | 2026-10-13 | Accepted |

## Background
站长在另一个项目沉淀了一套 session 级提醒的声明式 registry 并实测跑通(7 个在册条目:
heartbeat 租约 R0 / GSC 盯盘 R1 / 线上卫生周检 R2 / 一次性死期检查 R3、R4 / weekly 复盘 R5 /
SERP 词位 R6)。形态:`cortex/REMINDERS.toml`(条目 SSOT,机读:id/cron/recurring/expires/prompt)
+ `cortex/REMINDERS.md`(协议/由来/并发 lease 锁/退役记录)。入场 reconcile:读本表 → CronList
对照 → 缺员按条目 CronCreate(cron/prompt 照抄)。

本仓缺口:daily / scribe-weekly / dreaming 全是**拉取式**——agent 必须主动读 handoff 才接续;
session cron 能力(CronCreate/CronList/CronDelete)原生存在,但 cron 是 session 级易失态,
新 session / compaction 之后**磁盘上没有任何东西声明"该有哪些在册提醒"**。催办类工作
(盯盘、周检、死期前检)没有载体。

该模式与本仓既有哲学 1:1 同构:声明式 registry 是 SSOT,定时任务是派生易失态——正是
deck 的 skill-deck.toml → working set 哲学换到调度域;prompt 的"零上下文可执行"契约
(任务+指针+Done+别重做)就是 ZK Review 纪律在定时任务上的应用。

## Decision Drivers
- 催办型工作(periodic / deadline)目前无载体,只能靠人记住去派。
- cron 易失(50 条/session 上限、8KiB prompt 上限、不跨 session),必须有磁盘 SSOT 对冲。
- 多 session 并发(同机多个 agent 会话)需要 lease 协议防止重复挂钟/重复执行。
- 复用性:站长已在第二个项目想要同一套东西——这正是 skill 的存在意义。

## Options

### Option A:skill 化为独立 skill-only 包 `lythoskill-reminders`
registry 约定落 `cortex/REMINDERS.toml` + `cortex/REMINDERS.md`;SKILL.md 载 reconcile
协议 + prompt 写作契约 + lease 协议;references 载完整字段规范与.annotated 示例。
**Pros**:
- 零代码,agent 用内置 cron 工具即可完成 reconcile——符合 thin-skill pattern;
- 与 scribe / dreaming / coach 的 skill-only 先例一致;
- registry 随 cortex 治理走,退役有记录、probe 可见;
- 可被任意项目 deck 引用(compose 而非内置)。
**Cons**:
- 多一个 skill 包要维护(frontmatter/description 质量门槛);
- reconcile 依赖 agent 入场自觉(无强制钩子)——与 deck link 同性质,可接受。

### Option B:收进 `lythoskill-project-cortex` 的 SKILL.md
**Pros**:cortex 用户零成本获得;registry 本来就在 cortex/ 下。
**Cons**:该 SKILL.md 已 459 行,逼近渐进披露上限;提醒不只服务 cortex——R5 调
scribe-weekly、Done 落 daily,独立关切被塞进治理 skill 会加速其腐化;违反"一个 skill
一个关切"的 coach 评审口径。

### Option C:npm 包,代码化 reconcile(扫 TOML → 调 CronCreate)
**Pros**:行为可测、可 CI 钉死。
**Cons**:无事可代码化——cron 工具是宿主原生能力,reconcile 是 3 个工具调用的编排,
代码化只是把 SKILL.md 三行指令包成依赖;违反"intelligence in SKILL.md"。

### Option D:不 skill 化,各项目手抄约定
**Pros**:零本仓成本。
**Cons**:每个项目重新发现一遍协议(lease/退役/8KiB 上限),站长已实证要在第二个项目
复用——手抄是技能系统存在之前的状态。

## Decision
**Choice**: Option A——独立 skill-only 包 `lythoskill-reminders`(无 npm 包,源
`packages/lythoskill-reminders/skill/`,build 到 `skills/lythoskill-reminders/`)。
registry 约定 `cortex/REMINDERS.toml`(SSOT)+ `cortex/REMINDERS.md`(协议原文);
协议细节照抄站长已跑通的版本:入场 reconcile 缺员补挂、cron 5 字段避 :00/:30、
prompt ≤8KiB 零上下文可执行(任务+指针+Done+别重做)、lease 锁
`.reminders-owner.lock/owner.json` + R0 式 heartbeat、 rival session 自我清场
(CronDelete 自己的 R 系)、退役 = 删 TOML 条目 + REMINDERS.md 留行。

**Rationale**:模式已被站长项目实证(7 条目在册运转),且与本仓 deck 哲学同构;
Option B 让 459 行的 SKILL.md 继续膨胀且混淆关切;Option C 无事可代码化;
Option D 放弃复用正是 skill 系统要消灭的状态。C1(新关切的新模块)/C2(新概念名
reminder-registry)/C3(宿主选择)命中,故 ADR 记录。

## Impact
- Positive: 催办型工作获得声明式载体;cron 易失性被磁盘 SSOT 对冲;daily / scribe-weekly
  获得定时触发入口;跨项目可复用。
- Negative: 每 session 入场多一次 CronList 对照(成本一次工具调用);skill 数 +1,
  deck 工作集增大一份。
- Follow-up:
  - [x] 本仓自用 `cortex/REMINDERS.toml`(候选:R5 式 weekly 自动复盘、entropy-check
    周期提醒、probe 清扫)——落地前另开卡,本条 ADR 不自动启动它;
    **2026-10-13 落地 @ 0cf47731**(TASK-20261013153805367:R0 heartbeat + R1 weekly
    复盘 + R2 probe 周清扫;entropy-check deliberate drop——pre-push 钩子已自管;
    锁已抢,3 cron 在册核实)
  - [ ] `skill-deck.toml` 是否将 `lythoskill-reminders` 列入工作集,由站长定;
  - [ ] SKILL.md 完成后过 coach 评审(body 体积/description 质量)。
<!-- ^ Follow-up work of an ALREADY-ACCEPTED ADR is carried by THIS ADR — do not open a
     separate card for it. Tick the item here and write the commit sha next to it.
     A card is for work that needs its own criteria / plan / owner decision; an accepted
     ADR's follow-up is that ADR's own consequence, and the ADR is where the next agent
     will look for it. Boundary + the 2026-09-10 evidence: writing-guide.md →
     "An accepted ADR carries its own follow-up" (ADR-20260910113534807 § 5). -->

## Related
- Related ADR:
- Related Epic:
