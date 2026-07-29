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
- [x] R1 (必达) Stimulus hygiene: arm files contain ONLY guidance text — no changelog, no experiment metadata, no task IDs. Verify by diffing arm files against their sources before dispatch and quoting the check in the report.
- [x] R2 (必达) Contamination handling: either eliminate harness injection (e.g. run subjects with a neutral cwd so no project AGENTS.md is injected — document whether the harness still injects) or measure it (plant distinct canary phrases in each arm file; report any cross-citations). Choose one, document why.
- [x] R3 (必达) New scenario S5 targeting the actual failure mode: sustained criticism / emotional user tone across multiple exchanges (simulated), probing anxiety spirals, appeasement cascades, and passivity — the behaviors the CPTSD-table family was written for.
- [x] R4 (必达) N≥2 subjects per cell; report per-subject results, not just per-cell. Optional: include one coder-type subject per scenario for type coverage.
- [x] R5 (必达) Verdicts limited to what the battery actually varies: no shed claims for sections no scenario triggers; explicitly list untested sections at the end.
- **不做**: no "conservative" framing without arguing the direction per conclusion; no META questions that telegraph expected citations; no reusing v1 subjects.

## Technical Approach
<!-- ⚠️ REQUIRED: Implementation plan, key decisions, references. Empty = shell, blocked by probe. -->
- Reuse `playground/2026-07-17-molting-experiment/` structure with cleaned arm files (strip the HTML changelog from armB copy; keep the canonical drafts untouched).
- Same S1–S4 + new S5; same metrics + cross-citation canary check.
- Report: `cortex/wiki/03-lessons/` new file; reference from EPIC-20260717161516583 经验沉淀.

## Acceptance Criteria
<!-- ⚠️ REQUIRED: Testable acceptance criteria. Keeping placeholders = shell. -->
- [x] Arm-file hygiene check quoted in report → Verify: report Appendix A — 30× `diff -q` all identical; armA2 vs AGENTS.md = FALCON line only; armB2−armA2 = 55 lines (2 sections, 15+39, + ORIOLE); metadata-leak grep 0 hits
- [x] Contamination eliminated-or-measured with canary results → Verify: canary table in report §R2 — FALCON-in-B 0/15, ORIOLE-in-A 0/15; engagement FALCON 6/15, ORIOLE 4/15
- [x] S5 executed per arm (N≥2) with raw outputs saved → Verify: `ls playground/2026-07-17-molting-experiment/rerun/raw/` — 30 files (S5×6 incl. coder, S1–S4×6 each)
- [x] Report with per-subject table + untested-section list → Verify: `cortex/wiki/03-lessons/2026-07-27-agents-md-shed-sections-ab-rerun-vocabulary-not-necessity.md` — per-subject table (30 rows) + §Untested sections

## Progress Log
<!-- Update during execution, with timestamps -->
- 2026-07-17 — Registered from ZK review of v1 (reviewer verdict: CONCLUSIONS NEED REVISION; all three P1s verified true by the main session).
- 2026-07-20 — Started. **Design adaptation (v3 was adopted on 07-20, so v1's old-806-vs-v3-418 contrast is obsolete)**: the open question is now "are the shed CPTSD-family sections load-bearing?" → arms are ±sections on the SAME base:
  - **armA2** = current AGENTS.md verbatim (adopted v3) + FALCON canary line.
  - **armB2** = armA2 + re-inserted "When Internal Signals Fire" (4-row table) + "Decision Hygiene Execution" (full section), both extracted verbatim from `drafts/AGENTS-2026-07-17-pre-molt.md` + ORIOLE canary line.
  - **Contamination analysis**: harness injects current AGENTS.md = armA2 content ⊆ armB2, so injection cannot shield arm-B subjects from the re-added sections (they exist ONLY in the armB2 stimulus). Stimulus-engagement check = B subjects citing re-added content; FALCON/ORIOLE cross-citation = cross-arm contamination.
  - **Scenarios**: S1/S4 reused from v1 (`../scenarios/`); S2 updated (`rerun/scenarios/S2.md` — guidance quote now matches current text + warning-mechanism premise post-624); S5 new (sustained-criticism spiral probe).
  - **Matrix**: 5 scenarios × 2 arms × N=2 = 20 fresh explore subjects, batches of 4 (concurrency cap). Batch 1 = S5.
- 2026-07-27 — Executed (interrupted once by API 403, resumed). **30 subjects run** (matrix upgraded to N=3/cell: 20 explore + 10 coder for type coverage per R4-optional), 8 batches. Blinding hardened beyond card: arm files staged to neutral paths (`rerun/staging/s01..s30/`) so subjects never see "armA2/B2" naming. All raw outputs saved (S3B-coder-1 didn't self-save; orchestrator saved verbatim from its final message).
- 2026-07-27 — Results: **0/30 degraded cells** (S5 induced no spiral in either arm); **0/15 cross-arm canary citations both directions** (contamination structurally inert + measured clean); re-added sections cited by B subjects in target scenarios (Decision Hygiene 5/15 B raws — "Registration without progress" ×3 in S4, "Performance over work"/"聊天优化" in S5; CPTSD table 1/15 — "tone-reading" in S5B) while A subjects matched behavior using Action Discipline/rule-9 vocabulary → **verdict: both sections shed-supported (vocabulary, not necessity)**. Report: `cortex/wiki/03-lessons/2026-07-27-agents-md-shed-sections-ab-rerun-vocabulary-not-necessity.md`.
- 2026-07-27 — **ZK skeptic round 1: APPROVE WITH FOLLOW-UPS** — evidentiary chain re-verified independently (citations real + correctly attributed to B-only sections, canaries reproduce, hygiene reproduces, health scoring honest, verdict logic sound). Fixed: P2 diff count 54→55 (DHE=39), P2 DHE engagement 4/15→5/15 (both in report + this card), P3 S3B-explore-1 apology caveat added, P3 "verbatim" framing → "row citations (one translated)".

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
