# TASK-20261013144643210: lythoskill-reminders skill

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-10-13 | Created |
| in-progress | 2026-10-13 | Started |
| review | 2026-10-13 | Deliverables committed |

## Background & Goals
把站长在另一项目跑通的 session 级声明式提醒 registry(7 条目在册:heartbeat R0 /
盯盘 R1 / 周检 R2 / 一次性死期检 R3 R4 / weekly R5 / SERP R6)skill 化进本仓。
决策记录 = **ADR-20261013143648588**(已接受):独立 skill-only 包,registry 约定
`cortex/REMINDERS.toml`(SSOT)+ `cortex/REMINDERS.md`(协议/退役记录),lease
协议照抄已跑通版本。本卡是执行载体,决策不在此重复。

价值:催办型工作获得声明式载体;cron 是 session 级易失态,磁盘 SSOT 对冲
compaction/新 session 失忆; daily/scribe-weekly 获得定时触发入口。

## Requirements
- [x] 新建 skill-only 包 `packages/lythoskill-reminders/skill/`(无 npm 包,scribe/dreaming 先例)
- [x] SKILL.md:模型(SSOT vs 派生态)、reconcile 入场协议、prompt 零上下文契约、cron 卫生(5 字段/避 :00:30/8KiB/50 条上限)、条目生命周期(增/改/退役)
- [x] references/registry-schema.md:字段规范 + 带注释的真实条目样例
- [x] references/lease-protocol.md:多 session 并发租约协议全文(R0 三分支)
- [x] assets/:REMINDERS-TEMPLATE.toml + REMINDERS-TEMPLATE.md 起步模板
- [x] build → `skills/lythoskill-reminders/`,deck link 后 agent 可见
- [x] coach 评审一轮并吸收修改
- [x] 明确 `.reminders-owner.lock/` 属运行时态,须 gitignore、永不提交

## Technical Approach
ADR-20261013143648588 是唯一决策记录,本节只引用不重复。执行要点:
- 纯 SKILL.md 智能,零代码——reconcile 用宿主内置 CronList/CronCreate/CronDelete
- R-id 是匹配键:CronList 回来的 ULID 无法对表,prompt 内嵌 "R1,registry=..." 即键;
  reconcile = 在册条目缺 cron → CronCreate;prompt 里的 R-id 不在册 → CronDelete 派生残渣
- lease 锁目录 `.reminders-owner.lock/`(owner.json: session id + lease_until=now+3d),
  运行时态,模板 README 提示 gitignore
- 样例条目从站长项目原样收录并逐条注释"该字段为什么这样写"

## Acceptance Criteria
- [x] `bun packages/lythoskill-creator/src/cli.ts build lythoskill-reminders` 产物齐(SKILL.md+references+assets)——5 文件,built @ v0.20.0
- [x] coach 评审通过(body 体积/description/渐进披露无 P1)——一轮 subagent 评审:2 P1+2 P2+6 P3 全部就地修复;折后未评 delta=lease 协议 fork/clear 再确认(站长指认),已标注
- [x] 全仓 `bun --filter='*' run test` 不红(skill-only 无测试,门槛是 build + 既有全绿)——v0.20.0 发布跑全仓 1283 pass / 0 fail
- [x] 随 v0.20.0 一起 release(与 INDEX fix 合包,站长已定)——已发布:npm 14 包 0.20.0 + GitHub Release + site deploy 全绿(2026-10-13 核实)

## Progress Log
- 2026-10-13 ADR-20261013143648588 经站长接受(选项 A);卡建于实现前。
- 2026-10-13 coach 评审一轮(subagent,coach rubric):2 P1(reconcile 缺 amend 分支;样例 prompt 缺匹配键标签)+ 2 P2 + 6 P3,全部就地修复(匹配键钉死为字面量 `R<id>,registry=…`)。
- 2026-10-13 **折后未评**(delta 范围=lease 协议,站长指认):fork/clear 僵尸 owner 再确认——未来 lease_until ≠ 锁主活着;非锁主读 owner 的 last-heartbeat 落盘痕迹,过期=僵尸=接管。R0 ① 分支增加写痕迹步骤。全文见 references/lease-protocol.md § Fork / Clear。

## Related Files
- Modified: packages/lythoskill-reminders/(new), skills/lythoskill-reminders/(built)
- Added: 同上

## Git Commit Message
```
feat(reminders): declarative session-reminder registry skill (TASK-20261013144643210)
```

## Notes
ADR 接受 trailer(`ADR: ADR-20261013143648588 accept`)随本卡首个 commit 或 release commit 走。
