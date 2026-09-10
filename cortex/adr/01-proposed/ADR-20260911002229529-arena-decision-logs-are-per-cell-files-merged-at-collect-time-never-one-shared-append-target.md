---
supersedes: []
superseded_by: null
# 下面两项是与 task / epic 的机器可读关联(与 ## Related 段同一件事的两份)
epic: null
tasks: [TASK-20260909010121918]
---

# ADR-20260911002229529: arena decision logs are per-cell files merged at collect time, never one shared append target

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-09-10 | Created |

## Background

`decision-log.jsonl` is the arena's primary evidence trail — the judge scores *mindset
alignment* (did the cell follow the skill's SOP, or guess?) from it, so losing entries does
not just lose history, it biases the verdict toward whichever cell wrote last.

Arena cells of one side may share a workdir. The 2026-09-09 cortex-desc A/B run
(`playground/2026-09-09-arena-cortex-desc-ab/`) ran five scenario cells per side (S1a…S5a)
against one `side-a/` workdir, each mandated to write `decision-log.jsonl` to its CWD. A
filename is a path, so all five cells shared one path: **side-a's log holds only S1a's 9
entries** — S3a/S4a/S5a are gone. Side-b's log survived only because its writer happened to
note the interleaving and read before writing; that is luck, not protocol. Judge-verdict §5.4
recorded it as a methodology gap.

The same shape is structural in the CLI runner: `runArenaFromToml` gives every run of a side
the same workdir (`artifactsDir/work/<side>/`), so `runs_per_side > 1` reproduces the defect
with no agent indiscipline required.

## Decision Drivers

- **Evidence integrity.** A verdict is only as good as the trail it is scored from; silent
  loss of one cell's trail is worse than a visible error.
- **No discipline dependency.** The protocol already mandates the log; it must not *also*
  depend on every cell voluntarily re-reading before writing, or on a write being atomic.
- **Attributability.** The judge must be able to say which cell decided what.
- **Mechanical in the CLI.** Naming and merging are glue — per the thin-skill pattern they
  belong in the package, not in prose the agent has to remember.

## Options

### Option A — Per-cell files, merged at collect time (chosen)
Each cell writes `decision-log-<cell-id>.jsonl` (cell id slugged to `[A-Za-z0-9_-]`, so it
can never be a separator, a dotfile, or `..`). The collect step merges them into one
`decision-log.jsonl`, ordered by cell id, lossless, per-cell files retained.

**Pros**:
- Eliminates the shared path entirely — no write contention, so no ordering or atomicity
  assumption to get wrong. Two cells cannot collide even in principle.
- Attributable: the per-cell file *is* the cell's trail; no field injection needed.
- Works for cells whose writes are not append-shaped at all (the 2026-09-09 cells used the
  Write tool, i.e. full-file replace — "append-only discipline" would not have saved them).
- Purely additive: a workdir with one cell keeps the bare `decision-log.jsonl`, and a legacy
  file is treated as an already-merged one-cell log.

**Cons**:
- Collect logic exists in two places (runner's post-cell phase, `archive` per side).
- A merged line carries no cell attribution, so a reader who opens only the merged file
  cannot tell which cell decided what — mitigated by retaining the per-cell files.

### Option B — Append-only discipline (rejected)
Keep one file; mandate that each cell read-then-append in a single operation
(`cat log >> entries` style) instead of writing.

**Pros**:
- One file, no collect step, no naming rule; nothing to merge.

**Cons**:
- Still racy: a read-then-append is multi-step at the filesystem level, and `>>` is atomic
  only below the pipe-buffer size. It converts a certain loss into an intermittent one.
- It assumes the writer is a shell. The observed failure was an agent using a whole-file
  Write; the rule would have to be obeyed *and* the tool choice would have to match.
- Ordering becomes arrival-order, which is not reproducible and not attributable.
- Nothing about it is testable in the CLI — the guarantee lives in agent compliance.

## Decision

**Choice**: Option A — per-cell `decision-log-<cell-id>.jsonl` files, merged at collect time
into one `decision-log.jsonl` per side.

**Rationale**: B's guarantee is a promise; A's guarantee is a filename. The defect was not
that writers were careless — it was that two writers were given the same path by the
protocol, and no amount of discipline makes a shared path safe. A removes the shared resource
rather than regulating access to it, and it is the only option that also fixes the runner's
structural version of the bug.

**Scope**: this governs **arena cells**, which may share a workdir. It deliberately does NOT
touch the `reproduce.sh` BDD contract (`reproduce-sh-bdd-contract.md`), where one scenario
has exactly one agent and the bare `decision-log.jsonl` is correct — that contract now carries
an explicit scope note so a future reader does not "fix" it.

Implemented in `packages/lythoskill-arena/src/preflight.ts` (`decisionLogName`,
`isDecisionLogName`, `mergeDecisionLogs`), wired in `runner.ts` (per-cell id → prompt; merge
after the cell loop) and `cli.ts` (`archive` merges per side).

## Impact

- Positive: concurrent cells can no longer destroy each other's decision trail (pinned by a
  2-writer real-fs test, `preflight.test.ts` → `decision-log — 2-writer concurrency`); the
  judge gains an attributable per-cell view alongside a single readable merged file.
- Negative: two names now exist (`decision-log.jsonl` for one-cell workdirs, per-cell names
  when cells share one), so the rule is "does another cell share your directory", not "always
  the same filename". Two collect code paths to keep in step — both call the one pure merge.
- Accepted weakness: a merged file does not name its cells. Kept deliberately — injecting a
  `cell` field would mutate a format the judge and archived runs already parse, and the
  per-cell files are retained as the attributable view.
- Follow-up: the runner's per-side workdir is still shared across a side's cells, so
  non-log artifacts (e.g. two cells both writing `report.md`) can still clobber. Out of scope
  here; per-cell workdirs (`work/<side>/run-<n>/`) are the candidate fix if it bites.
- Related: **ADR-20260518155038335** establishes the decision-log as an evidence chain;
  **ADR-20260910113730375** restricts its `ts` to provenance ("decision-log is not a clock").
  This ADR governs only *where* the entries live, and changes neither.

## Related
- Related ADR: ADR-20260518155038335 (reproduce.sh + decision-log evidence chain)
- Related ADR: ADR-20260910113730375 (decision-log `ts` is provenance, not a clock)
- Related Epic:
