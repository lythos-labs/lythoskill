---
last_consolidated: 2026-09-12
sources:
  - "cortex/adr/02-accepted/ADR-20260910181957316-two-stage-zk-review-gates-review-the-plan-before-execution-review-the-implementation-against-the-spec.md"
  - "cortex/adr/02-accepted/ADR-20260910113730375-zk-review-object-must-be-commit-pinned-folded-commits-are-unreviewed.md"
  - "packages/lythoskill-project-cortex/skill/references/zk-review.md"
  - "weekly/2026-W37.md"
  - "daily/2026-09-10.md"
  - "daily/2026-09-11.md"
zk_validated: true
zk_issues: 10
zk_validator: "ZK cold-reader subagent — 2026-09-12 — full file; zk_issues counts findings raised (all 10 fixed in place: gate pass criteria, reviewer identity, spec-table shape, review-log carrier, folding rule, ZK/mnemonic glosses, drift-class listing, metadata semantics)"
related:
  - "packages/lythoskill-project-cortex/skill/references/zk-review.md"
  - "AGENTS.md § ZK Review Gate (Mandatory Pre-Assignment)"
  - "cortex/wiki/01-patterns/2026-09-11-drift-classes-eight-named-ways-a-project-diverges-from-its-own-record.md"
summary: |
  How work gets verified in this repo: the two-stage ZK gates (plan gate →
  implementation gate), the third gate (tests as review object), and mutation
  pins. Primary reader: any agent about to execute or design a review pass for
  a non-trivial task card.
---

# Review Gates — How Work Gets Verified

> What is TRUE NOW. Design history lives in the ADRs; this file is the operating
> manual. Prompt templates, round bookkeeping, and the six battle-grown rules:
> `zk-review.md` §两段闸门 (two-stage gates).

**ZK** = zero-knowledge: a reviewer agent with **no conversation context**,
spawned fresh. Both gates below are run by ZK agents; the third gate is the
deliberate exception (project knowledge allowed, authorship forbidden).

## Why gates exist (the cost argument)

A **plan is pure** — fixing it costs a sentence. **Execution is IO** — a redone
card, corrupted data, a pushed commit. So review effort is front-loaded onto the
plan side. This is 以终为始 (begin with the end in mind) mechanized: the spec
table written *before* execution becomes the reference the implementation is
judged against — which is what makes the second judgment non-circular.

## The two-stage gate (ADR-20260910181957316)

| Gate | Object | Reviewer | What it catches |
|------|--------|----------|-----------------|
| **Plan gate** | task card + spec table, **zero code** | ZK agent: probes WHAT/WHY/HOW, attacks the spec with real inputs | Spec covers only the happy shape; designs that would write the artifact wrong |
| **Implementation gate** | landed code + tests at a **pinned commit**, judged against the pre-written spec | a *different* ZK agent: checks line-by-line against the spec, runs mutations, reports what it could not verify | Over-range splices eating later sections; text heuristics; overlapping ranges — things that only fail when run |

**Pass criteria**: a gate converges when a round surfaces **< 2 HIGH findings**.
Every finding gets an explicit disposition — (1) accept & fix, (2) challenge
(the reasoning is recorded so the next round's reviewer doesn't re-raise it),
(3) reject as out of scope. Counts cited elsewhere (e.g. "3→1→0") are HIGH
findings per round; MEDIUM/LOW findings must be dispositioned but don't block
convergence.

**Spec table shape** (the plan gate's object): one row per behavior, each row
carrying its **acceptance criterion and how it will be verified** — countable
items, not a sentence of intent. An intent sentence gives a reviewer nothing to
push against: no options to reject, no rejected alternative to question.

**Review log — carrier and location**: each round's gaps, inputs, verdicts, and
the author's dispositions are an artifact the **next round inherits verbatim**
(not summarized). It lives on the task card (Progress Log) or a committed file —
anything existing only in a session record is already lost (2026-09-11: gate
reports lived only in session JSONL; the sole remedy was re-running the rounds).

**Folding rule** (ADR-20260910113730375): the review object is a **commit
hash**. Content folded (squashed/fixup) into a reviewed commit is itself
**unreviewed** — run the gate against the new hash.

Empirical anchor (2026-09-10 dogfood — self-trial): the same deliverable
through both gates caught **different classes** of defects — plan gate 3 rounds
(HIGH findings 3→1→0), implementation gate 6 rounds (4→…→0). First production
run (2026-09-11, status-history write-read fix, TASK-20260911080931450):
3 plan rounds + 2 implementation rounds.

Rules discovered mid-gating that are architectural go to an **ADR**, not the
card's Technical Approach (ADR-20260910113534807).

## The third gate: tests as review object

- The reviewer may have project knowledge but must **not treat the tested code
  as their own** — *authorship is the enemy of discernment*. Empirically
  (2026-09-10): the author's own tests stayed green under revert-mutations —
  three "fixes" were decorative — while a reviewer who hadn't written the code
  caught all of them in one round with the same mutations.
- The mechanism already exists; nothing new to build: `deck` fans out to any
  directory + `deck per-run <cli>` renders a per-CLI skill-dir invocation
  (no relink, zero side effects) → give any agent any skill set in any isolated
  working directory without touching the main working set.
  `arena single --deck <path>` wraps it.
- **What the completed trial proved vs. what remains open**: the trial
  (TASK-20260910181747676) proved the *mechanism* — an expert side-deck can
  review tests. Still open: *which* deck combinations yield how much
  discernment — no accumulated numbers exist yet. Candidate ingredients
  (uncombined): `lythoskill-sober`, `lythoskill-coach`, `tdd` +
  `lythoskill-red-green-release`.

## Mutation pins — every fix must be pinned

- Every claimed fix needs a **revert-mutation that turns a test red**. A fix
  whose mutation stays green is decoration. (One real round found three such
  decorations that had all passed human read-through: dead code, a criterion
  flipped the wrong way, and a fix with no discriminating test at all.)
- **Verify the mutation took effect before trusting a pass** — a no-op
  mutation and a passing pin look identical (pitfalls §16).
- Pick **discriminating fixtures**: inputs where wrong implementations diverge;
  degenerate inputs (month=01/day=01/noon) make every mutation agree
  (pitfalls §18).
- Test helpers must not import from the module under test (pitfalls §17).

## Drift review (dreaming)

Projects diverge from their own records in **eight named classes** — canonical
taxonomy in the pattern (see `related`): **carrier, grammar, doctrine,
authorization, enforcement, precondition, repair, self-referential
verification**. Dreaming scans **present-tense docs only** (SSOT / AGENTS.md /
guides); ADRs are point-in-time records and are not scanned; the code-side
proxy is the test suite — it executes, so it cannot rot silently (though a
green suite only certifies what its pins pin; see Mutation pins and pitfalls
§16-18). Dreaming's product is **findings, not modification orders**.

## What this replaced

| Before | Now |
|--------|-----|
| "Tests pass" as verification | Two-stage gates against a pre-written spec |
| Author self-report trusted | ZK subagents; cross-model (arena) for critical docs |
| Fixes without pins | Every fix mutation-pinned, or it doesn't count |
| Review of whatever bytes exist | Commit-pinned review objects |
