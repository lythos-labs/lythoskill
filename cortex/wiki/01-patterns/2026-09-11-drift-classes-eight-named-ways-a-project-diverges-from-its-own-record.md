---
created: 2026-09-11
updated: 2026-10-23
category: pattern
---

# Drift classes: eight named ways a project diverges from its own record

> Documentation that says one thing while the code does another is not one problem. It is eight, they have different detectors, and the two most valuable ones are about the *fixer*, not the thing that drifted.

## Context

A project accumulates two kinds of carriers: **records** (docs, cards, ADRs, comments) and **the thing itself** (code, config, tests). They diverge continuously. The usual response is to treat "the docs are stale" as a single bucket and either sweep everything or ignore everything — both are wrong, because the classes have wildly different detection costs and different harm ceilings.

This pattern came out of one day (2026-09-11) of fixing a single bug, during which **all eight classes produced a live instance**. None were found by planning; they were found because one concrete defect forced a targeted archaeology. That archaeologist cost ~250k tokens across two agents. **The trigger is not something you can rely on** — it is random, expensive, and reaches only the classes that produce symptoms.

The organising insight: **detectability is cheap; the missing ingredient is the question being asked.** The `tasks:`-field instance below was found by a single `grep`. What was missing was never the capability — it was that nobody asked "who reads this field?".

## Details

### The eight classes

> **The canonical operational list** — each class, its question, and its detector —
> lives in [`packages/lythoskill-dreaming/skill/references/drift-detection.md`](../../../packages/lythoskill-dreaming/skill/references/drift-detection.md),
> which dreaming Phase 3 runs. This page is the **non-normative** discovery record:
> the context, the worked examples, and why the symptomless classes need a different
> trigger — where its prose touches a per-class rule, the reference wins. Do not
> re-add a second copy of the questions here — that is this page's own class 1.

### Worked examples (all from one day)

**1 — Carrier drift.** One markdown block shape was carried by four files: `src/lib/template.ts`, `templates/epic.md`, `assets/*-TEMPLATE.md`, `skill/assets/*-TEMPLATE.md`. No sync step existed; the copies were hand-maintained and had drifted apart by two months. One of them — the copy the skill *told agents to read* — asserted the block was "human-record only, **not machine-parsed**" while the CLI parsed it.

**2 — Grammar drift.** The card writer appended a row with no heading when a section was absent; the reader required the heading. **The CLI wrote a format the CLI could not read.** The trap: a round-trip test on a *healthy* card cannot catch this, because when writer and reader share the same mis-parse the round trip "succeeds" on a wrong answer.

**3 — Doctrine drift.** Shipped guidance contradicted shipped behaviour. The dangerous property is that this class *propagates*: an agent reads the doc and reproduces the error as doctrine. (A human would think "that can't be right, let me check" — an agent has no independent basis to doubt the document. **This makes an SSOT load-bearing for agents in a way it is not for humans.**)

**4 — Authorization drift.** An ADR said "未实施，仅记录决策草案" (not implemented, draft only) while the feature was implemented *with tests*. The record was **not wrong when written** — it was outlived.
> **Split this class in two.** The *fact* of the divergence is cheap (grep the symbol). The *authorization* — why it was ever permitted — lives only in decision records. **Facts are cheap; authorization is expensive**; only the second half needs a scheduled pass.

**5 — Enforcement drift.** `AGENTS.md` claimed hand-creating cards "breaks the state machine, probe, and the post-commit trailer dispatch"; the actual guard was a pre-commit check using `--diff-filter=R`, which catches **renames only**. Hand-created files and hand-edited bodies passed silently. Same family, same day: a frontmatter field declared with the rule "a field must have a reader" **had no reader** — written the day after the rule was established.

**6 — Precondition drift.** A deferred decision's named revisit-trigger depended on an ADR that was later **superseded**, so the trigger became unsatisfiable and the deferred work was never opened. Nothing failed; the branch simply stopped being reachable. **This is the one class no test can help with** — it needs a list of deferred decisions and their triggers, and that list itself usually has no reader.

**7 — Repair drift.** *An action taken to clear a symptom introduces a divergence the detector cannot see.* Three instances in one day:
- A card whose status history was malformed was **hand-patched**; probe went green; the history stayed broken. (Human fixed it, mechanism didn't.)
- A plan-gate fix would have made probe report **1 → 0 issues** while writing a fabricated `completed` row into the card, claiming it had been *created* completed.
- A hardening pass made the **writer** fence-aware while leaving the **reader** fence-blind: on a fenced document the writer reported success and the reader could see nothing. **Round 1 was no worse — both sides used the fence, so they at least agreed. Hardening one side turned "both wrong together" into "the two disagree".**

**8 — Self-referential verification.** *The verification shares the verified thing's assumptions, so it can never redden.* Three instances in one day:
- A test file's cross-check helper **imported the module under test** — so the mutation it was meant to detect was invisible to it. The card's own design notes warned about exactly this ("test and implementation share a source"); the violation happened in the test written for that card.
- A date assertion computed its expected value **with the same arithmetic as the implementation**. Three separate mutations survived: naive string slicing (deleting the *entire* normalisation the function existed for), month/day swap, and local-instead-of-UTC formatting — all **46 pass / 0 fail**.
- The fixture ID that would have caught them was **degenerate**: month `01`, day `01`, 12:00 local. A degenerate input makes several distinct mutations produce the same output.

### Why classes 7 and 8 matter more

Classes 7 and 8 are worth more than the other six combined, because the other six are "the thing drifted" while these two are "**the fixer drifted**" and "**you thought someone was watching, and no one was**". Both are answered by introspection, not tooling; the canonical wording lives in the reference (§ The eight questions, per-class notes 7–8). The discovery record's own summary: any repair that makes a signal disappear without making the underlying thing correct is drift wearing a clean shirt, and a verification that shares the verified thing's assumptions can never redden.

### Symptomatic vs symptomless — why two different triggers exist

| | Reached by a bug? | Needs |
|---|---|---|
| 2 grammar, 5 enforcement | **yes** — something fails loudly | bug-driven pull (cheap, targeted, legitimate) |
| 1 carrier, 3 doctrine, 4 authorization, 6 precondition, 7 repair, 8 self-referential | **no** — nothing fails | a scheduled pass, **or** routine carrying the question |

So a bug-driven archaeology is the *correct* trigger for the symptomatic classes and structurally blind to the rest. Do not try to fix that by making every session read everything — that is unaffordable and nobody does it. Fix it by **making the symptomless questions cheap enough to ask on demand** (`grep`-level), and by putting them where the work already happens.

### The code-side proxy

Compare records against the **test suite**, not the source; the operational rule and its rationale are in the canonical list (§ The code-side proxy). The discovery record's own conclusion: **test coverage bounds how much of your documentation is falsifiable at all.**

## When to Apply / When Not to Apply

Scope, the ADR exclusion, and the findings-not-verdicts rule are normative and live in
the canonical list above. Two rationales from this record are worth keeping here:

- **Why ADRs are excluded.** An ADR records the moment it was written; "the code later
  implemented it" does not make it wrong. Sweeping ADRs produces a stream of "please
  update this historical document" noise. Refresh them opportunistically, on encounter,
  by appending a status note — never by rewriting the body.
- **Why findings, not verdicts.** A check that can be wrong gets learned around, and
  being learned around is worse than no check: it manufactures the appearance of having
  checked. This is the discriminator from `ADR-20260910113534807` Option C.

Do not build a full-corpus audit. The sequence that produced this pattern was: name
the classes; make each question a one-liner; run them where the work already is; only
mechanise the ones that keep recurring.

## Related

- `ADR-20260910152957509` — 总则「写入器的语法 = 读取器的语法」. Class 2 is its violation; the walk to it produced classes 1, 7 and 8.
- `ADR-20260911002229529` — "B's guarantee is a promise; A's guarantee is a filename." The same argument class 7 and 8 embody: a guarantee that lives in the fixer's diligence is not a guarantee.
- `ADR-20260910113534807` — the form-vs-coverage discriminator used above; also the ADR that governs where decisions must be recorded.
- `ADR-20260710172235956` — "two carriers for one truth = guaranteed divergence". Class 1's principle, and why consolidation alone can never reach doc↔code: the code is an irreducible second carrier.
- `TASK-20260911093602710` — the dreaming card: eight classes turned into a scheduled pass, scoped to present-tense docs, with the test suite as the code-side proxy.
- `TASK-20260911080931450` — the fix whose archaeology produced all eight instances in one day.
- `cortex/wiki/01-patterns/2026-07-10-zk-review-trade-off-awareness.md` — the neighbouring discipline: not every finding is a defect.
- `cortex/wiki/04-ssot/pitfalls.md` — the pitfall ledger this pattern feeds.
