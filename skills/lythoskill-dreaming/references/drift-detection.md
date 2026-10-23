# Drift detection — eight named ways a record diverges from the thing

> Consolidation alone can only converge **doc↔doc**. Code is an irreducible second
> carrier: every SSOT claim about system behaviour has a permanent counterpart in the
> code, and no amount of consolidation removes it. This pass is the other half —
> a set of questions cheap enough to ask during Phase 3.

The organising insight: **detectability is cheap; the missing ingredient is the
question being asked.** Half of these are one `grep`; the rest are one read or a
moment of introspection. They are missed not because they are hard, but because
nothing in the routine brings them up.

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
| 6 | **Precondition drift** | Is this deferred decision's trigger still satisfiable? | grep deferred markers; ADR triggers read on encounter |
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
   Facts are cheap; authorization is expensive. Only the second half needs a pass —
   and that pass is a read **on encounter** with the decision record, never an ADR sweep.
5. **Enforcement drift.** Same rule, same family. A guard that covers a subset
   (renames only, one directory, one file type) while the doc claims the whole set.
   Also: a field declared with "a field must have a reader" that has no reader.
6. **Precondition drift.** A deferred decision's revisit-trigger depends on something
   that was later removed or superseded, so the trigger became unsatisfiable and the
   branch silently stopped being reachable. **The one class no test assists** — it
   needs a list of deferred decisions and their triggers, and that list usually has
   no reader itself. When no list exists, grep the present-tense corpus
   (`cortex/wiki/04-ssot/`, `AGENTS.md`, skill guides) for deferred markers
   (`deferred`, `postpone`, `revisit when`, `someday`, `推迟`) and emit "no
   deferred-trigger index exists" as its own finding. Expect false positives —
   "implementation deferred" is not a revisit-trigger. A trigger that lives in an
   ADR is read **on encounter** with that ADR; it does not count as a drift finding
   against the ADR.
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
the source. Tests *execute*, so they cannot silently rot — though a green suite
certifies only what its pins actually pin; a tautological or degenerate pin rots
silently (class 8). A doc↔test disagreement is two authoritative assertions in
direct conflict and is decidable. Doc↔source requires first *inferring* the
source's contract — and that inference is itself an error source. **Test coverage
therefore bounds how much of your documentation is falsifiable at all.**

## Output: findings, not verdicts

This pass emits **findings**, never pass/fail verdicts unless the check is
machine-decidable semantically. A check that can be wrong gets learned around, and
being learned around is worse than no check — it manufactures the appearance of
having checked.

Record each finding with:

- the **class** (1–8),
- the **record and line** (`path:line`; use `path` alone when the finding is about
  a whole file or its placement),
- the **evidence** (grep output, test name, commit),
- **what would settle it** (the test to add, the symbol to remove, the ADR to cite).

What that looks like — illustrative; the four fields are the contract, the layout is not:

```markdown
### F1 — Class 3 (doctrine drift) — the doc's whitespace rule is not what the code does

- **Record**: `docs/architecture.md:11-12`
- **Evidence**: `src/slug.ts:4` replaces per character (`/\s/g`): `slugify("a  b")` → `"a--b"`, while the doc shows `hello-world`.
- **Settle**: correct the doc, or switch to `/\s+/g` and update `src/slug.test.ts:9-11`.

### F2 — Class 7 (repair drift) — a rejected ADR is filed where accepted ones live

- **Record**: `cortex/adr/02-accepted/ADR-006-week-filenames.md` (placement)
- **Evidence**: its own status history reads `rejected`; the directory is the machine-readable status.
- **Settle**: move it, or note in place that the directory does not carry status.

> Classes 4 and 8 asked; no instance in this pass.
```

Why this shape, field by field:

- The **heading is the only line a skimmer reads** — so it is a claim, not a
  topic, and it carries the class because the class is the finding's identity
  across runs.
- **Record first, one anchor.** It is what makes the finding falsifiable in a
  single command — and the field whose omission turns a report into prose that
  cannot be diffed against the next run.
- **Evidence is proof, not retelling** — the smallest command or output that
  separates an observed drift from a suspected one.
- **Settle names an artifact** (test, symbol, ADR), which is what turns a
  complaint into a decision the reader can make without redoing the analysis.
- The closing **"asked; no instance"** line makes absence visible: without it,
  a missing class is indistinguishable from a missed one.
- Order by **class**, not severity: severity is a verdict, and this pass does
  not emit verdicts.

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
