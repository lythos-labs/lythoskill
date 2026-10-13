# REMINDERS — 协议、由来与留痕

> 本文是 `cortex/REMINDERS.toml` 的人类可读 companion:协议全文、条目由来、
> 接管与退役留痕。**改 TOML 之前先读本文**;改完在下方留一行。
> 执行细节(reconcile 步骤 / prompt 契约 / cron 卫生)见 skill:
> `lythoskill-reminders`。

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
| _(新条目在此留行:谁要的、解决什么)_ | | |

## 接管记录(takeover log)

| 日期 | session | 原因(expired / handoff / crash recovery) |
|------|---------|--------------------------------------------|

## 退役记录(retirement log)

| 日期 | 条目 | 退役原因(expires 条件命中) |
|------|------|------------------------------|
