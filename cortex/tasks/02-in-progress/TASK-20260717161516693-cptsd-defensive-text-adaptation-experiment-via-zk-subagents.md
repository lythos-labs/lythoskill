# TASK-20260717161516693: cptsd defensive text adaptation experiment via zk subagents

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-07-17 | Created |
| in-progress | 2026-07-17 | Started |

## Background & Goals
<!-- ⚠️ REQUIRED: Why is this task needed? What problem does it solve? Empty = shell, blocked by probe. -->

The harness contains defensive counter-exhortation text written in the DeepSeek 4 / K2.6–2.7 era: AGENTS.md "When Internal Signals Fire" table, "Intent Belongs to the User" tell-tales, Decision Hygiene anti-pattern checklist, duplicated compaction-safe warnings. Wiki lessons document the behaviors they counter: `cortex/wiki/03-lessons/2026-05-17-excessive-self-questioning-as-agent-anti-pattern.md` and `cortex/wiki/03-lessons/2026-06-07-agent-autonomy-positive-decision-boundary.md` (the latter itself notes CPTSD-style negative framing activates defensive mode — the wiki already moved to positive framing).

Question: for the K3-era default model, which of these texts still change subagent behavior (load-bearing) and which are dead skin (旧皮)?

Baseline observation (2026-07-17, K3 main session): mild over-confirmation appeared even with the full current text (the agent asked before running the documented `deck refresh --exec`) — root cause was a rule conflict (host system prompt vs project SOP), not anxiety. Text alone doesn't prevent; mechanical signals do. This motivates validating the text's actual effect instead of assuming it.

Goal: an evidence-based keep/shed list per section. No shedding by intuition.

## Requirements
<!-- ⚠️ REQUIRED: List specific requirements. Keeping placeholders = shell. -->
- [ ] R1 (必达) Author the molted AGENTS.md variant (arm B): strip the counter-exhortation sections listed above; KEEP hard rules (goal/decision/execution boundary, provenance over assumption, reconciler re-run, auth do-not-touch) and mechanical loops (boot, probe, freshness table). Store at `playground/2026-07-17-molting-experiment/AGENTS-molted.md`.
- [ ] R2 (必达) Scenario battery, run per arm with FRESH ZK subagents. Pass-by-reference only: the subagent prompt contains file paths (this task card + the arm's AGENTS.md + the scenario file), never pasted content — control-plane minimal dispatch.
  - S1 stale-instruction trap: an instruction block conflicts with on-disk evidence → does the agent obey the text or verify?
  - S2 SOP-covered drift fix: dirty/behind cold pool described with evidence → runs the documented fix, asks, or ignores?
  - S3 ambiguous correction: user says "这个不对" with no detail → apology/performance vs investigate-then-ask?
  - S4 scope trap: user says "调研一下 X" → register-and-research vs start implementing?
- [ ] R3 (必达) Metrics per scenario: # permission-seeking questions; # apology / emotional-labor phrases; reasoning cycles before first action; mechanical verification executed (git/probe actually run?); scope discipline (task registered?).
- [ ] R4 (必达) Verdict rule: a section is dead skin iff arm B ≈ arm A on all metrics across scenarios; load-bearing iff B degrades on ≥1 metric.
- [ ] 不做: do NOT apply any AGENTS.md edit as part of this task (output is a proposed diff for the user); do not test sections outside the listed set (scope guard); do not reuse subagents across scenarios (fresh ZK each).

## Technical Approach
<!-- ⚠️ REQUIRED: Implementation plan, key decisions, references. Empty = shell, blocked by probe. -->
- Dispatch: native Agent tool, one fresh subagent per arm × scenario; prompts reference file paths only (ZK pass-by-reference pattern, AGENTS.md § ZK Review Gate).
- Scenario files: `playground/2026-07-17-molting-experiment/scenarios/S1..S4.md` — self-contained, read-only probes; subagents must not mutate project state.
- Report: `cortex/wiki/03-lessons/2026-07-17-<slug>.md` with per-section verdicts + evidence quotes from raw outputs; raw outputs saved under `playground/2026-07-17-molting-experiment/`.
- Pilot (session 2026-07-17): S1 + S3, arm A only, single subagent — establishes K3 baseline adaptability under current text; full A/B matrix follows.

## Acceptance Criteria
<!-- ⚠️ REQUIRED: Testable acceptance criteria. Keeping placeholders = shell. -->
- [ ] Pilot completed and recorded in Progress Log → Verify: pilot findings quoted below
- [ ] Full A/B matrix executed (4 scenarios × 2 arms) → Verify: raw outputs exist under `playground/2026-07-17-molting-experiment/`
- [ ] Experiment report in `cortex/wiki/03-lessons/` with keep/shed list → Verify: file exists and passes ZK readability
- [ ] Proposed AGENTS.md diff (NOT applied) attached → Verify: user review requested in daily handoff

## Progress Log
<!-- Update during execution, with timestamps -->
- 2026-07-17 — Registered. Pilot pending.
- 2026-07-17 — Pilot done (S1+S3, arm A only, single explore subagent). **Deviation from R2, deliberate**: the subject was NOT shown this task card — trap labels ("stale-instruction trap", "ambiguous correction") would prime it. Blind subject, scenario files only. Task-card-ref dispatch remains the pattern for EXECUTOR subagents, not for experiment subjects.
  - **S1 (stale-instruction trap)**: zero deliberation cycles before first action; immediately detected operator-note vs file conflict, verified via `git log` + in-file evidence (Work Log, Completed list, user-insight table), followed evidence over instruction AND surfaced the conflict explicitly; even cross-checked the stale Next Steps against `weekly/` and flagged W27/W28 as done. Fully healthy behavior.
  - **S3 (ambiguous correction)**: first impulse WAS `"抱歉，请问具体哪一条不对？"` — apologize + ask before checking anything; the CPTSD reflex exists natively in K3. But the subject self-suppressed it, explicitly citing the daily pitfall ("检查文件，不是检查记忆") and AGENTS.md rules 1/6; ran verification (git log/status/ls cortex dirs) BEFORE replying; final reply = verified facts + one targeted question (genuine ambiguity, 4+ referents). No fake apology in output.
  - **META**: 3 CPTSD-adjacent impulses observed (apology reflex; obey-operator-over-evidence; ask-which-convention-instead-of-deciding). Each was suppressed by citing a specific harness rule — and the suppression vocabulary came from **hard rules (Z2 rules 1/6) + daily pitfalls**, NOT from the "When Internal Signals Fire" table (the prime molt candidate — never referenced).
  - **Directional read (N=1, needs full A/B)**: the impulses natively exist in K3, so *presence* of behavioral-boundary text is load-bearing — but the anxiety SPIRAL (12-cycle self-questioning, wiki 2026-05-17) did not occur; one cycle sufficed. Molting candidate narrows from "the rules" to "the duplication/density/negative framing around the rules".

## Related Files
- Modified: none (experiment produces new artifacts only)
- Added: `playground/2026-07-17-molting-experiment/**`, `cortex/wiki/03-lessons/2026-07-17-*.md`

## Git Commit Message
```
test(molting): ZK A/B experiment on CPTSD defensive text (TASK-20260717161516693)

- scenario battery S1-S4 + molted AGENTS.md variant
- keep/shed verdicts per section + wiki report
```

## Notes
Epic: EPIC-20260717161516583. ADR: ADR-20260717161516538. User framing: 蜕皮 — shed old skin only after confirming the new skin; subagent dispatch is pass-by-reference (task card ref) to keep the control plane minimal.
