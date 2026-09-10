# Grilling — the two-stage ZK gate pattern, and the deck splice it reviewed

**Subject**: the 2026-09-10 work: `ADR-20260910181957316` (proposed) + `zk-review.md` §两段闸门 / §第三段,
the change they reviewed (`ADR-20260910152957509` + `toml-splice.ts`), and the 14 verbatim review logs
in `showcase/2026-09-10-zk-reviews/`.

**Method note.** Facts below were gathered, not assumed — tests run, git history read, files inspected.
Where a recommendation rests on a fact, the fact is quoted with its path. The six rounds already reviewed
the *content*; nothing here re-verifies it. What follows is the part nobody was ever asked.

**One correction to the brief, up front.** The third-gate trial card is not in `01-backlog`; it is
`cortex/tasks/02-in-progress/TASK-20260910181747676-…` (moved there by `b9758429`, 18:20).

---

## 1. The design tree

Root decision: **make review a gate rather than a habit** — i.e. move the point at which a defect is
caught from "after the code exists" to "before", and make "caught" a machine-decidable event.

```
root: review becomes a gate, not a habit
│
├─ A. GATE TOPOLOGY — how many, and where on the timeline
│   ├─ A1 pre-assignment gate        (existing, AGENTS.md § ZK Review Gate)
│   ├─ A2 计划闸  plan gate          (new — WHAT/WHY/HOW + attack the spec with real input)
│   ├─ A3 实现闸  implementation gate(new — against the spec, mutation-pinned)
│   └─ A4 第三段  测试闸 test gate    (principle only — mechanism deferred to a trial card)
│
├─ B. GATE MECHANICS — who reviews, how it converges, when it stops
│   ├─ B1 reviewer identity ──── knowledge-independence  (settled)
│   │                      └─── orchestration-independence (settled: NOT required)
│   │                      └─── model diversity            (never raised)          → Q3
│   ├─ B2 convergence criterion (new gap < 2, all low-priority)   (settled)
│   ├─ B3 round ceiling        (settled for plan; IMPOSSIBLE for impl)             → Q1
│   ├─ B4 terminal condition   (never stated)                                      → Q2
│   ├─ B5 mutation as the acceptance criterion for a fix   (settled)
│   ├─ B6 fold discipline / commit pinning   (settled by ADR-20260910113730375)
│   └─ B7 evidence carriers    (settled: ADR / card / review log / showcase)
│       └─ instrument carriers — the harness itself  (never raised)                → Q11
│
├─ C. SCOPE & COST
│   ├─ C1 which changes qualify for two gates   (stated as a scope note)           → Q4
│   ├─ C2 budget / ceiling on spend             (absent; the ADR says "cost doubles")→ Q1
│   └─ C3 fallback when no second agent exists  (ADR names it as a Negative; no path)→ Q4
│
├─ D. ENFORCEMENT — how the gate actually fires
│   ├─ D1 trigger                                             (never raised)       → Q5
│   ├─ D2 detection (`cortex probe` does not look at gates)     (never raised)      → Q5
│   └─ D3 ratification — proposed ADR vs live SSOT text         (never raised)      → Q6
│
├─ E. PROPAGATION & OWNERSHIP
│   ├─ E1 which package owns the method text                    (never raised)     → Q7
│   ├─ E2 built `skills/` distribution + rebuild                (in sync — verified)
│   └─ E3 AGENTS.md vs reference vs daily layering              (AGENTS.md ok)     → Q13
│
├─ F. THE SUBJECT CHANGE ITSELF (deck TOML splice)
│   ├─ F1 scope — add/remove fixed, migrate-schema excepted      (settled, unguarded)→ Q10
│   ├─ F2 locator parser vs reader parser                       (settled, unguarded)→ Q9
│   ├─ F3 user-visible loss of `deck add` auto-migrate          (in Progress Log)   → Q10
│   └─ F4 discovery of the evidence — `showcase/` index          (incomplete)       → Q12
│
└─ G. THE ADJACENT GATE THAT ALREADY EXISTED AND WAS SKIPPED
    └─ G1 user-sim gate (AGENTS.md §3 ladder)   (never raised by the day)          → Q8
```

Settled facts worth having in hand before the questions, because they close branches rather than open them:

| Check | Result |
|---|---|
| `bun test packages/lythoskill-deck/` | `292 pass / 1 skip / 0 fail / 781 expect / 293 tests / 17 files`, exit 0 |
| built copy sync | `skills/lythoskill-project-cortex/references/zk-review.md` is byte-identical to the source; §两段闸门 present |
| `cortex probe` | `01-proposed: 1 consistent`, `02-in-progress` / `03-review` cards consistent — no drift flagged |
| showcase logs | all 15 files git-tracked (14 logs + README); not gitignored |
| ADR-01 C1–C6 bar | clears C2/C3/C5/C6 comfortably — it is a legitimate ADR, not a process memo |

---

## 2. Round 1 — the frontier

### ❓ Q1 — **The round ceiling. AGENTS.md says "never spawn a 4th round"; the implementation gate ran six.**

`AGENTS.md:178` states, unqualified and adjacent to the new two-gate paragraph:

> Three rounds is a practical ceiling — entering round 3 means the task design itself is suspect;
> rewrite the card, never spawn a 4th round.

`zk-review.md:116` sharpens it to a rule: *"三轮后如果仍未收敛（连续两轮都有 ≥2 个高优 gap），说明 task 本身的设计有问题"*.
By that rule, the implementation gate should have been aborted and the card rewritten: rounds 1 and 2 both
returned **4 HIGH** each (`904-impl-round1.md`, `904-impl-round2.md`; round 2's own log is headed *"4 HIGH"*).
Instead it ran to six and converged. Neither ADR-01 nor `zk-review.md` says whether the ceiling binds the
implementation gate at all — ADR-01 only says *"计划闸与实现闸各自收敛"*.

Choices:
**(a)** Ceiling applies to the plan gate only; the implementation gate is unbounded — revise `AGENTS.md:178` to say so.
**(b)** Ceiling binds both; the six-round run was therefore a violation and 904 should have gone back to design at round 3.
**(c)** Replace the round count with a severity-trajectory signal; keep a hard ceiling only on the plan gate.
**(d)** No ceiling anywhere; govern by cost instead.

➡️ **(c).** The round count is the wrong instrument, and the day's own numbers show why. The plan gate's
trajectory was `3 → 1 → 0` over three rounds: flat-then-drop, i.e. the plan really was being *designed* in
public, which is what the ceiling exists to catch. The implementation gate's was `4 → 4 → 1 → 1 → 1 → 0`:
after round 2 each round produced a *smaller* defect class, and round 3's finding was a 276→110-byte
out-of-bounds cut that no plan-stage reviewer could have reached — that is the implementation gate doing
exactly the job ADR-01 built it for, not a card that needs redesigning. The reviewer itself closed the
loop with *"Stop forking me on this loop — the remaining items are recorded, bounded, and one assertion
each"* (`904-impl-round6-delta.md`). Concretely: keep `三轮` as a hard ceiling on the **plan** gate (a plan
that needs a 4th round is a design problem, exactly as written), and give the **implementation** gate a
severity-based floor — *terminate on a round that returns 0 HIGH and no new HIGH-class finding, or on two
consecutive rounds whose only findings are LOW*. Then amend `AGENTS.md:178` to scope itself, because right
now the SSOT contradicts the day's own headline evidence inside a single section, and the next agent will
read the ceiling first.

---

### ❓ Q2 — **What ends a gate? The protocol has no terminal condition, and its last step was an unreviewed fold.**

The plan gate handled this correctly. Round 3's log ends by pre-committing:

> This convergence statement covers **`e369729e`** and nothing later, per `ADR-20260910113730375`. If you
> fold any of the four LOWs, the folded diff is non-empty: mark it `折后未评` … (or fork me for a delta pass
> before the fold lands)

The author did exactly that — `b290c42e` (fold) then `76a3ca44` (delta-confirm pass), and the card records
both. Good.

The implementation gate did not. Its delta pass returned *"shippable at `937bb4b7`, with the LOW list
recorded"* — a gate conclusion pinned to a commit. Then `a5756b4f` (**16:35**) changed `toml-splice.test.ts`,
adding the argument the same delta pass had prescribed. That is a non-empty diff to a reviewed artifact.
`git log -1 a5756b4f` and the card's Progress Log carry **no `折后未评` marker**, and no second review covers
it. `grep -rn 折后未评` finds it in AGENTS.md, the reference, ADR-20260910113730375, the 5092 card and the
daily — and nowhere in the 904 card or the fold commit.

Choices:
**(a)** It is a fold. 904's terminal state is unreviewed; re-open the gate to delta-review `a5756b4f`, or mark it with delta scope and covered commit.
**(b)** A fix the reviewer itself prescribed is reviewed by construction — carve that out explicitly in `zk-review.md` and require only that it be *labelled*.
**(c)** It is a fold only when the fix departs from the prescription.

➡️ **(b)** — but note what choosing (b) buys and costs. (a) is the strict reading of `ADR-20260910113730375`
and it is almost certainly what the ADR's text demands today. The reason not to take it is that it makes the
protocol non-terminating: every LOW a delta pass produces generates a fix, every fix generates a new
unreviewed diff, and the reviewer here already said stop. The rule you want is *"the gate ends at the first
round that returns 0 HIGH; LOW-level fixes prescribed by that round are executed and labelled
`按评审处方折入 @ <sha>` — they are not a new review object."* Cost of (b): the label must be mandatory, or
it degrades into the 2026-09-09 incident where a folded delta carried a claim that survived to `main`. If you
choose (a), the concrete work is one delta pass on `a5756b4f`'s three assertions — small, but it must happen
before 904 leaves `03-review`.

---

### ❓ Q3 — **The independence the gates actually achieved is "fresh context, same model, same orchestrator". Is that a gate?**

`showcase/2026-09-10-zk-reviews/README.md` already states the honest version:

> They are **not orchestration-independent**: the same session and the same orchestrator launched them, so
> they are not a second party in the sense `TASK-20260910110545092` B6 distinguishes.

ADR-01 encodes the distinction as a table row (*"独立性 | 知识独立…与编排独立…分开写,不合并成'独立'"*) — but
stops there. It never says whether **orchestration**-independence is required for a verdict to count, and it
never raises the third axis at all: **model diversity**. All the protocol commits carry
`Model: deepseek-v4-flash`; the review logs record `bun`/OS/commit (`904-impl-round1.md` §0) but no reviewer
model. Meanwhile `AGENTS.md:195` already requires cross-model review for a *less* consequential artifact than
a gate verdict — *"Important docs: cross-model via `arena single --player <kimi|codex|claude>`"*.

Choices:
**(a)** Knowledge-independence is sufficient; model diversity is out of scope for gates.
**(b)** Gates require model diversity as well as knowledge-independence — a verdict from the author's own model is a stronger self-review, not a gate.
**(c)** Two tiers: knowledge-independent (default, cheap) and model-independent (required for scope-narrowing or irreversible changes — the same class ADR-01 says must run two gates).

➡️ **(c).** Evidence for why this is not academic: the one finding the six rounds demonstrably *could not*
produce is the one the reviewer itself flagged as out of reach — `904-plan-round1.md:99` lists under "What I
could not check": *"Whether the completed work will need to satisfy the ZK/arena gates of `AGENTS.md` §3 (e.g.
a user-sim reviewer or cross-model check) — that is a process question the card does not raise and I cannot
settle from the card."* A same-model reviewer asking itself whether it should have been a different model is
the exact blind spot model diversity exists to cover. (c) also keeps the cost honest: the two gates are
already the expensive path, so put model diversity on the same change class rather than globally.

---

### ❓ Q4 — **Who decides a change is gate-worthy — and what happens when there is no second agent?**

Two holes in C1/C3, both stated but unassigned.

ADR-01's scope note: *"两段闸门用于**改数据/改写入路径/改不可逆流程**这类变更；纯文档、单行修复、可秒回滚的改动
只走既有的**任命前闸**"*. Nothing says who applies that test. In practice the author does — the same party
whose judgment the gate exists to check. And ADR-01's own Negative column concedes the fallback: *"单 agent
环境下退化成自审,而自审已知无效"* — with no path, no marking requirement, and no statement of whether work
may ship in that state.

Choices:
**(a)** Author self-classifies; single-agent environments simply degrade to self-review (status quo).
**(b)** Classification happens *at the plan gate* — the plan gate may escalate the card to a full implementation gate, converting a self-classification into a reviewed one.
**(c)** Mechanical default: any change under `packages/*/src/` gets two gates, docs do not.
**(d)** Single-agent degradation must be *recorded* — the card carries `gates: none (no second agent available)` so a later reader sees the gap the way `折后未评` makes a fold visible.

➡️ **(b) + (d).** (b) costs nothing: the plan gate is already running and already has the card in front of it,
and "does this need an implementation gate?" is precisely the kind of question it can answer with the spec
table visible. (d) is the same discipline as `ADR-20260910113730375` — the failure mode is never "nobody
reviewed", it is "nobody reviewed **and the record says nothing**". Reject (c): the ADR's own argument
(*"把闸门加到不需要它的地方,是另一种形式的形式主义"*) is right, and a path-prefix rule would put gates on
`toml-splice.ts` and on a one-line string constant alike.

---

### ❓ Q5 — **Enforcement: by ADR-01's own argument, writing the rule down does not make it fire.**

ADR-01's Background diagnoses its own subject precisely — *"这正是 `ADR-20260910113534807` … 处理过的同一种失效:
**规则存在 ≠ 规则被触发**;而这次连规则都还不存在."* — and then the remedy is: write it into `zk-review.md` and
`AGENTS.md`. That fixes the second clause (*连规则都还不存在*) and leaves the first (*规则存在 ≠ 规则被触发*)
exactly where it was. There is no trigger, no detection, and no place a reviewer-less card shows up.

Concretely, today: `cortex probe` reports `01-proposed: 1 consistent` and every card consistent. It has a
"Backlog staleness" check, an "Epic drift" check, and a "Wiki structure drift" check. It has no notion of a
gate at all, so a card that reached `03-review` with no review log would probe clean — which is what today's
904 card would have looked like had the gates never run.

Choices:
**(a)** Leave it as a norm; the repo's culture is the enforcement.
**(b)** Add a `## Gates` section to `assets/TASK-TEMPLATE.md` carrying the pinned commits (`plan @ sha`, `impl @ sha`), so gate evidence is greppable the way `TASK-xxx` already is.
**(c)** Add a commit trailer (`Gate: plan=<sha> impl=<sha>`) parsed by the existing `.husky/post-commit` hook (`ADR-20260504135256566`), so the card's gate state is derivable from git.
**(d)** Add a `cortex probe` check: warn when a card in `03-review` has no `## Gates` block or no referenced review log.

➡️ **(b) then (d); (c) only if you want the trailer.** (b) is one file and zero runtime, and it gives the
information a home *inside the carrier that already exists* — the card — which is where the two-gate table
says plan lives. (d) is where it becomes detectable, and it fits probe's existing shape (it already warns on
staleness and drift). (c) is the most powerful and the most fragile: it depends on the post-commit hook,
which the repo itself has an incident history with. Note the deeper point either way: **this is the one
frontier item where the subject and the remedy are the same shape.** ADR-01 argues a rule that is not
triggered is not a rule; the two-gate rule is, today, a rule that is not triggered by anything.

---

### ❓ Q6 — **ADR-01 is `proposed`, but `AGENTS.md` already states its rule as live.** (Ordering only.)

`cortex/adr/01-proposed/ADR-20260910181957316-…` — Status History is a single row, `proposed | 2026-09-10 | Created`.
`c56decf9` (18:20) created it. But `a0baa8ac` (18:12) had already written the rule into `AGENTS.md:180` in the
declarative — *"**Two gates, not one.** The gate above reviews the plan; a second, separate gate reviews the
implementation…"* — with no "proposed" qualifier and no pointer to a pending decision. `state-machines.md:79`
says ADRs *"move one-way to a terminal state"*, and `probe` does not age or flag proposed ADRs
(`01-proposed: 1 consistent`), so nothing will surface this if it is forgotten.

Choices:
**(a)** Accept as-is; the SSOT leading the ADR by eight minutes is harmless.
**(b)** Leave proposed; the text is a description of observed practice, not a rule.
**(c)** Treat "a new normative document exists" as a trigger — accept ADR-01 promptly, and until then make `AGENTS.md:180` say its decision is pending.

➡️ **(c).** The ordering inversion is tolerable for minutes and corrosive over weeks — the exact failure
`ADR-20260910113534807` (: a decision must not live *only* in a card's Technical Approach) exists to prevent,
one level up. But note the dependency: **do not accept ADR-01 until Q1–Q3 are answered**, because accepting
it ratifies a round ceiling that contradicts `AGENTS.md:178` and a terminal condition that does not exist.
This question is only about the ordering — whether the SSOT may state an unratified rule as in force. The
accept-text decision is downstream and belongs to a later round.

---

### ❓ Q7 — **Which package owns the two-gate method text?**

`§两段闸门` and `§第三段` were written into
`packages/lythoskill-project-cortex/skill/references/zk-review.md`. There is a live backlog card,
`TASK-20260828141622918-extract-standalone-lythoskill-zk-skill-from-cortex-and-arena` (13 days old; probe
already flags it as possible drift), whose R1 partitions exactly this text:

> **method** = sensor-not-oracle framing, pass-by-reference dispatch, gap taxonomy (4 types), convergence
> protocol (3-round ceiling), fill/challenge/reject dispositions, trial-usage pattern.
> **gate wiring** = cortex's task-card trigger, arena's deck testing trigger — stays in those skills

and whose acceptance is `No duplicated method text remains` with `grep -rn "lythoskill-zk\|skill-zk" …zk-review.md`
as the check. `§两段闸门` (two gates, where to put them, why the pure side) and `§第三段` (the reviewer must
not be the author) are 100% method, 0% wiring. Nothing in that card, its R1 list, or its acceptance grep was
amended when the text landed — `grep` finds no `lythoskill-zk` pointer in `zk-review.md`.

Choices:
**(a)** The new text moves with the extraction — `lythoskill-zk` owns the two-gate and third-gate methodology; cortex keeps only "when to fire it".
**(b)** The new text is cortex-local (it is written for cortex cards) and stays.
**(c)** Defer, and record the dependency on `TASK-20260828141622918` so the extraction's R1 and its acceptance grep are widened before that card starts.

➡️ **(a), registered as (c) now.** The text is method by the extraction card's own definition, and it is the
largest single body of method added since that card was written. The reason to act now rather than at
extraction time is that the extraction card's acceptance criterion (`No duplicated method text remains`) is
currently *satisfiable while silently leaving the new sections behind* — a false pass. Minimal action: widen
that card's R1 list and its acceptance grep to name `§两段闸门` and `§第三段`, and add the dependency line.
This is a two-line edit to a backlog card, and it is the difference between the extraction succeeding and
the extraction appearing to succeed.

---

### ❓ Q8 — **The gate ladder's own adjacent layer was skipped, and the reviewer said so.**

`AGENTS.md:240`: *"**Significant work adds the user-sim gate**: after the ZK skeptic, spawn a
profile-calibrated reviewer-as-user"*. `.private/user-sim-reviewer.md` exists (3127 bytes) and
`.private/user-sim-reviews/` exists, so the gate is live, not absent. Nothing in the day's artifacts mentions
it — `grep -rn "user-sim"` across all 15 showcase logs, the 904 card and ADR-01 returns exactly one hit, and
it is the plan reviewer refusing to settle it: *"that is a process question the card does not raise and I
cannot settle from the card"* (`904-plan-round1.md:99`). So the day ran the ZK skeptic twice per gate (6 + 3
rounds) and never ran the layer immediately above it. Under `AGENTS.md` the ladder is
self-check → ZK skeptic → **user-sim** → user spot-check, and an implementation touching a git-tracked
declarative source of truth is hard to call insignificant.

Choices:
**(a)** The user-sim gate applies to the *card's* finished work, and 904 has not finished (`03-review`, owner has not marked done) — so it is still owed, not skipped.
**(b)** Gates 1–2 subsume it; drop the user-sim layer for implementation cards.
**(c)** The user-sim layer is for UX/output tasks only (`AGENTS.md:193` scopes trial usage that way) and 904 is neither.
**(d)** It was skipped; run it before 904 leaves `03-review`.

➡️ **(a), with (d) as the action.** ADR-01 rewrote how review happens without touching the layer above it,
and `AGENTS.md:240` still says "significant work" — an undefined threshold that the two-gate ADR has now made
*more* ambiguous, not less, because "significant" now has a near-neighbour ("gate-worthy"). The concrete
step is small: before `cortex task done TASK-20260910152029904`, run the user-sim reviewer, or record why it
was waived. But the real decision is the boundary — once two gates exist, "significant work adds the
user-sim gate" needs to say whether it means *significant of what*, or the next agent will read three gates
as one rung and skip two.

---

### ❓ Q9 — **The locator parser and the reader parser are different, the divergence is measured, and nothing guards it.**

`toml-splice.ts:20-21` imports **both** `parseTOML` (from `toml-eslint-parser`) and `parseTomlReader` (from
`@iarna/toml`). The comment at `:105` records why the guard switched: *"**用读取器自己的解析器**(`parseDeck`/`validate`
走 @iarna/toml)—— 实测两者在多行内联表上会分歧,iarna 拒、toml-eslint 收"*. Round 6 found that the guard had been
using the locator's parser, which would have let through a file the reader cannot read. That fix is correct.

But the split remains: the file is **read and validated by `@iarna/toml`** and **located by `toml-eslint-parser`**.
The divergence is known from exactly one test (`toml-splice.test.ts:494`, whose comment reads *"实测分歧"*) and
one code comment. A `bun update` that widens or moves the divergence — in either library, in either
direction — is not going to fail that test, and the next symptom is the class round 6 closed: the writer
succeeds on a file a reader rejects.

Choices:
**(a)** Leave as-is — the guard is on the reader, which is the correct side, so the residual risk is only a spurious refusal.
**(b)** Add a standing agreement test: a small corpus of TOML shapes asserted accepted/rejected by both parsers, so a dependency bump that changes the divergence goes red.
**(c)** Unify on one parser (rejected already — `@iarna/toml` exposes no ranges).

➡️ **(b).** (a)'s risk assessment is half right: a *guard-side* divergence errs safe (refuse to write). But the
*locate-side* divergence does not — if `toml-eslint` stops recognising a shape the reader accepts, the writer
errors on a valid deck (the "yesterday's deck fails today" failure the 总则 exists to prevent), and if it
*starts* recognising something new, the locate rules silently extend past the spec table without a review.
The corpus is cheap: `toml-splice.test.ts` already carries a non-ASCII, comment-dense fixture and the
`scalar skills = "oops"` case that round 6 used as its probe. This is the single highest
value-per-line item on this list.

---

### ❓ Q10 — **`migrate-schema` still re-serialises, still ships a `.bak` the repo calls a fake safety promise, and the boundary that exempts it is untested.**

ADR-20260910152957509 §Round-1 LOW table: *"`migrate-schema` 同病…但**本卡不修**…**那个 `.bak` 不构成不修的理由**
—— 它与已被退役的 tar 备份同类('假的安全承诺')"*. The card's AC5 conclusion records the real boundary: *"真边界是新规则下
add/remove **不再扩展** legacy 用法、待迁移存量不再增长"*. `migrate-schema.ts` is unchanged (`:2` still imports
`stringify`, `:52` still `writeFileSync`).

Two problems. First, the `.bak` inconsistency: on the **same day**, `ADR-20260910112404500` (commit `e2edc52e`)
**dropped an unrestorable backup** as the right call for fan-out deletion. `migrate-schema`'s `.bak` is now the
repo's only remaining copy of a pattern the repo just ruled against — and it is exactly as unrestorable, since
its purpose is to survive a whole-file rewrite that lost the comments. Second, the boundary is a claim about
behaviour with no test: "add/remove no longer extend legacy usage" is enforced for `deck add` (it errors and
names `migrate-schema`, per `add.ts:410-412`), but *"待迁移存量不再增长"* also asserts what users do, and nothing
checks the `remove` side's contribution.

Choices:
**(a)** Accept as recorded; the boundary is good enough and 904 is done.
**(b)** Open a card to make `migrate-schema` splice too.
**(c)** Keep the non-fix, add a test pinning the boundary (a legacy deck + `deck add` never produces a mixed-shape deck), and remove the `.bak`.
**(d)** Keep the non-fix and the `.bak`, but document that `migrate-schema` is a whole-file rewrite the user must review.

➡️ **(c) plus (d)'s documentation.** (c)'s `.bak` removal is the part with a precedent attached: leaving it,
one commit after `e2edc52e` removed its sibling, teaches the next agent that the rule has exceptions it cannot
see. (d) is not optional either — a user whose deck is comment-dense and who is *told by an error message* to
run `migrate-schema` will lose every comment in the file, and the only warning is in an ADR they will not read.
**Caveat on action**: removing the `.bak` is a user-visible removal and should be its own card, not folded
into 904 — folding it would be exactly the `折后未评` problem from Q2.

---

### ❓ Q11 — **The gate's measuring instruments — the mutation harness and the ADR's measurement script — are uncommitted one-offs.**

ADR-01's carrier table says the evidence carrier is *"产出目录 / `showcase/`…可复跑的产物与外部证据"*. Two
instruments that produced the evidence do not live there:

- The **mutation harness** (the thing that decides whether a fix is real — the gate's only machine-decidable
  criterion). The card's round-6 note: *"harness 是**一次性脚本**,不进仓"*. The delta reviewer independently
  re-ran mutations because it could not trust the author's counts — correct per ADR-01 rule 6, but it had to
  *rebuild* the instrument rather than run it.
- The **ADR's own 实测 table** (`3416 code unit / 3439 字节`, the `@taplo/lib` vs `toml-eslint-parser` sizes, the
  9→9 comment count). The plan reviewer: *"**The ADR's own prototype.** No script, fixture, or artifact from the
  ADR's measurements exists in the repo or in `/tmp`, so the '实测' table was reproduced from scratch rather than
  audited."* It checked out — but it had to be re-derived, and the ADR's H3 correction (bytes vs code units)
  exists precisely because a number was written without its instrument.

This matters more than usual because of the day's own recorded incident: *"我第一版变异**测试台自己坏了**…于是它报
'没有任何测试抓得住'"* — a broken harness and an absent mutation are indistinguishable. A committed harness
accumulates that fix; a one-off rebuilds the bug.

Choices:
**(a)** Instruments stay uncommitted; ADR-01 rule 6 already says the reviewer re-runs anyway, so a committed harness buys nothing.
**(b)** Commit the harness — a small script under `showcase/2026-09-10-zk-reviews/` or `scripts/` — so the next card's reviewer runs it rather than rebuilds it.
**(c)** Commit the harness, and make rule 6 say the reviewer **must** run the committed instrument rather than accept counts.

➡️ **(b).** (a) is wrong on its own terms: rule 6 tells the reviewer to re-run *when the author's count has no
reproducible carrier* — it is a fallback for absence, not a reason to prefer absence. (c) overreaches: rule 6
deliberately keeps the reviewer free to invent its own mutations, which is how round 6 found the parser
divergence. The narrow, cheap version of (b): a script that takes a patch, reverts it, runs `bun test
packages/lythoskill-deck/` and asserts *both* that output exists and that a summary line parsed — the two
assertions the author added after the harness lied. That is perhaps 30 lines and it retires the failure the
card itself calls a methodology lesson.

---

### ❓ Q12 — **The showcase index omits the half that took six rounds.**

`showcase/2026-09-10-zk-reviews/README.md`'s table has **7 rows**: the five plan logs, plus `5092-round1/2`.
The directory contains **14 logs**. The seven `904-impl-*.md` files — `round1` through `round6-delta`, i.e. the
entire implementation gate, the half ADR-01 says catches a class the plan gate structurally cannot, and the
half that took six rounds — are **absent from the table**.

Both documents name this directory as the primary teaching artifact. `zk-review.md:210`: *"**实盘案例（学这套模式最快的入口）**:
`showcase/2026-09-10-zk-reviews/` —— 一轮计划闸（3 HIGH → 1 → 0）＋ 一轮实现闸（4 → 4 → 1 → 1 → 1 → 0）的**全部 review log
逐字留档**"*. ADR-01: *"实盘案例逐字留档:`showcase/2026-09-10-zk-reviews/`(15 份 log)"* — there are 14 logs plus
the README, and the "15" counts the index that omits half of them.

Choices:
**(a)** Add the seven implementation rows to the README table.
**(b)** Leave it; the impl logs are referenced from the 904 card and from `904-impl-round2.md`'s chain.
**(c)** Restructure the README to lead with the two-gate shape (plan block, then impl block) so it reads as the pattern's case study rather than a plan-gate case with extra files.

➡️ **(a) + (c).** This is the lowest-stakes question here and the one that most directly undercuts the
pattern's stated purpose: the directory is designated the fastest route to learning a two-stage pattern, and
its index documents one stage. (b) is not sufficient — the internal chain pointers
(`904-impl-round2.md:7` → round1, etc.) make the logs *navigable by someone already inside them*, which is the
reader who needs the index least.

---

### ❓ Q13 — **The daily handoff does not carry the day's headline decision.**

`daily/2026-09-10.md`'s last commit is `58a895a3` at **15:26**. The protocol text and ADR-01 landed at
**18:12–18:20** (`a0baa8ac`, `33b2e481`, `9b0db362`, `c56decf9`). `grep` for `两段闸门`, `计划闸`, `实现闸`,
`第三段`, `测试闸` in that file: **zero hits.** The file's top block (`## Session Handoff — 09-10 后半段之二`)
is about the follow-up card's B-class batch and CI repair, and per CLAUDE.md the top block is
*"最新真相(覆盖,不追写)"* — the next session's highest-priority read.

The facts are not lost: `AGENTS.md:180` carries the rule and ADR-01 carries the decision, so the
"work not in `cortex/` did not happen" bar is met. What is missing is the *navigation*: a next-session agent
reading the daily learns nothing about a new proposed ADR governing how all future work is reviewed, and
nothing about the in-flight third-gate card.

Choices:
**(a)** Add a top block before the session ends.
**(b)** Nothing to do — the ADR and AGENTS.md are the carriers and the daily is for things without carriers.
**(c)** Treat "a new normative document landed" as a standing daily item, so this is a rule rather than a one-off.

➡️ **(a) now, (c) as the general shape.** (b) is defensible on the letter of the carrier rule and wrong on its
purpose: the daily's job is to tell the next agent *where the state moved*, and today it moved into
`01-proposed` — a non-terminal status that `probe` does not surface (`01-proposed: 1 consistent`). Since
ADR-01 may also be the pre-compaction artifact of a session that ended mid-thread, the cost of (a) is one
paragraph and the cost of skipping it is a session that re-derives the pattern from scratch — which is the
precise failure ADR-01 was written to prevent.

---

### ❓ Q14 — **The protocol refuses to ship a prompt template, but the gate is not reproducible without one.**

`zk-review.md:213-214`: *"本文档只描述意图与判据,**不提供 prompt 模板** —— 照着抄的模板会绕过判断,而这一整套的价值恰恰在
判断上"*. Meanwhile `TASK-20260910181747676` AC1 requires that the third gate's reviewer be callable
reproducibly — *"side deck 评审者的调用方式可复跑…**含实际命令**"*. And the 14 archived logs record
`commit / bun / OS / tree state` (`904-impl-round1.md` §0) but **not the prompt that produced them**.

So: gate 3 is about to be held to a reproducibility standard that gates 1 and 2 do not meet. The refusal and
the requirement are in tension and nobody has reconciled them.

Choices:
**(a)** Keep refusing templates; reproducibility is not a goal for gates 1–2.
**(b)** Archive the prompt **as evidence**, in each `showcase/` log — not as a reusable template but as part of the verbatim bundle, for the same reason the logs themselves are verbatim.
**(c)** Record only the prompt's invariants (pass-by-reference, normative-spec path, the four implementation-gate requirements from `zk-review.md` §实现闸的评审者).

➡️ **(b), implemented as (c).** The distinction the protocol wants is real and worth keeping: a *template* is a
thing you copy without thinking, and an *archived prompt* is a thing you read to judge what the reviewer was
asked. They are different artifacts and the document currently conflates them. Concretely: add the prompt
text to the existing per-round header block in `showcase/`, next to `commit` and `bun` — the header that
already exists to say what the round was run against. This also makes AC1 of the third-gate card achievable
without inventing a second mechanism: the side deck's invocation is a prompt plus a deck path, and the prompt
is already being archived.

---

## 3. Decisions that are genuinely the human's

These are the questions where I have a recommendation but no standing to settle it — they trade cost against
risk, or scope against appetite, and the answer depends on what you want the next six months to look like.
Listed in the order I would answer them.

| # | Question | What makes it yours |
|---|---|---|
| **Q1** | Round ceiling: scope it, replace it, or drop it | It is a spend decision. Six rounds of a full-context agent per change is the actual price of the pattern; the ceiling is the only dial on it. |
| **Q2** | Terminal condition: is a reviewer-prescribed fix a fold? | Choosing the strict reading costs a delta pass on 904 and makes the protocol non-terminating; choosing the carve-out trades rigour for a rule that can end. That is your risk appetite, not a fact. |
| **Q3** | Is model diversity required for a gate verdict? | Cost and scope. It re-scopes every gate verdict the repo has ever issued, and it adds a model dependency to a path that currently needs none. |
| **Q5** | Do you want gates *enforced* (template section, probe check, trailer) or left as a norm? | Enforcement mechanisms are bureaucracy, and this repo's stated position is extreme restraint about added ceremony. Only you can price that. |
| **Q6** | May `AGENTS.md` state a rule whose ADR is still `proposed`? | A governance-ordering decision, and it sets precedent for every future rule. |
| **Q8** | Do the two gates absorb the user-sim layer, or sit under it? | Priority and definition of "significant". The day ran one layer and skipped the one above it; which is correct is a judgment about what the ladder is for. |
| **Q10** | Remove `migrate-schema`'s `.bak`? | A user-visible removal, plus a card. Precedent exists (`e2edc52e`) but you own the blast radius. |
| **Q13/Q14** | Handoff and prompt-archiving practice | Both are about what future agents owe each other, which is your call to make and not mine to assume. |

Everything else on the frontier I would treat as settled and act on: **Q4(b)+(d)** (escalate classification into
the plan gate; record single-agent degradation), **Q7** (widen the extraction card's R1 and acceptance grep),
**Q9** (add the parser-agreement corpus), **Q11** (commit the harness), **Q12** (add the seven rows and
restructure the README).

---

## 4. What I could not settle, and why

1. **Whether rounds 3–6 of the implementation gate were necessary, or whether a stronger plan gate would have
   caught them.** ADR-01's whole justification is that the two gates catch *different classes*, and the logs
   support it — round 3's finding was a 276→110-byte out-of-bounds cut visible only by running it, round 5's
   was a 400-character text heuristic that no reader of the spec would flag. But the counterfactual (a plan
   gate given the same six rounds of attention) is unrun and unrunnable from the tree. I am confident in the
   *direction*; I cannot put a number on the split.
2. **The actual cost of the pattern.** ADR-01 says *"轮次与 token 成本翻倍"* and the logs say `3+1` plan and `6+1`
   implementation rounds. No token, wall-clock, or dollar figure is recorded anywhere — the reviewers ran in
   `/tmp` copies and their spend was never captured. So "doubles" is a round-count proxy, and any budget
   decision (Q1) is being made without the number it needs. This is fixable going forward (the round header in
   `showcase/` is the natural place) but not retroactively.
3. **Whether a different model would have found different findings.** Q3's evidence is indirect: I confirmed the
   author's model (`deepseek-v4-flash`, from commit trailers) and confirmed the logs record no reviewer model,
   but the reviewers' identity is only inferable from the showcase README's admission that one session and one
   orchestrator launched them. I could not prove the reviewer model was the same — only that nothing records it
   as different, which is itself the gap.
4. **Whether the six rounds polluted the reviewers.** The protocol forks the same agent across rounds
   deliberately (so it remembers its own prior findings). That is a designed feature, but it also means round 6's
   reviewer is not the round-1 reviewer: it has read five rounds of the author's dispositions. Nobody has
   decided whether a converged verdict from a forked reviewer carries the same weight as one from a fresh one.
   The day's plan gate dodged this by fiat (round 3's log pre-commits its own coverage), and that is probably
   the answer, but it is not written down.
5. **Whether the 904 card may leave `03-review` in its current state.** That depends on Q2 — and I did not treat
   it as decidable unilaterally, because the honest reading of `ADR-20260910113730375` says no and the pragmatic
   reading says the reviewer already closed the loop. Flagging rather than resolving it.

---

## 5. Which of these a claim-verification review would never have produced

The brief asks for this specifically, so it is worth naming rather than leaving implicit. Six rounds of review
all asked one question — *does this code do what the spec says, and is each fix pinned by a mutation?* — and by
that measure they converged honestly. The questions below are invisible to that frame because none of them is
a claim about the code:

- **Q1** — the *rule about reviewing* contradicts the *evidence from reviewing*. A reviewer checking the code
  against the spec never re-reads `AGENTS.md:178`, and if it did, it would read the ceiling as satisfied by the
  plan gate.
- **Q2** — the *terminal condition* of the protocol. A reviewer inside a round cannot see the shape of the loop;
  it can only see its own findings. The impl-gate delta pass declared "shippable" and was right.
- **Q3** — *who the reviewer was*. Every log records `commit`, `bun`, and `OS`; none records the reviewer's
  model or orchestrator, because the protocol never asked. Same-model review is invisible from inside a
  same-model review.
- **Q4 / Q5** — *whether the gate fires at all*. The reviews verified the work the gate reviewed; neither
  could observe the cases where no gate ran, or who decides.
- **Q7** — *who owns the text*. The extraction card is a different card in a different directory; the
  contradiction only exists across cards.
- **Q8** — *the gate above this one*. Raised exactly once, by the plan reviewer, as a thing it could not
  settle — and then dropped. It is the clearest case in the set: it was flagged and still nobody answered it,
  which is what "never put to anyone" looks like in practice.
- **Q9 / Q11 / Q12** — *what the evidence does not include*: a standing guard for a measured divergence, the
  instrument that produced the measurements, and half the logs in the index that teaches the pattern. Each is
  about the *apparatus* rather than the finding, which is the one region a review of findings does not enter.
- **Q13** — *the handoff*. A review reads the artifacts; it does not read what the next agent will read first.

The two I would put in front of a human before the others are **Q1** (the protocol currently contradicts itself
in one section of the SSOT, and the ceiling as written would have aborted the very run that justified the
protocol) and **Q2** (the gate has no defined end, and its last step today was an unreviewed fold — the exact
incident `ADR-20260910113730375` was written about one day earlier). **Q3** is the one I would expect to be
most surprising to the people who ran the day: the independence they achieved is real but narrower than
"independent review" implies, and the day's own reviewer said so.
