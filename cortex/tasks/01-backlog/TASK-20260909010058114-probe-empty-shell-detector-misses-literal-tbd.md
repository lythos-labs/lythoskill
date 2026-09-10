# TASK-20260909010058114 — probe empty-shell detector misses literal "TBD"

## Background

Surfaced by arena cell S4a (run archived at `playground/2026-09-09-arena-cortex-desc-ab/`, judge-verdict.md §5.2).
A task card whose Requirements/Approach/Acceptance Criteria sections contain the literal text
"TBD" — but no `⚠️ PLACEHOLDER_` marker — passes `cortex probe`'s empty-shell check as a
non-empty card. The seeded arena card (all sections "TBD") was flagged stale but NOT
empty-shell until a human/agent read the content.

## Why

Empty-shell detection is the gate that keeps unassignable cards from entering the dispatch
pipeline. A card full of "TBD" is exactly as unassignable as one with `⚠️ PLACEHOLDER_`, but
the detector only matches the marker pattern. Detection gap = silent pipeline pollution.

## Approach

Add a TBD-literal pattern to the empty-shell detector in the probe implementation
(`packages/lythoskill-project-cortex/src/` — locate the existing `⚠️ PLACEHOLDER_` match and
extend it). Match case-insensitive `TBD` (and likely `TODO`/`FIXME`?) as section-body-only
signals, not prose mentions, to avoid false positives on legitimate text. Add dormancy tests:
happy-path cards with real content must NOT flag; TBD-filled cards MUST flag.

## Acceptance Criteria

- [x] A card with all sections literal "TBD" is flagged empty-shell by `cortex probe`
- [x] A fully-written card produces zero empty-shell findings (dormancy: no false positives)
- [x] New detector patterns covered by unit tests; cortex suite green

## Progress Log

- 2026-09-11 — landed. Env: bun 1.3.11, macOS 15.7.4 (Darwin 24.6.0, arm64).
- **Pattern** (6th entry in `EMPTY_SHELL_PATTERNS`, `src/commands/probe.ts`):
  `/^[ \t]*(?:[-*][ \t]+(?:\[[ xX]\][ \t]+)?)?(?:TBD|TODO|FIXME)[ \t]*[:：]?[ \t]*$/im`
  — whole-line only: the line must carry nothing but the token (± list bullet / template-checkbox,
  ± trailing colon). One rule, not three: *a line whose entire payload is a placeholder token is a
  placeholder*. That is the discriminator against prose mentions.
- **Mutation pins** (each mutation applied to a scratch copy of `probe.ts`, then restored; source
  verified byte-identical to the pre-mutation copy, `git diff --stat` unchanged):
  | mutation | tests that go red |
  |---|---|
  | drop the whole pattern | 5 unit + 1 `executeProbePlan` integration |
  | drop `(?:[-*]…)?` prefix group | `detects a late fill that keeps the template's list punctuation` |
  | drop `TODO\|FIXME` alternation | 4 (`list punctuation`, `TODO and FIXME`, `case-insensitively`, `trailing colon`) |
  | drop the `i` flag | `matches the token case-insensitively` |
  | drop `[:：]?` | `detects a lone token with a trailing colon` |
  | replace with **rejected** free-text `/\b(?:TBD\|TODO\|FIXME)\b/i` | both DORMANCY tests + `patterns are multiline-aware` |
- **Corpus measurement** (real exported detector, real scan semantics — `TASK-`/`EPIC-`/`ADR-` prefix):
  540 scanned cards → **0 hits**. Whole repo, 17,259 `.md` files → **0 hits**.
  The rejected free-text form hits **10 of the 540** — all of them filled (3 completed tasks,
  3 done epics, 3 accepted ADRs, + this card itself), i.e. exactly the "manufactured coverage
  claim about healthy files" failure mode the rejected `/^-\s*$/` bullet pattern was dropped for.
- **Baseline**: `bun test packages/lythoskill-project-cortex/` — before 150 pass / 0 fail,
  after **160 pass / 0 fail** (10 new tests: 7 `isEmptyShell`, 3 `executeProbePlan`, minus the
  one split into three for 1:1 mutation pins). `bun packages/lythoskill-project-cortex/src/cli.ts probe`
  on this repo: `540 documents checked, 0 empty shells (mode: default)` — unchanged, no new findings.
- **Not covered, deliberately** (螺丝壳道场): `**TBD**`-style exotic spellings (no normalization —
  hard rule 10: detect, don't guess), and fenced code blocks containing a bare `TODO` line
  (0 instances in 17,259 files) — the pattern is fence-unaware by design.
- **Landing note for the next reader**: the code landed in `5a853c71` (`docs(cortex): fix a dead
  INDEX pointer…`) — a concurrently-running agent in this repo swept both agents' staged files into
  its own commit before this card's commit ran. So `git log -- .../commands/probe.ts` points at a
  `docs(cortex):` subject; the pattern, the 10 tests and this card's AC ticks are all in it. No
  content was lost and nothing was rewritten (the commit is already on `origin/main`).

## References

- Judge finding: `playground/2026-09-09-arena-cortex-desc-ab/judge-verdict.md` §5.2
- Detector source: probe implementation under `packages/lythoskill-project-cortex/src/`
