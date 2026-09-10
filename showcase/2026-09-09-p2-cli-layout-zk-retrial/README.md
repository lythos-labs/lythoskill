# ZK re-trial evidence — CLI-layout hardening (TASK-20260909155425926)

**What this is.** The zero-knowledge re-trial that scored the CLI-layout hardening work
`8.5/10 (gate ≥7)`. It lived only in `/tmp/arena-p2-adapter-retrial/` — one copy, lost on reboot —
which is the "取证过程未留痕" gap on `TASK-20260910110545092`. Copied here verbatim on 2026-09-10.

**What it pins.** Every claim in `self-report.md` holds under **commit `c8ebcc76`** and that commit
only. The work continued afterwards in `2686e0d4` (fold-back: 6 files, +56/−8), and the tree has
changed a great deal since (fan-out deletion became ownership-scoped, the module was renamed
`adapter-*` → `cli-layout`/`layout-policy`, the out-of-list advisories were added). A bare `8.5` does
not travel; `8.5 @ c8ebcc76` does — see `ADR-20260910113730375` (claims-not-scores, commit-pinning).

| File | What it is |
|---|---|
| `self-report.md` | The re-trial's verdict per acceptance criterion, with per-claim evidence. Names its commit in line 1. |
| `decision-log.jsonl` | 12 decision lines the re-trial agent wrote. `ts` is provenance, **not a clock** — the contract now says so (`reproduce-sh-bdd-contract.md`). |
| `adversarial.test.ts` | 10 adversarial cases (ADV-1…ADV-10) beyond the repo suite. |

**Preserved verbatim, on purpose.** `adversarial.test.ts` imports
`adapter-policy.ts` / `adapter-registry.ts` and an absolute repo path — the module names that were
correct *at `c8ebcc76`*. Rewriting them here would destroy what the file is evidence *of*, so
`reproduce.sh` rewrites them in a temp copy instead.

## Measured status when landed (2026-09-10)

`./reproduce.sh` → **9 pass / 1 fail** against today's tree.

The failure is deliberate to report, not to fix: **ADV-7 never passed, including against the commit
it pins.**

```
ADV-7: also_link_to containing BOTH .agents/skills and a nested duplicate root
  expect(dup).toHaveLength(1)   // received 11
```

Eleven is correct for that input: eleven surveyed CLIs scan `.agents/skills`, and
`collectDuplicateScans` emits one warning per CLI, so a four-target fan-out yields eleven lines, not
one. The case's expectation ("one entry per adapter, not per pair" → 1) does not match the code it
was written against — verified by replaying the assertion against `c8ebcc76`'s own
`adapter-policy.ts`, where it also yields 11 (that function's logic is unchanged since; only names
and wording moved). So this is a red case inside the gate's own suite that the gate reported as
`8.5/10` — the gate's headline did not carry its own red test.

Why this lives here rather than being quietly corrected: the bundle is evidence. Fixing the
assertion would erase the finding that the gate shipped a never-green case; the finding is worth
more than a tidy directory. Whether ADV-7's *intent* (one line per CLI, not per pair) should become
the real behavior is a separate question and not decided here.
