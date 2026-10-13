# Registry Schema — cortex/REMINDERS.toml

> Field-by-field spec, then annotated real entries from the project this
> skill was ported from (seven live entries; the five shown here cover
> every shape — heartbeat / periodic watch / scripted gate / one-shot /
> skill-compose. R4 and R6 are omitted as domain-specific one-offs).
> Read this before adding or amending any entry.

## Fields

| Field | Required | Type | Spec |
|-------|----------|------|------|
| `id` | yes | string | `R<number>`, unique, never reused after retirement (history readability). The id is the reconcile matching key. |
| `cron` | yes | 5-field cron | Local time. Avoid `:00`/`:30` herd marks — off-minute offsets. One-shots pin date+time here (`18 9 15 12 *`). |
| `recurring` | yes | bool | `true` = steady cadence. `false` = one-shot; after firing and Done, the entry retires itself. |
| `expires` | yes | string | Human-readable retirement condition. Judged by the executor at firing time — it is a contract, not code. When it says "并入 R1" or "机制废弃", retire accordingly. |
| `prompt` | yes | string ≤ 8 KiB | Zero-context executable. Must contain the matching key `R<id>,registry=cortex/REMINDERS.toml` and the four contract ingredients: task, pointers, Done, anti-redo. Copy verbatim into CronCreate — paraphrase breaks reconcile. |

Optional conventions (not parsed, human-facing): a trailing comment on the
`id` line naming the reminder (`id = "R2" # 线上卫生周检`); `expires` may
name the follow-up mechanism that replaces this entry.

## Annotated Real Entries

These five ran in production (source project, 2026-10). Annotations explain
*why* each field is the way it is — imitate the shape, not the domain content.

### R0 — heartbeat / lease renewal (the metronome)

```toml
[[reminder]]
id = "R0"
cron = "33 8 * * *"
recurring = true
expires = "无常设 heartbeat=lease 续租,退役=机制本身废弃"
prompt = """R0 heartbeat(R0,registry=cortex/REMINDERS.toml;协议=cortex/REMINDERS.md「并发协议」节):读 .reminders-owner.lock/owner.json——①锁属本 session 且在租:把 lease_until 刷成 now+3 天,把当前 ISO 时间戳写进 .reminders-owner.lock/last-heartbeat(fork/clear 再确认要读的活性证据),顺手 CronList 按 cortex/REMINDERS.toml 补挂缺员,完事(无 chat 输出);②锁属他 session 且在租且 last-heartbeat 新鲜(2×R0 周期内):用 CronDelete 删掉自己所有 R 系 cron(自我清场),不再行动;③锁不存在/已过期/他主 last-heartbeat 过期(fork/clear 僵尸):mkdir 抢占或重写 owner.json、重挂在册提醒,然后在 daily 落一行「R0 接管锁(原因)」。"""
```

Why it works: 08:33 = off-herd. The prompt is the lease protocol's
executable form — the three branches are spelled out so a zero-context
executor never improvises. "无 chat 输出" on branch ① keeps the quiet
path quiet. R0 is the ONLY cron-fired executor allowed to maintain other
entries' crons — session owners still reconcile at entry per SKILL.md;
this line is about what a *fired prompt* may do.

### R1 — periodic watch (steady cadence, exit condition names its replacement)

```toml
[[reminder]]
id = "R1"
cron = "47 9 */2 * *"
recurring = true
expires = "GSC 展示连续两周有数→降周频改表;GSC API 化后改由自动拉数承接"
prompt = """GSC 收录盯盘(R1,registry=cortex/REMINDERS.toml):新站 2026-10-13 上线,观测核心=收录先于一切。做两件:①若 GSC/GA4 API 已通(pipeline/obs 存在采集脚本)则自动拉展示/收录数对照 cortex/wiki/02-research/2026-10-12-sitemap-baseline.md 期望带,偏差落一笔到 daily;②若 API 未通,chat 提醒站长看一眼 GSC「网页编入索引」+「效果」两报告并贴回关键数。Done=当日报/周报里有一行收录状态(数字或「站长未回」)。别重做:不重新提交 sitemap(已在架)。"""
```

Why it works: the prompt degrades gracefully (API path vs human path),
Done accepts a negative answer ("站长未回" is still a landing), and the
anti-redo note stops every firing from resubmitting the sitemap. `expires`
already names the two ways this entry ends.

### R2 — weekly hygiene check (scripted gate + escalation rule)

```toml
[[reminder]]
id = "R2"
cron = "7 10 * * 1"
recurring = true
expires = "无(常设卫生)"
prompt = """线上卫生周检(R2,registry=cortex/REMINDERS.toml):对 https://example.com 跑 bash pipeline/verify_deploy.sh(期望 PASS=9 FAIL=0 SKIP=1,SKIP=ads.txt 设计内)+python3 pipeline/checks.py(PASS)+python3 pipeline/builds_lock.py check(PASS);再 curl 抽查 2 张 og png(/assets/ 下,应 200)。任何 FAIL:有证据的事实错误直修(链四命令+wrangler deploy,DEPLOY.md §1.1),拿不准落 findings 进 daily。Done=daily 里一行「周检绿/红+处置」。"""
```

Why it works: expected outputs are inlined (PASS=9 FAIL=0 SKIP=1) so the
executor can judge green/red without re-deriving the baseline; the
fix-vs-escalate boundary ("有证据直修 / 拿不准落 findings") is stated up
front — that is the autonomy boundary made explicit.

### R3 — one-shot deadline check (self-retiring)

```toml
[[reminder]]
id = "R3"
cron = "18 9 15 12 *"
recurring = false
expires = "ADR-…41 失效条件④被重议/客户端发信方案已稳运行"
prompt = """Gmail send-as 死期前检(R3,registry=cortex/REMINDERS.toml;一次性):2027-01 Gmail 停止第三方 Send mail as。读 cortex/adr/02-accepted/ADR-…41-*(发信决策;ADR id 脱敏截断,实指在册发信 ADR):若当前发信=邮件客户端+SMTP2GO(不依赖 Gmail send-as),确认零影响即可,然后在 cortex/REMINDERS.toml 退役本条(删条目+REMINDERS.md 退役记录留行);若当时仍依赖 Gmail send-as,向站长升级重审(带 ADR 失效条件④)。Done=ADR 回写一行状态+本条退役或升级件落盘。"""
```

Why it works: one-shots pin the date in the cron itself; the prompt's
Done **is** the retirement procedure (delete TOML entry + REMINDERS.md
record), so the entry cleans up after itself. Escalation carries its
evidence (the ADR's expiry clause).

### R5 — invoking another skill (compose, don't duplicate)

```toml
[[reminder]]
id = "R5"
cron = "11 21 * * 0"
recurring = true
expires = "scribe-weekly 被自动化取代"
prompt = """weekly 复盘(R5,registry=cortex/REMINDERS.toml):调用 lythoskill-project-scribe-weekly skill,对过去 7 天 daily 做主线+quest DAG 蒸馏,落 weekly 文件。Done=weekly 文件 commit。"""
```

Why it works: the shortest prompt in the registry — because the substance
lives in the invoked skill. Reminders compose with the skill ecosystem;
they never inline another skill's job.

## Review Checklist (before adding an entry)

- [ ] `id` unique, `R<number>`, never reused
- [ ] cron off-herd (not `:00`/`:30`), 5-field, local time
- [ ] `expires` names a concrete condition or the replacement mechanism
- [ ] prompt ≤ 8 KiB, contains the matching key as a **literal substring**: `R<id>,registry=cortex/REMINDERS.toml` (not "R3" and "registry=" floating separately — the matcher is the joined tag)
- [ ] prompt has all four: task / pointers / Done / anti-redo
- [ ] Done lands somewhere durable (daily line, file, commit) — never "report back to chat" only
- [ ] origin line appended to `cortex/REMINDERS.md`
- [ ] reconcile run after the edit (live cron created, prompt verbatim)
