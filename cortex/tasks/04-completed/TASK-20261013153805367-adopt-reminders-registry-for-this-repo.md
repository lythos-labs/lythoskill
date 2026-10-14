# TASK-20261013153805367: adopt reminders registry for this repo

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-10-13 | Created |
| in-progress | 2026-10-13 | Started |
| review | 2026-10-13 | Deliverables committed |
| completed | 2026-10-14 | Done |

## Background & Goals
ADR-20261013143648588 的 follow-up 明确列出"本仓自用 cortex/REMINDERS.toml"且
"落地前另开卡"。站长 2026-10-13 指令:"基于你对这个项目日常要作的事把任务挂上"
= owner 决定已下,本卡是该落地的执行载体。

目的:把本仓周期性事务(weekly 蒸馏、probe 漂移清扫)从"靠人记住"转为声明式
在册;新 session / compaction 后从 TOML 重建,不依赖会话记忆。

## Requirements
- [x] `cortex/REMINDERS.toml`:R0 heartbeat(多 session 争用防护)+ R1 weekly 复盘 + R2 probe 周清扫;prompt 全带字面量匹配键、四要素齐全
- [x] `cortex/REMINDERS.md`:协议摘要 + 条目由来 + 接管/退役日志(首行=今日抢锁)
- [x] `.gitignore` += `.reminders-owner.lock/`(运行时租约态,永不提交)
- [x] 抢锁:mkdir + owner.json(session id + lease_until=now+3d),daily 落「R0 接管锁」行
- [x] reconcile:CronCreate ×3(cron/prompt 照抄 TOML),CronList 复核在册
- [x] ADR-20261013143648588 Impact follow-up 勾项 + 记 commit sha
- [x] 不挂的候选及理由落卡:entropy-check 已由 pre-push 钩子自管(7 天间隔),挂=重做

## Technical Approach
决策在 ADR(选项 A + registry 约定 cortex/),本卡只执行,不重复记录。
流程照 skill SKILL.md「Setup in a New Project」:cortex 已在 → 模板改造落盘 →
gitignore → 抢锁(协议分支③)→ reconcile(lease-first,三分支)。cron 避 :00/:30:
R0=33 8 * * *(跑通原形),R1=11 21 * * 0,R2=47 9 * * 1。
prompt 中文(与本仓 daily/卡面一致),匹配键字面量 `R<id>,registry=cortex/REMINDERS.toml`。

## Acceptance Criteria
- [x] 三个文件落盘(TOML/MD/gitignore 改动),probe 无 empty-shell 投诉
- [x] CronList 显示 R0/R1/R2 在册,prompt 与 TOML 逐字一致(01M4T39RAGFP…/01M4T39RAHYW…/01M4T39RAJMD…)
- [x] owner.json 在锁目录内,lease_until=now+3d;daily 有接管行(15:45 Addendum)
- [x] ADR follow-up 勾项带 commit sha;卡走 review(随本提交)

## Progress Log
- 2026-10-13 卡建于 ADR follow-up 之上(站长指令=owner 决定)。
- 2026-10-13 抢锁(分支③初始化):owner.json lease_until=2026-10-16T07:40:24Z,last-heartbeat 落盘;.gitignore 已吞锁目录(git check-ignore 实证)。
- 2026-10-13 reconcile 完成:CronCreate ×3 → CronList 核实 R0/R1/R2 在册,prompt 逐字照抄 TOML;daily 接管行已落(Addendum 15:45)。

## Related Files
- Modified:
- Added:

## Git Commit Message
```
feat(scope): description (TASK-20261013153805367)

- Detail 1
- Detail 2
```

## Notes
