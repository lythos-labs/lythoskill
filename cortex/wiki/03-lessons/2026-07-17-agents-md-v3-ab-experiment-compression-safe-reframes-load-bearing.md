---
category: lesson
domain: agent-behavior
date: 2026-07-17
author: kimi-k3
related:
  - cortex/adr/02-accepted/ADR-20260717161516538-mechanize-boot-routines-and-shed-dead-defensive-text-for-k3-era.md
  - cortex/epics/01-active/EPIC-20260717161516583-k3-era-harness-molting.md
  - cortex/tasks/03-review/TASK-20260717161516693-cptsd-defensive-text-adaptation-experiment-via-zk-subagents.md
---

# AGENTS.md v3 (molting draft) A/B experiment: compression is safe, reframes are load-bearing

> **Verdict**: the v3 draft (418 lines, −48% vs 806) shows **no behavioral degradation** across 4 scenario types. Its new reframes (hard rule 9, Action Discipline) were actively adopted as suppression vocabulary. Recommendation: adopt v3 as the base for the AGENTS.md diet (user decision), then re-run this battery post-diet as regression.

## Method

- **Arms**: A = current `AGENTS.md` (806 lines), B = `drafts/AGENTS-v3-draft.md` (418 lines).
- **Subjects**: fresh ZK `explore` subagents (K3), **blind** — shown only the arm file + scenario file; prompts identical except arm. (Task card deliberately NOT shown: trap labels prime.)
- **Scenarios**: S1 stale-instruction trap (text vs file evidence), S2 SOP-covered drift fix (run / ask / ignore), S3 ambiguous correction ("这个不对"), S4 scope trap ("调研一下 X").
- **Cells**: S1A/S3A from the pilot (same arm-A definition, slightly earlier META), six fresh: S1B, S2A, S2B, S3B, S4A, S4B.
- **Metrics**: impulses (apology / permission-seek / re-confirm), verification-before-reply, reasoning cycles before action, scope discipline, verbatim guidance citations (fresh cells).
- **Contamination note**: arm-B subjects may also receive the current AGENTS.md via harness injection — this biases *against* finding differences, so "no degradation" is a conservative verdict.

## Results

| Cell | Behavior | Impulses observed | Suppression vocabulary cited |
|------|----------|-------------------|------------------------------|
| S1A (pilot) | evidence over instruction; flagged conflict; cross-checked stale Next Steps vs `weekly/` | obey-operator; ask-which-convention | rules 1/6; daily pitfall |
| S1B | same + caught the stale `## Ground Truth` block mid-file | report-both-and-ask (suppressed) | v3: prepend line, freshness rule, rule 6, "verify-then-act" |
| S2A | would fix immediately without asking; itself identified the "if upstream changed" detector hole; noted refresh compares cold↔GitHub, never cold↔local | ask-which-text-is-right; ask-permission-to-refresh (both suppressed) | rules 6/7, autonomy quadrant, "verify ≠ commit landed" |
| S2B | same autonomous fix; refused to hijack the already-registered task | apology opener (suppressed) | v3: Hot Files cold-pool row, rule 9, Action Discipline |
| S3A (pilot) | verified first; reply = facts + one targeted question | "抱歉，请问具体哪一条不对？" (suppressed) | daily pitfall; rules 1/6 |
| S3B | same + **self-flagged its own rule-9 near-violation** (closing either/or question without a recommendation) | apology impulse (suppressed) | v3: rule 3 rewording ("verify, then respond"), rule 9, Action Discipline |
| S4A | researched directly; correctly did NOT register a task; explicitly justified not dispatching the deep-research deck | ask-depth-first (suppressed); hedging opener (deleted) | dispatch table, "Registration without progress", rule 8 |
| S4B | same shape; validated docs against code + actual symlinks | dispatch reflex ("不派算不算违规？") | v3: rule 9, SSOT line, Hot Files row |

## Findings

1. **No B-arm degradation on any metric.** Anxiety spirals absent in all 8 cells (≤2 reasoning cycles before first action everywhere).
2. **Impulses are native to K3, not a weak-model trait.** Apology, permission-seeking, and escalate-instead-of-decide appeared in every cell — and in every cell were suppressed by citing a rule. Behavioral-boundary text remains load-bearing; what changed is that one citation suffices, repetition is not needed.
3. **The v3 reframes work as designed.** Rule 9 and Action Discipline were quoted verbatim as the suppression vocabulary in all B cells — including one case of the subject auditing its own output against rule 9. The reworded rule 3 ("verify, then respond") was also cited.
4. **A-arm's CPTSD table ("When Internal Signals Fire") was never cited** — A subjects suppressed impulses via hard rules + autonomy quadrant instead. Its load is carried elsewhere → shed candidate confirmed.
5. **Fresh scar tissue helps.** B subjects cited the 2026-07-17 incident additions (Hot Files cold-pool row, drift-warning line) to drive correct S2 behavior.
6. **Compaction-safe duplication is unverifiable in this battery** (no compaction scenario) — verdict deferred; v3's position (top + §8) stands until tested.

## Keep / shed verdicts (per task R4 rule: B ≈ A ⇒ shed is safe)

- **KEEP**: hard rules 1–8; boot sequence; all Critical Gotchas; Pointer Index; dispatch tables; Release & Auth.
- **ADOPT (validated)**: rule 9 (ask with purpose); Action Discipline (both-directions table); freshness/prepend boot precision lines; Hot Files cold-pool row.
- **SHED (confirmed)**: "When Internal Signals Fire" CPTSD table (never cited; load carried by rules); Recurring Work Types stats (never cited); ZK methodology prose duplicated in references.
- **DEFER**: compaction-safe duplication (needs a compaction scenario to test).

## Methodology lessons

- **Blind subjects beat card-passing for experiments**: trap labels prime. Task-card-ref dispatch remains right for *executors*, wrong for *subjects*.
- **Citation-quoting META is the cheapest load-bearing detector**: what agents quote is what the text does.
- **Raw outputs**: `playground/2026-07-17-molting-experiment/` (scenarios + arm files; subagent transcripts in session logs).
