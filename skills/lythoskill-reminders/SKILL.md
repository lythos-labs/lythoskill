---
name: lythoskill-reminders
version: 0.19.3
description: |
  Reconciles a declarative session-reminder registry (cortex/REMINDERS.toml)
  against the host's session-scoped cron tools. The committed TOML is the
  SSOT of what should be scheduled; cron jobs are derived, ephemeral state
  (they die with the session). On entry: diff the registry against CronList,
  CronCreate the missing (cron + prompt copied verbatim), CronDelete orphans
  and re-calibrated entries. Multi-session safety via a lease lock with
  heartbeat; prompts are zero-context executable (task + file pointers +
  Done criteria + anti-redo notes). Decisions: ADR-20261013143648588.
when_to_use: |
  User says "remind me periodically", "盯盘", "每周检查一下", "死期前提醒我",
  "set up a recurring check", "registry", "REMINDERS.toml". Session entry /
  onboarding (reconcile registry against live crons). Adding, amending, or
  retiring a reminder entry. Two agent sessions on one machine both want
  to own scheduled prompts (lease dispute). A cron-fired prompt just fired
  and you are the executor. Any "the cron disappeared after a new session"
  confusion.
---

# Reminders — declarative session-reminder registry

> The registry is the truth; the crons are its shadow. Delete the shadow,
> it comes back on the next reconcile. Edit the truth, the shadow follows.

## The Model

```
cortex/REMINDERS.toml   ← SSOT: what SHOULD be scheduled (committed, git-audited)
cortex/REMINDERS.md     ← protocol: origin, lease rules, retirement log (committed)
~ session cron jobs     ← derived: what IS scheduled (ephemeral, dies with session)
.reminders-owner.lock/  ← runtime: who owns the R-series right now (gitignored, never committed)
```

Cron jobs are **derived state** — they do not survive a new session, and they
are invisible to the next agent. The TOML is the only truth any session can
rebuild from. This is the deck philosophy (declarative file → reconcile the
working set) applied to scheduling. Decision record: ADR-20261013143648588.

## Entry Ritual (reconcile)

Run at session start, after onboarding, and after any registry edit.
**Lease check first** — see [references/lease-protocol.md](./references/lease-protocol.md):
only the lock owner maintains R-series crons. Not the owner → self-clean
(CronDelete my R-series) and stop; do not read on.

1. **Lease check.** Not the owner → self-clean and stop — but first run the
   **fork/clear 再确认**: a foreign `lease_until` in the future is NOT proof
   of life (a cleared/forked-away owner stops renewing while its lease
   still sits in the window). Check the owner's `last-heartbeat` disk
   trace — stale ⇒ zombie ⇒ take over, don't wait out the lease. Full
   branch: [references/lease-protocol.md](./references/lease-protocol.md).
2. Read `cortex/REMINDERS.toml`. Absent → nothing to do (offer to scaffold
   from `assets/REMINDERS-TEMPLATE.toml` + `assets/REMINDERS-TEMPLATE.md`
   if the user wants reminders).
3. `CronList`. Match live crons to entries by the **literal tag
   `R<id>,registry=cortex/REMINDERS.toml`** in the cron's prompt — cron
   ULIDs carry no registry identity; the tag is the only key.
4. Diff, three branches:
   - Entry in TOML, no live cron → `CronCreate` with the entry's `cron`
     and `prompt` **copied verbatim** (they are calibrated strings;
     paraphrase them and the matching key breaks).
   - Live cron whose R-id is not in the TOML → `CronDelete` it (derived
     residue of a retired entry).
   - Entry and live cron both exist, but `cron` or `prompt` differ →
     `CronDelete` the stale cron, then `CronCreate` from the entry
     (verbatim). The R-id stays, so history stays readable. *(This is the
     amend branch: without it, re-calibrating an entry silently no-ops.)*

## Prompt Contract (zero-context executable)

A fired prompt runs in a session with **no conversation context**. It must
carry everything:

| Ingredient | Why |
|-----------|-----|
| **Task** | one imperative sentence, self-contained |
| **Pointers** | concrete paths: `cortex/wiki/...`, `pipeline/verify_deploy.sh`, ADR ids — no "继续上次的工作" |
| **Done** | the verifiable landing spot: a line in today's daily, a file committed, a json artifact |
| **Anti-redo** | what NOT to redo ("别重做:不重新提交 sitemap(已在架)") — without it, every firing re-does finished work |
| **Registry tag** | `R<id>,registry=cortex/REMINDERS.toml` — this is the matching key for reconcile |

Budgets: ≤ 8 KiB per prompt (cron cap); ≤ 50 live crons per session
(registry entries share this budget with any other crons you create).

## Cron Hygiene

- 5-field expressions; **avoid :00 and :00/:30 herd marks** — pick off-minute
  offsets (they also survive herd-avoidance jitter better).
- `recurring = true` → steady cadence. `recurring = false` → one-shot,
  date pinned in the cron itself (`18 9 15 12 *`), `expires` names its
  retirement condition.
- Never hand-edit a live cron to "fix" it — edit the TOML and re-run the
  reconcile (delete the stale cron, create the corrected one).

## Entry Lifecycle

- **Add**: append to TOML + one origin line in `REMINDERS.md` (why this
  exists, who asked). Reconcile.
- **Amend**: edit TOML. Reconcile (stale cron gets deleted and recreated
  with the new calibration — the R-id stays, so history stays readable).
- **Retire**: when `expires` condition is met (the executor judges, at
  firing time): delete the TOML entry, append a retirement record to
  `REMINDERS.md` (date + why), `CronDelete` its cron. The firing prompt of
  a one-shot usually performs its own retirement as its Done step.

## Multi-Session Safety

Multiple agent sessions on one machine must not double-hang the R-series.
The lease lock (`.reminders-owner.lock/owner.json`, lease = 3 days) plus a
heartbeat reminder (R0 pattern) decide who reconciles; rivals self-clean.
Full protocol — the three heartbeat branches, lock acquisition, the
gitignore rule: [references/lease-protocol.md](./references/lease-protocol.md).

## Setup in a New Project

1. `cortex init` (or an existing `cortex/` — reminders ride on cortex governance).
2. Copy `assets/REMINDERS-TEMPLATE.toml` → `cortex/REMINDERS.toml`,
   `assets/REMINDERS-TEMPLATE.md` → `cortex/REMINDERS.md`, adjust to taste.
3. Add `.reminders-owner.lock/` to `.gitignore` (runtime lease state —
   committing it would make every clone a lock contender).
4. Reconcile (entry ritual above). Include an R0-style heartbeat if more
   than one session will ever run against this repo.

## Supporting References

| When you need to… | Read |
|--------------------|------|
| Author or review a registry entry (field spec, annotated real entries) | [references/registry-schema.md](./references/registry-schema.md) |
| Handle lock contention, write/port the heartbeat reminder | [references/lease-protocol.md](./references/lease-protocol.md) |
