---
supersedes: []
superseded_by: null
epic: null
tasks: []
---

# ADR-20261019134800627: private-leak gate — deterministic lint-style check wired into the commit flow

## Status History

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-10-19 | Created (owner directive) |

## Background

The 2026-10-19 sweep (TASK-20261019131118492) removed private bindings that had
leaked into committed/generic surfaces (keychain service name, machine paths,
personal SSH alias presented as project fact). Detection so far was
agent-memory + ZK read-throughs — effective but not repeatable: the owner
cannot personally review every session ("我也的确不可能一直盯着……有些是彻底
的低级错误"), and an agent's self-classification ("docs/SOP") is exactly how the
leak class was born (see ADR-20261019125409359 § Background).

A secret-VALUE guard already exists: `scripts/check-private-leaks.sh`
(pre-commit §0.8) blocks values from `.private/*.env` entering staged diffs.
It does NOT cover the pattern class: personal names, machine paths, key names,
token shapes — things that are not secrets but must not ship.

## Decision Drivers

- Deterministic beats remembered: a lint/sonar-family gate runs on every
  commit regardless of which agent is driving or how it classifies the edit.
- Pattern ≠ secret: the gate checks a gitignore-STYLE list (listed = forbidden
  in checked surfaces), inverted semantics vs gitignore (which excludes from
  VCS). Personal patterns live in gitignored space per ADR-20261019125409359 —
  the pattern list is itself a personal binding.
- Instance-framed mentions are legal (deliberately kept in the sweep, e.g. the
  machine-labeled SSH alias line), so the gate must not hardcode personal
  names as always-forbidden; the list is data, editable per machine.

## Options

### Option A — extend `scripts/check-private-leaks.sh` with a pattern phase

Phase 1 (existing): secret values from `.private/*.env` vs staged diff (plus a
pipefail fix: a `.private/` without `*.env` crashed the script silently before
reaching the report).
Phase 2 (pattern): two sources — (a) built-in baseline, **live token shapes
only** (`github_pat_…`, `gh[pousr]_…`, `npm_…` with entropy suffix:
unambiguous); (b) `.private/leak-patterns` (gitignore-style, one per line,
absent = skipped silently) holding the machine's personal markers — key names
and the machine's home path. Machine paths are deliberately NOT built in: the
live `--all` calibration run (2026-10-19) showed the repo's test fixtures
legitimately use generic paths (`/home/user`, `/Users/alice`) — a blunt
`/Users/` baseline produced ~60 mostly-fixture hits, and a check that misfires
gets learned around (ADR-20260910113534807 § probe rationale: an honest soft
rule beats a lying hard check). Optional `--all` audit mode scans committed
surfaces minus exemptions: historical records (cortex/adr|tasks|wiki|INDEX,
daily/, drafts/, archived-patches/, showcase/, test-results/, `*.bak*`),
fixtures (`*.test.ts`), committed run artifacts (`packages/*/runs/`,
`*/run-output/`).

**Pros**: one guard, one hook section, matches existing banner/test idiom;
zero new wiring (§0.8 already calls it); list file follows the `.private/`
precedent; live audit clean after calibration. **Cons**: bash; `.private/
leak-patterns` must be seeded per machine for path patterns (by design).

### Option B — new standalone TS tool (`scripts/check-no-private-leaks.ts`)

**Pros**: typed, unit-testable in the bun test idiom, room to grow. **Cons**:
second tool in the same guard slot; new hook wiring (a `.husky/` change, which
is itself [GUARD-SENSITIVE]); splits "private leaks" across two files and two
mental models.

### Option C — prompt-only lens (qa-sweep deck addition)

**Pros**: zero code. **Cons**: agent-memory in disguise — exactly what the
owner rejected ("比起agent自己记录"); non-deterministic, not commit-blocking.

## Decision

**Choice**: Option A.

**Rationale**: the commit-flow gate is the requirement; the wiring already
exists; one guard with two phases (values / patterns) matches how maintainers
already think about "private stays private". TS rewrite can be a later card if
the script actually grows.

## Impact

- Positive: every commit is screened for the leak class that produced the
  10-19 sweep, without anyone remembering to look.
- Negative: `.private/leak-patterns` must be seeded per machine (this machine:
  `lythos-agent-pat`); a fresh machine relies on the built-in baseline until
  seeded — accepted, and noted in the tool header.
- Follow-up:
  - [ ] Seed `.private/leak-patterns` on this machine (done in implementing
    commit; sha: —)
  - [ ] AGENTS.md Critical Gotchas += [LEAK] entry pointing at the gate (sha: —)

## Related
- ADR-20261019125409359 (personal credential bindings — the principle this gate enforces mechanically)
- TASK-20261019131118492 (sweep whose repeatability requirement this fulfills)
