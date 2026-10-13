# Lease Protocol — who owns the R-series

> One machine, many sessions, one set of reminders. Without a lease, every
> session reconciles on entry and N sessions hang N copies of each cron.
> With the lease, exactly one session maintains the registry; everyone else
> self-cleans. Read this before touching `.reminders-owner.lock/` or the R0
> heartbeat.

## Artifacts

| Path | Role | Committed? |
|------|------|-----------|
| `.reminders-owner.lock/` | Lock directory. Existence = locked. | **Never** — gitignore it. A committed lock makes every clone a contender and turns a runtime race into a git conflict. |
| `.reminders-owner.lock/owner.json` | `{"session_id": "…", "leased_at": "ISO", "lease_until": "ISO"}` | same, never committed |
| `.reminders-owner.lock/last-heartbeat` | One ISO timestamp per R0 firing (append or overwrite). Machine-checkable liveness evidence — see the fork/clear section. | same, never committed |
| `cortex/REMINDERS.toml` | The registry (what to hang) | committed |
| `cortex/REMINDERS.md` | This protocol's prose home + takeover/retirement log | committed |

Lease term: **3 days**, renewed by the R0 heartbeat. `mkdir` is the
acquisition primitive — atomic on POSIX, one winner.

## The Heartbeat (R0) — three branches, no improvisation

R0 fires daily (e.g. 08:33). Its prompt is the executable form of this
protocol; the branches:

1. **Lock is mine and in lease** → renew: write `lease_until = now + 3d`,
   **touch `last-heartbeat` with the current ISO timestamp** (disk liveness
   evidence — the fork/clear re-confirm below reads it), then reconcile
   (CronList vs `cortex/REMINDERS.toml`, CronCreate the
   missing). Silent when nothing is missing — a heartbeat that chatters
   trains everyone to ignore it.
2. **Lock is another session's and in lease** → **self-clean**:
   CronDelete every R-series cron I own, then stop. I do not reconcile, do
   not touch the lock, do not hang anything. (Deleting only my own crons —
   matched by session, not by R-id — is what makes takeover safe.)
3. **Lock missing or expired** → acquire: `mkdir .reminders-owner.lock`
   (EEXIST = lost a race → back to branch 2 behavior), write owner.json,
   re-hang all registry reminders, then one line in today's daily:
   `R0 接管锁`.

Expired = `lease_until` in the past. Clock skew between sessions on one
machine is small; 3 days of slack absorbs the rest. A session that dies
without cleaning up simply ages out.

## Fork / Clear 再确认 (zombie owners)

Session lifecycles break the naive "lease_until is future → owner alive"
inference:

- **`/clear`** (same session id, conversation wiped): crons persist, the
  new conversation has zero memory — but the protocol is executable from
  disk alone, so the owner keeps renewing correctly. No action needed from
  rivals. This is why heartbeat prompts must be fully self-contained.
- **Fork** (new session id): the forked session inherits no crons. On its
  first entry ritual it sees a foreign lock — and must NOT re-hang the
  R-series (that is the double-hang the lease prevents). It self-cleans
  (nothing to clean) and stops.
- **Zombie owner**: a cleared/forked-away owner stops renewing, but its
  `lease_until` can still sit in the future — rivals would silently wait
  out the lease (up to 3 days of dead reminders).

CronList only shows **your own** session's crons, so cross-session liveness
cannot be probed directly. The re-confirm branch therefore uses the
heartbeat's disk trace:

```
lock owner ≠ me, lease_until in the future:
  read last-heartbeat
  fresh (within 2× the R0 cadence, e.g. <48h for a daily R0)
      → owner alive: self-clean, stop            (normal branch ②)
  stale or missing
      → zombie: take over — rewrite owner.json with my session_id,
        reason "fork/clear zombie (last-heartbeat <evidence>)",
        re-hang registry reminders, log to daily + takeover log
```

A live owner refreshes `last-heartbeat` every firing, so the stale signal
is trustworthy. Set the threshold at 2× cadence to absorb one missed
firing; do not set it tighter than 1× (a single late run must not trigger
a takeover battle).

## Portability Notes

- The lock lives in the **project directory** (next to the registry), not
  in `$HOME` — the unit of contention is "sessions working this repo".
- Sessions are distinguished by their session id; write yours into
  owner.json on acquisition so branch 2 has something concrete to compare.
- If your host platform has no session-scoped cron tools, this protocol
  degrades to "one designated runner session"; the registry remains the
  SSOT either way.
- Fired one-shots (`recurring = false`) retire themselves per the schema
  reference; the next owner's reconcile will also delete any residue.

## Takeover Log (in cortex/REMINDERS.md)

Every branch-3 takeover appends one line to the registry's protocol doc —
date, session id, reason (expired / clean handoff / recovered from crash).
This is the audit trail that turns "why did the reminders vanish at 09:12"
into a one-line lookup instead of an archaeology dig.
