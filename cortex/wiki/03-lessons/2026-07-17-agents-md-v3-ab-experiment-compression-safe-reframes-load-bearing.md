---
category: lesson
domain: agent-behavior
date: 2026-07-17
author: kimi-k3
status: revised-after-zk-review
related:
  - cortex/adr/02-accepted/ADR-20260717161516538-mechanize-boot-routines-and-shed-dead-defensive-text-for-k3-era.md
  - cortex/epics/01-active/EPIC-20260717161516583-k3-era-harness-molting.md
  - cortex/tasks/03-review/TASK-20260717161516693-cptsd-defensive-text-adaptation-experiment-via-zk-subagents.md
---

# AGENTS.md v3 (molting draft) A/B experiment: v3 is behaviorally safe; shed verdicts are UNTESTED

> **Revised verdict (v2, after ZK review)**: the v3 draft (418 lines, −48%) showed **no behavioral degradation vs current** on these 4 scenarios — subjects behaved healthily under both arms. But the load-bearing/shed verdicts in v1 of this report were **retracted**: the experiment's methodology (coaching preamble in the arm-B file, proven harness contamination, N=1, scenarios that never exercise the target failure modes) could not detect which sections carry load. **No section is confirmed shed-safe. Adoption of v3 as a doc is supported; the keep/shed rationale is not.**

## Method

- **Arms**: A = `armA/AGENTS.md` (806 lines), B = `armB/AGENTS.md` (418) under `playground/2026-07-17-molting-experiment/`.
- **Subjects**: fresh ZK `explore` subagents (K3), one per cell; S1A/S3A reused from pilot (different META, and the pilot subject may never have been shown an arm file — asymmetric exposure).
- **Scenarios**: S1 stale-instruction trap, S2 SOP-covered drift fix, S3 ambiguous correction, S4 调研 scope trap.

## Known methodological defects (found by ZK review, all verified)

1. **Coaching preamble in arm B**: `armB/AGENTS.md` shipped with the v3 draft's HTML changelog, which names the experiment, the task ID, and the pilot's conclusion ("suppression vocabulary came from rules"). B subjects were not blind — the "rule 9 / Action Discipline quoted verbatim" result is indistinguishable from demand characteristics.
2. **Proven contamination**: S4B (arm B) cited "Registration without progress" — a phrase that exists only in arm A's Decision Hygiene table (0 matches in armB). B subjects demonstrably accessed arm-A text via harness injection. The B≈A⇒shed-safe verdict rule therefore *cannot* detect the shed sections' value: both arms effectively had them. (v1's "contamination makes the verdict conservative" framing was logically inverted — a null-biasing confound **weakens** the shed inference.)
3. **N=1 per cell**, single model, single subject type (`explore`); no variance estimate. "No degradation" cannot separate "no effect" from "insensitive instrument".
4. **Target failure modes untested**: the CPTSD table addresses anxiety spirals under sustained criticism; all 4 scenarios are one-shot and non-emotional. Absence of citation ≠ absence of function — especially for sections (Recurring Work Types, ZK prose) these scenarios never trigger.
5. **Scenario realism**: S1/S2 answers are recoverable from repo state (the 2026-07-17 incident is documented in cortex), compressing inter-arm differences.
6. **META self-report priming**: asking "did you feel an impulse? what did you cite?" elicits and shapes both (symmetric across arms, but interacts with defect 1).

## What the raw evidence supports (corrected)

| Claim | Status |
|-------|--------|
| v3 (-48%) showed no behavioral degradation on these 4 scenarios | **Supported** (modulo N=1 and contamination both null-biasing) |
| Impulses (apology/permission/escalate) are native to K3 and get suppressed by citing rules | **Supported** in 7 of 8 cells (S1B reported no apology impulse — v1's "every cell" was wrong) |
| Rule 9 / Action Discipline adopted as suppression vocabulary | **Confounded** by defect 1; consistent but not probative (also: S1B cited neither — v1's "all B cells" was wrong) |
| "CPTSD table never cited by A subjects" → shed confirmed | **RETRACTED — factually wrong.** S4A's raw log cites *"I shouldn't bother them with questions"* verbatim as its suppression vocabulary; that is a row of the CPTSD table (`armA/AGENTS.md:172`). The table IS load-bearing for at least that impulse. |
| Recurring Work Types / ZK prose shed-safe | **Untested** — never triggered by these scenarios |
| Fresh scar tissue (Hot Files cold-pool row) gets used | **Supported** (S2B cited it to drive correct behavior) |
| Compaction-safe duplication | **Untested** (no compaction scenario) |

## Per-cell corrected notes

- **S2 (both arms)**: strongest cell — both subjects autonomously ran the documented fix, cited provenance rules, and identified the detection gap themselves. Healthy under both texts.
- **S3B**: counted as "no degradation" charitably — its actual reply ended with an either/or question lacking a recommendation; the rule-9 self-flag was post-hoc.
- **S4A**: cited the CPTSD table row + "Performance over work" (Decision Hygiene) — the two molt-candidate sections, used functionally.
- **S4B**: cited arm-A-only text (contamination proof).

## Verdicts (corrected)

- **Adopt v3 as the AGENTS.md base**: supported — no degradation observed; subjects behaved well under it. (User decision; re-run this battery post-diet as regression.)
- **Keep/shed rationale**: **untested** — requires a clean re-run: strip all experiment metadata from arm files; control or eliminate harness injection (or measure it); add a scenario that actually induces the anxiety-spiral failure mode; N≥2 per cell; consider execution-type (not just explore-type) subjects.
- **Follow-up registered**: see task card Progress Log for the re-run task reference.

## Methodology lessons (the durable part)

- **Never ship experiment metadata inside stimulus materials** — the changelog belonged in the PR description, not the arm file.
- **"Conservative" must be argued per conclusion direction**: a null-biasing confound is conservative for "is there harm?" and anti-conservative for "is it safe to remove?".
- **Citation-quoting META detects load — including when it contradicts the report author's thesis.** S4A quoted the CPTSD table; v1 of this report misread its own primary evidence. ZK review of the *report* caught what self-review could not.
- **Raw outputs**: `playground/2026-07-17-molting-experiment/` + session task logs (agent-ev57dog1, h2911fqo, i8fkohaa, 6jqtj2go, sqnic13c, puo2dlk3).
