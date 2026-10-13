# REMINDERS — 协议、由来与留痕

> 本文是 `cortex/REMINDERS.toml` 的人类可读 companion:协议摘要、条目由来、
> 接管与退役留痕。**改 TOML 之前先读本文**;改完在下方留一行。
> 执行细节(reconcile 步骤 / prompt 契约 / cron 卫生)见 skill:
> `lythoskill-reminders`(skill-only,本仓 skills/ 下,若未入 deck 工作集
> 读 `packages/lythoskill-reminders/skill/`)。

## 模型一句话

TOML 是 SSOT(该挂什么钟),session cron 是派生易失态(现在挂着什么)。
新 session / compaction 之后只信 TOML;reconcile 让影子跟上真身。

## 并发协议(摘要)

- 锁目录 `.reminders-owner.lock/`(owner.json:session_id + lease_until=now+3d;
  last-heartbeat:R0 每次 firing 落盘的 ISO 活性证据)。
  **运行时态,已 gitignore,永不提交。**
- 只有锁主 reconcile R 系提醒;非锁主入场自我清场(CronDelete 自己的 R 系)。
- 心跳提醒(R0)每日续租 + 补挂缺员;锁过期/消失时抢占接管并在 daily 落一行。
- **fork/clear 再确认**:未来 lease ≠ 锁主活着(clear/fork 走的 owner 不再续租);
  非锁主须读 last-heartbeat——新鲜才服从,过期=僵尸,接管勿干等。
- 全文(三分支、僵尸判定、抢占、可移植性):skill 的 `references/lease-protocol.md`。

## 条目由来(origin log)

| 条目 | 设立日期 | 由来 |
|------|----------|------|
| R0 heartbeat | 2026-10-13 | 站长多 session(fork/clear 频繁)共用这个 repo,需要 lease 防护;prompt 照抄跑通原形 |
| R1 weekly 复盘 | 2026-10-13 | W36 曾断链一周需 catch-up(09-12 daily 自记),周复盘靠人记会丢;调 scribe-weekly skill |
| R2 probe 周清扫 | 2026-10-13 | probe issues 17→18 自然陈化(09-11→10-13 无人清扫),stale backlog/epic drift/wiki 结构漂移需要周期性处置 |
| R3 dogfood 三日评审 | 2026-10-13 | 一次性;10-16 评审 registry 自挂三日表现,Done 内含自退役——一次性条目生命周期机制的实景测试 |

不挂候选( deliberate drop ):entropy-check——pre-push 钩子已按 7 天间隔自管
(2026-10-13 push 实证:"Last check 10s ago (< 604800s interval)"),再挂=重做。

## 接管记录(takeover log)

| 日期 | session | 原因(expired / handoff / fork-clear zombie / crash recovery) |
|------|---------|--------------------------------------------|
| 2026-10-13 | 830eb884-74d2-4bb0-ab9d-a5c2d6371267 (Kimi Code) | 首次设立,初始化抢锁 |

## 退役记录(retirement log)

| 日期 | 条目 | 退役原因(expires 条件命中) |
|------|------|------------------------------|
