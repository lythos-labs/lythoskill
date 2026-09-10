# TASK-20260909010121918 — arena decision-log last-writer-wins clobbers concurrent cells

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-09-09 | Created |
| backlog | 2026-09-11 | Implemented + pinned; commits a226ebae (fix) → b5ed0831 (tests) → 2a6d4e5d (docs). Trailer `Task: … review` rejected (backlog → review is not a legal FSM edge) — state walk left to the owner. |

## Background

Surfaced by arena run 2026-09-09 (archived at `playground/2026-09-09-arena-cortex-desc-ab/`,
judge-verdict.md §5.4). The arena protocol mandates each cell append to a shared
`decision-log.jsonl`. Concurrent cells on side-a clobbered each other: only S1a's 9 entries
survived; S3a/S4a entries were overwritten. side-b's log survived only because its writer
noted the interleaving and re-read before appending — luck, not protocol.

## Why

Decision logs are the primary evidence trail for judge scoring. Losing them doesn't just
lose history — it biases A/B verdicts toward whichever cell wrote last, corrupting the
experiment's evidentiary base.

## Approach

**Root cause: the card's premise was right but incomplete — it is not an append race.**
Two writers were handed the *same path* by the protocol, and no discipline makes a shared
path safe:

1. Protocol level: cells of one side share a workdir and were all mandated to write the
   constant filename `decision-log.jsonl`. A filename is a path.
2. CLI level (structural, no agent indiscipline needed): `runArenaFromToml` gives every run
   of a side the same workdir (`artifactsDir/work/<side>/`), so `runs_per_side > 1` collides
   by construction.
3. The 2026-09-09 cells used the **Write tool** (whole-file replace). So option 2's
   read-then-append discipline would not have saved them even if every cell had obeyed it —
   the failure mode is not appendiveness.

Chosen fix = the card's option (1), per-cell files, plus the collect-time merge. Decision
record: **ADR-20260911002229529** (option 2 rejected there, with reasons).

Implemented:

- `decisionLogName(cellId)` → `decision-log-<cell-id>.jsonl`, id slugged to `[A-Za-z0-9_-]`
  so it can never be a separator, a dotfile, or `..`. No id → legacy `decision-log.jsonl`.
- `mergeDecisionLogs(sources)` → lossless, ordered by cell id, verbatim lines, no injected
  field. Per-cell files are retained (a merged line carries no cell attribution).
- `runner.ts`: `cellIdOf(cell)` = `<side>-run-<n>`; the per-cell id goes into the prompt, and
  the merged `<artifactsDir>/decision-log.jsonl` is written after the cell loop.
- `cli.ts` `archive`: merges each side's per-cell logs into `<out>/<side>/decision-log.jsonl`.
  A side whose only log is the bare `decision-log.jsonl` is already merged — copied untouched.
- Docs: arena SKILL.md (dispatch mandate, collect step, archive contract), arena-runtime.md
  (§ Agent CWD Behavior), and a **scope note** in `reproduce-sh-bdd-contract.md` — the BDD
  contract is single-agent and deliberately keeps `decision-log.jsonl`; the note exists so a
  future reader does not "fix" it.

**Not fixed (recorded, out of scope)**: the runner's workdir is still per *side*, so a side's
cells can still clobber each other's *non-log* artifacts (e.g. two cells both writing
`report.md`). Per-cell workdirs (`work/<side>/run-<n>/`) are the candidate fix if it bites;
it is named as follow-up in the ADR. Handling it here would move the cell-isolation boundary,
which no acceptance criterion asked for.

## Acceptance Criteria

- [x] Concurrent cells can no longer clobber each other's decision entries (demonstrate with a 2-writer concurrency test or explicit per-cell file naming)
      → Verify: `bun test packages/lythoskill-arena/src/preflight.test.ts` —
      `decision-log — 2-writer concurrency (real fs) > two cells writing concurrently in ONE
      workdir both survive the merge` (real fs, `Promise.all`, one shared dir). Revert
      `decisionLogName` to the constant → that test reddens (pin 1).
      Also: `runArenaFromToml … > the prompt each cell actually receives names its own log
      file` — four cells, four distinct filenames.
- [x] Judge collect step merges per-cell logs into a single decision-log.jsonl
      → Verify: `bun test packages/lythoskill-arena/` — runner collect test
      (`merges every cell log into <artifactsDir>/decision-log.jsonl`) and archive tests
      (`archive — per-cell decision-log merge`, 3 cases). Pins 3b/4.
      *Interpretation recorded*: "collect step" = the CLI's collect paths — the runner's
      post-cell phase (`arena vs`) and `archive` (agent-orchestrated) — which share one pure
      `mergeDecisionLogs`. In agent-orchestrated mode the judge reads per-cell files at
      collect time and `archive` produces the merged view; SKILL.md's Collect step says so.
- [x] Arena protocol/skill doc updated to match the implemented behavior
      → `packages/lythoskill-arena/skill/SKILL.md` + `references/arena-runtime.md` +
      `references/reproduce-sh-bdd-contract.md`; built to `skills/lythoskill-arena/` via
      `bun packages/lythoskill-creator/src/cli.ts build lythoskill-arena`.

## References

- Judge finding: `playground/2026-09-09-arena-cortex-desc-ab/judge-verdict.md` §5.4
- **ADR-20260911002229529** — per-cell decision logs merged at collect time (option 2 rejected)
- Related: ADR-20260518155038335 (decision-log as evidence chain),
  ADR-20260910113730375 (decision-log `ts` is provenance, not a clock)

## Progress Log

- 2026-09-11 — Implemented + mutation-pinned. Env: **Bun 1.3.11 / macOS Darwin 24.6.0 arm64**.
  - Arena suite: baseline `165 pass / 0 fail / 358 expect` → **`188 pass / 0 fail / 439 expect`**
    (`bun test packages/lythoskill-arena/`, +23 tests).
  - Full monorepo gate: `bun --filter='*' run test` → **1227 pass / 0 fail** across 13 packages.
  - Mutation pins (revert in place, run, restore — each verified byte-identical afterwards):

    | Pin | Reverted | Test that reddens |
    |-----|----------|-------------------|
    | 1 | `decisionLogName` → constant `decision-log.jsonl` | `decision-log — 2-writer concurrency (real fs) > two cells writing concurrently in ONE workdir both survive the merge` (+6 other naming/prompt/merge tests) |
    | 2 | `mergeDecisionLogs` keeps only the first source | `mergeDecisionLogs > keeps every line from every cell — nothing is dropped` (+5, incl. both collect paths) |
    | 3a | runner drops `cellId` from the prompt | `runArenaFromToml — collect merges per-cell decision logs > the prompt each cell actually receives names its own log file` |
    | 3b | runner's post-cell merge removed | `runArenaFromToml — collect merges per-cell decision logs > merges every cell log into <artifactsDir>/decision-log.jsonl` |
    | 4 | `archive` merge disabled | `archive — per-cell decision-log merge > merges side-a per-cell logs into one decision-log.jsonl` (+ mixed-workdir case) |

    Pin 3a initially reddened **nothing** — the runner→prompt wiring was untested, so the
    test above was added to close that gap; the pin was re-run and confirmed. Reported as
    found, not smoothed over.
  - `cortex probe`: my card's "Status History 为空" warning was pre-existing (the card shipped
    without the table); filled in above. Remaining probe findings are unrelated to this card.
  - **State walk left to the owner.** The `Task: TASK-20260909010121918 review` trailer is
    illegal from `backlog` (allowed target: `in-progress`), so the post-commit hook rejects it.
    The executor does not run task state transitions. Commit series:
    `a226ebae` (fix) → `b5ed0831` (tests) → `2a6d4e5d` (docs) → `9273b935` (ADR) →
    `173beddf` (hook: adr accept + INDEX regen; it swept this card's update into its commit).
