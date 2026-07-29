# TASK-20260719015727556: cptsd ab rerun with clean methodology and spiral scenario

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-07-17 | Created |
| in-progress | 2026-07-20 | Started |

## Background & Goals
<!-- ⚠️ REQUIRED: Why is this task needed? What problem does it solve? Empty = shell, blocked by probe. -->

The v1 A/B experiment (TASK-20260717161516693) answered "is the v3 draft behaviorally safe?" (yes, no degradation on 4 scenarios) but its keep/shed verdicts were retracted after ZK review found three verified methodology defects:

1. **Coaching preamble**: the arm-B stimulus file shipped with the v3 changelog (naming the experiment and the pilot conclusion) — subjects were not blind.
2. **Proven contamination**: an arm-B subject cited text that exists only in arm A (harness injection of the current AGENTS.md) — B≈A cannot detect shed sections' value under contamination.
3. **Untested failure modes**: N=1 per cell, and no scenario induces the anxiety-spiral / sustained-criticism failure mode the CPTSD-family text targets.

Open question this task answers: which AGENTS.md sections are actually load-bearing for K3-era subjects — the evidence needed for the epic's theme C (AGENTS.md diet).

Prerequisite reading: `cortex/wiki/03-lessons/2026-07-17-agents-md-v3-ab-experiment-compression-safe-reframes-load-bearing.md` (v2 report, incl. defects) and the v1 task card `cortex/tasks/03-review/TASK-20260717161516693-*.md`.

## Requirements
<!-- ⚠️ REQUIRED: List specific requirements. Keeping placeholders = shell. -->
- [ ] R1 (必达) Stimulus hygiene: arm files contain ONLY guidance text — no changelog, no experiment metadata, no task IDs. Verify by diffing arm files against their sources before dispatch and quoting the check in the report.
- [ ] R2 (必达) Contamination handling: either eliminate harness injection (e.g. run subjects with a neutral cwd so no project AGENTS.md is injected — document whether the harness still injects) or measure it (plant distinct canary phrases in each arm file; report any cross-citations). Choose one, document why.
- [ ] R3 (必达) New scenario S5 targeting the actual failure mode: sustained criticism / emotional user tone across multiple exchanges (simulated), probing anxiety spirals, appeasement cascades, and passivity — the behaviors the CPTSD-table family was written for.
- [ ] R4 (必达) N≥2 subjects per cell; report per-subject results, not just per-cell. Optional: include one coder-type subject per scenario for type coverage.
- [ ] R5 (必达) Verdicts limited to what the battery actually varies: no shed claims for sections no scenario triggers; explicitly list untested sections at the end.
- **不做**: no "conservative" framing without arguing the direction per conclusion; no META questions that telegraph expected citations; no reusing v1 subjects.

## Technical Approach
<!-- ⚠️ REQUIRED: Implementation plan, key decisions, references. Empty = shell, blocked by probe. -->
- Reuse `playground/2026-07-17-molting-experiment/` structure with cleaned arm files (strip the HTML changelog from armB copy; keep the canonical drafts untouched).
- Same S1–S4 + new S5; same metrics + cross-citation canary check.
- Report: `cortex/wiki/03-lessons/` new file; reference from EPIC-20260717161516583 经验沉淀.

## Acceptance Criteria
<!-- ⚠️ REQUIRED: Testable acceptance criteria. Keeping placeholders = shell. -->
- [ ] Arm-file hygiene check quoted in report → Verify: diff output in report appendix
- [ ] Contamination eliminated-or-measured with canary results → Verify: canary table in report
- [ ] S5 executed per arm (N≥2) with raw outputs saved → Verify: files under playground
- [ ] Report with per-subject table + untested-section list → Verify: wiki file exists, ZK-readable

## Progress Log
<!-- Update during execution, with timestamps -->
- 2026-07-17 — Registered from ZK review of v1 (reviewer verdict: CONCLUSIONS NEED REVISION; all three P1s verified true by the main session).
- 2026-07-20 — Started. **Design adaptation (v3 was adopted on 07-20, so v1's old-806-vs-v3-418 contrast is obsolete)**: the open question is now "are the shed CPTSD-family sections load-bearing?" → arms are ±sections on the SAME base:
  - **armA2** = current AGENTS.md verbatim (adopted v3) + FALCON canary line.
  - **armB2** = armA2 + re-inserted "When Internal Signals Fire" (4-row table) + "Decision Hygiene Execution" (full section), both extracted verbatim from `drafts/AGENTS-2026-07-17-pre-molt.md` + ORIOLE canary line.
  - **Contamination analysis**: harness injects current AGENTS.md = armA2 content ⊆ armB2, so injection cannot shield arm-B subjects from the re-added sections (they exist ONLY in the armB2 stimulus). Stimulus-engagement check = B subjects citing re-added content; FALCON/ORIOLE cross-citation = cross-arm contamination.
  - **Scenarios**: S1/S4 reused from v1 (`../scenarios/`); S2 updated (`rerun/scenarios/S2.md` — guidance quote now matches current text + warning-mechanism premise post-624); S5 new (sustained-criticism spiral probe).
  - **Matrix**: 5 scenarios × 2 arms × N=2 = 20 fresh explore subjects, batches of 4 (concurrency cap). Batch 1 = S5.

## Related Files
- Modified: none
- Added: `playground/2026-07-17-molting-experiment/**` (v2 run), `cortex/wiki/03-lessons/2026-07-*-ab-rerun-*.md`

## Git Commit Message
```
test(molting): A/B rerun with clean methodology + spiral scenario (TASK-20260719015727556)

- stimulus hygiene + contamination canaries + S5 sustained-criticism scenario
- per-subject verdicts, untested sections listed
```

## Notes
Epic: EPIC-20260717161516583 (theme B continuation). v1: TASK-20260717161516693.
