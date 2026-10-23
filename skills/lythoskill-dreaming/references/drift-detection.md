# Drift detection — eight named ways a record diverges from the thing

> Consolidation alone can only converge **doc↔doc**. Code is an irreducible second
> carrier: every SSOT claim about system behaviour has a permanent counterpart in the
> code, and no amount of consolidation removes it. This pass is the other half —
> a set of questions cheap enough to ask during Phase 3.

The organising insight: **detectability is cheap; the missing ingredient is the
question being asked.** Most of these are one `grep`. They are missed not because
they are hard, but because nothing in the routine brings them up.

## Scope: present-tense records only

Apply this pass to records that claim to describe **now**:

- `cortex/wiki/04-ssot/*.md`
- `AGENTS.md`
- skill guides and their `references/` files (e.g. `packages/*/skill/SKILL.md`)

**Do not sweep ADRs or other point-in-time records.** An ADR records the moment it
was written; code implementing it later does not make the ADR wrong. Refresh one
**on encounter**, and only by appending a status note — never by rewriting the body.

## The eight questions

| # | Class | Ask | Detector |
|---|-------|-----|----------|
| 1 | **Carrier drift** | How many carriers hold this shape? | grep |
| 2 | **Grammar drift** | Who writes it and who reads it — one predicate? | read one module |
| 3 | **Doctrine drift** | Does the *behaviour* this doc asserts match the code? | grep |
| 4 | **Authorization drift** | Does the symbol this record names exist? | grep |
| 5 | **Enforcement drift** | Who enforces this rule, over the same set? | grep + read the guard |
| 6 | **Precondition drift** | Is this deferred decision's trigger still satisfiable? | needs a deferred-list |
| 7 | **Repair drift** | **Which detector did I just turn green, and what was it detecting?** | introspection |
| 8 | **Self-referential verification** | **When this test fails, what drives the failure?** | introspection |

### Per-class notes

1. **Carrier drift.** Two carriers for one truth guarantees divergence. Count the
   copies **before** trusting any of them — and check which copy the skill tells an
   agent to read, because that one carries authority regardless of freshness.
2. **Grammar drift.** The writer and the reader must share one predicate. A
   round-trip test on a *healthy* input cannot catch this: when both sides share the
   same mis-parse, the round trip succeeds on a wrong answer.
3. **Doctrine drift.** Shipped guidance contradicts shipped behaviour. This class
   propagates: an agent reads the doc and reproduces the error as doctrine, with no
   independent basis to doubt the document.
4. **Split the question in two.** The *fact* of divergence is cheap (grep the symbol).
   The *authorization* — why it was ever permitted — lives only in decision records.
   Facts are cheap; authorization is expensive. Only the second half needs a pass.
5. **Enforcement drift.** Same rule, same family. A guard that covers a subset
   (renames only, one directory, one file type) while the doc claims the whole set.
   Also: a field declared with "a field must have a reader" that has no reader.
6. **Precondition drift.** A deferred decision's revisit-trigger depends on something
   that was later removed or superseded, so the trigger became unsatisfiable and the
   branch silently stopped being reachable. **The one class no test assists** — it
   needs a list of deferred decisions and their triggers, and that list usually has
   no reader itself. When no list exists, grep the records for deferred markers
   (`deferred`, `postpone`, `revisit when`, `someday`, `推迟`) and emit "no
   deferred-trigger index exists" as its own finding.
7. **Repair drift.** An action taken to clear a symptom introduces a divergence the
   detector cannot see. Any repair that makes a signal disappear without making the
   underlying thing correct is drift wearing a clean shirt. Instances: hand-patching
   the file instead of the state; hardening the writer while leaving the reader blind
   (one-sided hardening turns "both wrong together" into "the two disagree").
8. **Self-referential verification.** The verification shares the verified thing's
   assumptions, so it can never redden. Probe with the question above: if the answer
   involves the module under test — **it imports it, it reuses its arithmetic, or its
   fixture sits on the function's degenerate point** — it cannot test itself.

Classes 7 and 8 cost nothing and are worth more than the other six: the first six are
"the thing drifted"; these two are "**the fixer drifted**" and "**you thought someone
was watching, and no one was**".

## The code-side proxy

When comparing a record against reality, compare it against the **test suite**, not
the source. Tests *execute*, so they cannot silently rot; a doc↔test disagreement is
two authoritative assertions in direct conflict and is decidable. Doc↔source requires
first *inferring* the source's contract — and that inference is itself an error
source. **Test coverage therefore bounds how much of your documentation is
falsifiable at all.**

## Output: findings, not verdicts

This pass emits **findings**, never pass/fail verdicts unless the check is
machine-decidable semantically. A check that can be wrong gets learned around, and
being learned around is worse than no check — it manufactures the appearance of
having checked.

Record each finding with:

- the **class** (1–8),
- the **record and line** (`path:line`),
- the **evidence** (grep output, test name, commit),
- **what would settle it** (the test to add, the symbol to remove, the ADR to cite).

Repairs are **not** made inside Phase 3. A finding that needs code or doc changes
becomes a task; Phase 3's own output is the SSOT revision plus the findings list.

## Sequence — do not build a full-corpus audit

1. Name the classes (done here).
2. Make each question a one-liner (the table above).
3. Run them where the work already is (Phase 3).
4. Only mechanise the ones that keep recurring.

Symptomatic classes (2, 5) are legitimately reached by a bug — bug-driven pull is
their correct trigger. The remaining six produce no symptom, so they need this
scheduled/routine trigger instead.

## Source

This file is the canonical operational list — questions, detectors, scope, code-side
proxy, and output format. The repository's wiki pattern
`cortex/wiki/01-patterns/2026-09-11-drift-classes-eight-named-ways-a-project-diverges-from-its-own-record.md`
is the 2026-09-11 discovery record: the context, the worked examples, and
why the trigger split exists. It does **not** maintain a second copy of this list.
