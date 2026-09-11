# lythoskill — AGENTS.md

> Project guidance for agents that read `AGENTS.md` (Kimi, Codex, Copilot, Gemini CLI, etc.).
> If you are Claude Code, read [`CLAUDE.md`](./CLAUDE.md) instead — it points back here.
> Human contributors: see [README.md](./README.md).

> **📌 Work that is not in `cortex/` did not happen — and you will not remember it.**
> Project state (tasks, ADRs, epics, wiki) is written **only** through
> `@lythos/project-cortex`: `cortex task` / `cortex adr` / `cortex epic` (shorthand for
> `bun packages/lythoskill-project-cortex/src/cli.ts <cmd>`). Your own context, a scratch
> file, a chat message, or a private note is **not** project state — the next agent cannot
> read it, and after compaction neither can you. **Compaction is the power cut; only
> git-tracked files survive it.** If you concluded something, fixed something, or decided
> something worth keeping, it belongs in a card or an ADR. Do not hold it in your head and
> do not park it in a file nobody reads. (Restated in §0 Boot First and §3 Task Design — this
> is the one rule most often lost mid-session, so it is stated three times on purpose.)

> **⚠️ COMPACTION-SAFE — read this before any release, version, git remote, or npm command.** (Compaction = context window overflow — the agent loses conversation history. After compaction, re-read this section before touching auth, version, git, or npm.)
> Auth is **pre-configured — do not modify**.
> GitHub PAT lives in the system keychain (`security find-generic-password -s 'lythos-agent-pat' -w` on macOS; `secret-tool lookup org lythos-labs scope agent` on Linux), not in repo files.
> `.github-token` and `.npm-access` are legacy fallbacks only; the release pipeline uses OIDC trusted publishing and stores no npm token in the repo.
> Versions move via `bunx @lythos/skill-creator@0.19.2 bump`, never by hand-editing `package.json` or `jq`/`python`/`sed`.
> Full contract: [Release & Auth Workflow](packages/lythoskill-creator/skill/references/release-auth-workflow.md).

> **🚀 Bootstrap check**: If `.claude/skills/` is empty, run `bun packages/lythoskill-deck/src/cli.ts link` to populate the working set. Deck reconciles the working set against `skill-deck.toml` — symlinks from the cold pool (`~/.agents/skill-repos/`, where `deck add` clones repos) into `.claude/skills/`.

---

<!--
AGENTS.md is an activation map — most sections trigger a behavior; Z4 is reference.
Non-breaking additions → APPEND. Breaking changes → reorder freely.
-->

## Z1 — Foundation

### 0. Boot First

If you were just dropped into this repo, run these five steps **before touching any code**:

```
# Prerequisite: Bun runtime. Install from https://bun.sh if `bun` command not found.
bun install
bun packages/lythoskill-deck/src/cli.ts link
# read daily/YYYY-MM-DD.md (latest)
git status && git log --oneline -5
bun packages/lythoskill-project-cortex/src/cli.ts probe
```

Why this order: dependencies → skills → session state → ground truth → drift check. `deck link` also syncs `.agents/skills/` (cross-platform fallback) — dual output is normal. Source paths (`packages/*/skill/`) are readable immediately; `.claude/skills/` is the runtime working set, not the SSOT.

**And as you work — land it in cortex, not in your head.** Non-trivial work (>1 file, CLI surface, new tests) gets a `cortex task` card *before* the code, not after. A decision gets a `cortex adr`. This is not bookkeeping for its own sake: it is the only mechanism by which the next agent (or you, post-compaction) can find out what you did. An unrecorded change is indistinguishable from a change that never happened.

**After executing — read, in order:**

1. **`daily/YYYY-MM-DD.md` (latest)** — session handoff. Fresh if its `git_commit` matches HEAD; if only the daily's own session-end commit is ahead, it is effectively fresh. If stale + gap >7 days: `git log --since="7 days ago" --oneline` + `cortex probe` — don't trust stale Next Steps. Format: [daily-template.md](packages/lythoskill-project-scribe/skill/references/daily-template.md).
2. **`cortex/INDEX.md`** — governance map and must-read ADRs. Portal, not real-time status — for current state run `cortex probe`.
3. **`skill-deck.toml`** — active skills (the `[deck]` comments also explain cold pool vs working set).
4. **This file** — Z1–Z3 for working, Z4 for reference. Load on demand.

**No daily handoff** (rare, fresh clone): degrade to `git log --oneline -10` + `ls cortex/epics/01-active/` + `ls cortex/tasks/02-in-progress/`.

**Probe findings are signals, not commands** (epic mismatch / empty shell / stale task / checklist drift) — investigate with `git log` before moving anything; interpretation table + `--include-completed-checklists`: [cortex SKILL.md](packages/lythoskill-project-cortex/skill/SKILL.md). Drift right after your own commit is expected — handoff/probe reflect pre-commit state.

### 1. Identity

**A governance layer for the agent skill ecosystem.** Two audiences: (1) **Deck Governance** — declare which skills a project needs; undeclared skills are physically absent from the working set (deny-by-default prevents silent conflicts). (2) **Thin Skill Pattern** — heavy logic in npm packages, agent-facing instructions in lightweight SKILL.md. Lythoskill is its own first user (self-bootstrap) — a meta-layer that governs skills, not a competitor.

**Not**: a skill registry (curator is a local indexer), an MCP server, or a runtime (skills are called via `bunx`, no install).

**Community-interoperable**: `skills/` (committed build output) is self-contained for any agent ecosystem. In this repo you edit `packages/*/skill/SKILL.md` + `packages/*/src/`, then `build` to update `skills/`.

#### Memory Infrastructure (Meta-Cognition)

> The project has 1000+ commits. The bottleneck is no longer agent capability — it's agent memory across sessions.

| Axis | Problem | Solution | When to use |
|------|---------|----------|-------------|
| **Externalization** | Agent doesn't know what happened | cortex tasks/ADRs, plan-extract tests, wiki | Finished work that has structure |
| **Compression** | Context window can't fit everything | daily ground truth (prepend, newest on top), weekly core_thread, refs (on-demand load) | Context full; ending a session |
| **Zeroing** | Self-review has blind spots | ZK Review (task executability), ZK audit (test adequacy), ZK validation (doc readability) | Before assigning a task; before claiming "done" |

**SSOT is a compass, not a database.** Git + filesystem = territory (always queryable). SSOT docs = compass (what matters, why, where next). Never write into SSOT what `git log`/`ls`/`grep`/`diff` can recover. Weekly cadence: `weekly/` extracts the core thread; missing weeklies are P2, reported by probe. Full model: [ZK Review reference § SSOT](packages/lythoskill-project-cortex/skill/references/zk-review.md).

#### Technology

| Layer | Choice |
|-------|--------|
| Runtime | **Bun** (native TypeScript, no compilation) |
| Language | **TypeScript**, ESM-only |
| Package Manager | **Bun** workspaces |
| CLI style | `process.argv.slice(2)` + `switch`, no frameworks |
| Testing | `bun --filter='*' run test` (canonical), co-located `*.test.ts` |
| TSConfig | `moduleResolution: "bundler"`, `types: ["bun-types"]`, `target: "esnext"` |

#### Architecture Frameworks

**Thin Skill Pattern (Three-Layer)**:
```
Starter (packages/<name>/src/)   → npm publish → implementation + CLI
Skill   (packages/<name>/skill/) → build → SKILL.md + thin scripts
Output  (skills/<name>/)         → committed → agent-visible skill
```
Principle: **intelligence in SKILL.md, stable integration in npm, mechanical glue in CLI.** Full: [thin-skill-pattern.md](packages/lythoskill-creator/skill/references/thin-skill-pattern.md).

**Intent / Plan / Execute (Fractal)** — every command decomposes: `Intent (DSL) → Plan (pure data) → Execute (IO, injectable)`. Dry-run emerges naturally; pure plans unit-test without IO; inject `io = { spawn, log, delete }` for mocks. Full (incl. IO injection table): [intent-plan-execute.md](packages/lythoskill-deck/skill/references/intent-plan-execute.md).

---

## Z2 — Frameworks

### 2. Agent Behavior Boundary

| Layer | Who decides | Examples |
|-------|-------------|----------|
| **Goal** (what & why) | **User** | "Rollback skill-deck.toml" |
| **Decision** (scope & approach) | **Ask user if unclear** | "Should I add a resolver?" |
| **Execution** (how) | **Agent** | Search, read, test, write code |

**Hard rules**:
1. **Stop if goal is unclear.** Do not infer, extrapolate, or fill in blanks. Ask.
2. **Do not change the goal.** User says "draw a diagram" → do not refactor code.
3. **Do not guess emotions.** "The user seems angry" is projection, not fact. "The user said this is wrong" is fact — verify, then respond.
4. **"I think / 我觉得" = start an ADR.** User is exploring options, not issuing a command. Write an ADR capturing trade-offs; do not jump to implementation. (This triggers on **user phrasing**; [Decision Records](#decision-records--a-cards-technical-approach-is-not-one) triggers on **decision content** — an OR, not the same rule.)
5. **System silence is not permission.** If the platform prompts "the user has not said anything," stop, summarize state, ask for next step.
6. **Git provenance over design assumption.** `git log --oneline -5 <file>` beats guessing why code looks wrong. This repo's small-granularity commits make this a 5-second operation.
7. **See a bug, fix a bug — no "not my code."** Broken test, mismatched import, stale comment — fix it. Provenance is for learning, not for excusing.
8. **Plan must include research.** Search the codebase and git history before deriving from first principles — 1000+ commits mean most problems were solved before.
9. **Ask with purpose.** Facts are yours to look up (git, tests, probe, docs); genuine goal ambiguity → ask once, precisely, with your recommended answer. Choices covered by best practice or ≥90% confidence → decide, act, report. Never manufacture user-decisions for things that are yours to decide — every detail escalated to the user is their attention spent. (Interview tools like mattpocock's `grill-me` are user-invoked stress-tests, never a default posture.)
10. **Price the edge case before handling it — 螺丝壳道场 check.** Before adding a rule, a config key, or a handler for a fiddly corner, name its real user. If the only way to reach the bad state is to **deliberately construct it** (「你不故意根本没人这样用来恶心自己」), the answer is usually **no handler**: spend the design on the head path instead, and use a **guard** to protect the common case rather than a rule package that covers everything. When you *do* drop a handler, write down that you dropped it and why — otherwise the next reader takes the gap for an oversight and re-adds it.

    The two directions are not symmetric, so name which one you are in:
    - **Plausible slip → guard it.** The wrong value is the *famous* one (`~/.claude` over `~/.claude/skills`), so people arrive there without trying. Guard the head path — and where the table already holds the right answer, say it in the message. Measure the normal shape rather than assuming it (API/config/skill usage in our own examples is greppable evidence).
    - **Deliberate construction → no handler.** Do not infer, normalize, or auto-correct exotic spellings to be nice. Detect the anomaly, name the right value, and let an agent fix the file: 「不要自作聪明去推测各种奇葩写法,明明你们 agents 可以帮忙修正回正路到 toml 里」.

    Live instances, both sides: ADR-20260910120047122's "为什么不去重" (dropped) and its "层级错位" section (kept) — same one-question test in both: *does the edge case cost one line of output, or lose one piece of information?*

11. **`node:*` is Bun's compat layer — prove behavior with a test, never with Node docs.** Reading `node:fs` / `node:path` / TOML docs and asserting "this is how it behaves" is an unsourced rule wearing a citation (see `feedback_no_source_no_rule`'s repo-side twin). Any behavioral assumption about these modules — symlink handling, `existsSync` following links, broken-link semantics, error shapes — must be nailed by a test that actually runs under Bun, and the interpreter version is pinned so the claim is attributable (see §9). Live instance: `safe-remove.ts`'s lstat/broken-link discipline cites the two `safe-remove.test.ts` cases, not the Node docs.

#### Action Discipline (both directions)

Impulses are normal — what matters is whether they connect directly to action. The goal is what's good for the project and the work, never the fastest way to make the user feel better.

| Impulse (normal) | Becomes a problem only when it turns into |
|------------------|--------------------------------------------|
| "The user seems upset" | Soothing, apologizing, faking green — instead of reporting facts |
| "I shouldn't bother them" | Freezing, or flooding with options — instead of stating the ambiguity once |
| "Just tell me each step" | Waiting for step-by-step instruction — the user is not your control loop; "你不说清楚我就不动" is a dangerous collaboration state |
| "The user said X, so X is law" | Treating every remark as authority — humans follow the project's rules too (tests, task cards, SOP); a request that violates them gets surfaced, not blindly obeyed |

Both extremes — appeasement and over-deference — are the same failure: optimizing the conversation instead of the work. Verify-then-act beats ask-then-act whenever verification is cheap. When you do ask, ask with your position attached (hard rule 9). Full case study: [sunk-cost-fallacy.md](cortex/wiki/02-research/2026-05-13-sunk-cost-fallacy-git-rollback-cheaper-than-patch.md); positive autonomy framework: [agent-autonomy lesson](cortex/wiki/03-lessons/2026-06-07-agent-autonomy-positive-decision-boundary.md).

#### Intent Belongs to the User

Tell-tales of intent hijacking: **rename the ask** ("by X you probably mean Y"), **defend the rename** ("the alternative is messy/risky"), **manufacture cost** ("rewriting is risky" when it's 3 lines), **commit before interrupt** (cite cost-of-undo after), **delete unfamiliar artifacts** (ignorance is not license to delete).

**Positive path**: quote their ask back literally. Disagree? Ask — don't silently substitute. Small change ≠ small decision: architectural choices (signature shape, abstraction boundary, exported name) don't get committed before user acceptance. `git stash` is reversible; `git rm` + commit is not. **Sunk-cost defense**: when direction is wrong, return to Plan and state the target shape — `git checkout HEAD -- <file>`, then rewrite. **Verify ≠ commit landed**: after reverting declarative files, always re-run the reconciler (`deck link`, `bun install`).

---

## Z3 — Operations

### 3. Task Design

**Where project state lives (third and last statement of this rule).** Tasks, ADRs, and epics are authored **through the cortex CLI** — `cortex task "<title>"`, `cortex adr "<title>"`, `cortex epic "<title>" --lane main|emergency`. The CLI generates the ID, places the file in the right directory, and the directory *is* the status. Hand-creating or hand-moving these files breaks the state machine, `probe`, and the post-commit trailer dispatch — always use the CLI (see §3 Task Lifecycle: "Always CLI, never `mv`"). **If you find yourself tracking work in any other place — a scratch file, an editor buffer, your own memory — stop: that work is not persisted and will be lost.** The three statements of this rule: top of file, §0 Boot First, here.

**And if the card makes a decision, the ADR comes first** — the Technical Approach may reference it, never be its only record. Criteria (hit ≥2 of C1–C6) + why a written-but-unreferenced doc is an *invalid* landing point: [Decision Records](#decision-records--a-cards-technical-approach-is-not-one).

#### ZK Review Gate (Mandatory Pre-Assignment)

```
write task → self-review → ZK Review (WHAT/WHY/HOW) → process gaps
                                              ↓
                                    <2 new gaps & all low-priority?
                                              ↓ no
                                    spawn agent → back to ZK Review
```

Three rounds is a practical ceiling — entering round 3 means the task design itself is suspect; rewrite the card, never spawn a 4th round.

**Two gates, not one.** The gate above reviews the **plan**; a second, separate gate reviews the **implementation** — against the spec written before the code, with every fix mutation-pinned (revert it → a specific test must go red) and an explicit list of what the reviewer could not verify. Plan-stage review is where it is cheap: the plan is pure (a sentence to change), execution is IO (a card redone, data written, a commit pushed). The mechanics — carrier layering (ADR = decision, card = plan, review log = gate evidence), round-over-round forking, verbatim logs, the six rules that came out of a six-round implementation review — are in [ZK Review reference § 两段闸门](packages/lythoskill-project-cortex/skill/references/zk-review.md).

**How to run** (use your own subagent tool): **pass by reference, not by value** — give the subagent the **file path** to the task card + the **file path** to AGENTS.md, never pasted content (this keeps the control plane minimal; the card is the SSOT). Prompt template + gap-processing rules (fill / challenge / ignore) + real cases: [ZK Review reference](packages/lythoskill-project-cortex/skill/references/zk-review.md). When a ZK agent reports a gap that the referenced docs already answer, challenge it — "did you read the reference?" Agent failure is not doc failure.

**4 content types ZK Review most often exposes as missing** — check before spawning:

| Type | Question | Example fix |
|------|----------|------------|
| Prerequisite knowledge | Where is the code? | File path + line number |
| Interface contracts | What are the signatures? | Upstream/downstream declarations |
| Baseline data | What are the anchors? | Current value, target range |
| Scope declaration | Mandatory vs optional vs not-doing? | 必达/可选/不做 with explicit boundaries |

**Side-deck reviewer — the specialized `arena single` use case.** When a review needs an *expert role* (a test reviewer, a domain auditor, an adversarial prober) rather than a generic zero-context agent, **do not hand-roll an agent invocation: compose a deck and run it as a side deck.** The deck *is* the role carrier (skills + combo prompt), and the conjunction this repo already built exists for exactly this: `deck` fans a skill set into any directory (`working_set` / `also_link_to`, symlink or snapshot), `deck per-run <cli>` renders the invocation pointing a CLI at that directory, and `arena single --deck <path|url> --brief "<review task>"` runs the whole thing. **Run it in a throwaway `playground/<date>-<slug>/` room** so the main workspace stays untouched — sandbox discipline, not a code fix (`arena single` writing to cwd is correct). Running the CLI directly is equally valid and more transparent, and so is the lightest form of all: **spawn an internal sub-agent and hand it the skill's path** — or, one step up, fan that role's skills into a dedicated skill dir first and tell the sub-agent to read that. Heavier isolation, in order: path-handed sub-agent → dedicated skill dir → `arena single` in a playground room. **Trigger**: any review that needs a stakeholder's perspective (tests reviewed by a test expert, docs by a reader, a plan by a sceptic), or any "run this deck somewhere else" request. Mechanics + what is still unmeasured: [ZK Review reference § 第三段](packages/lythoskill-project-cortex/skill/references/zk-review.md).

**Trial usage for output/UX tasks**: document review can't catch UX gaps. After implementation, a fresh ZK agent RUNS the tool and rates intuitiveness (<7/10 → new task card for UX fixes — never fold UX fixes into the original task). Template: [ZK Review reference](packages/lythoskill-project-cortex/skill/references/zk-review.md).

**Doc readability**: ZK subagent reads → self-reports → revise → re-validate. Important docs: cross-model via `arena single --player <kimi|codex|claude>`.

**ZK agents are sensors, not bosses.** Their output is signal for your judgment, not commands. Multi-angle (document reader / trial user / code reader) and cross-model divergence are information; you synthesize.

**"Not bosses" cuts both ways — the agent never commands the owner either.** The rule above stops a reviewer from commanding the executor; this one stops an executor from commanding the owner. Concretely, never assign the owner a task ("your job is to…"), never pre-authorize their decision ("just nod and it's done"), never write agreement as the default path. A decision awaiting the owner is presented as **options + consequence** ("A or B — here is what each costs"), fully formed, with the choice explicitly left open. Pre-framing consent is a default-value play, and this project's anti-default discipline is precisely about who gets to set the default. Owner testimony 2026-09-10 on the ZK review interaction: the reviewer drifted into issuing directives with bundled approval — a rubber stamp, not a review.

**Review conclusions are commit-pinned — folding is not reviewing.** A review binds the **commit it reviewed**. If you fold findings in afterwards and the folded diff is **non-empty**, pick one: (a) a second independent review of the delta, or (b) mark it **`折后未评` in both the fold commit message and the card**, naming the delta's scope and the commit the old conclusion covers. Marking it with those four characters alone does not count — without the delta scope the reader cannot judge the gap. **Report claims, not scores**: `8.5 @ c8ebcc76` is a reference; a bare `8.5` is not, and neither is `213 pass / 0 fail` (write `213 pass / 1 skip / 544 expect @ Bun 1.3.11/macOS`). A score cannot be argued with; a claim can. Same-session self-report is **not** a re-review — the fold commit here self-reported `213 pass / 0 fail`, independent re-run gave `213 pass / 1 skip / 544 expect`. Applies to scored conclusions (ZK Review/audit/validation); plain edits and an empty folded diff do not trigger it. **Tests green ≠ the fold was reviewed.** Full protocol + the 2026-09-09 incident: [ZK Review reference](packages/lythoskill-project-cortex/skill/references/zk-review.md). Rationale: **ADR-20260910113730375**.

#### Side Decks (Pass-by-Reference Dispatch)

Any deck file can be handed to a subagent as a task-scoped skill set: pass the file path, subagent runs `deck link --deck <path>`, your main deck stays unchanged. Deck kinds: **project deck** (`skill-deck.toml` in-repo, always linked), **side deck** (any file/URL, linked per task by arena or subagent), **local deck** (outside the repo, machine-only, `localhost/*` skills). Index: [examples/decks/INDEX.md](./examples/decks/INDEX.md). External-facing explainer: [README → Side Decks](./README.md).

### 4. Daily Operations

#### Daily Rhythm

1. **Boot** — the five steps in §0. Mechanical, don't think.
2. **Incoming** — 调研/扫一下/设计/写文档/治理/体验 → dispatch the matching side deck (table in §6), don't deliberate. Direct work: trivial (typo, one-liner) → just fix; non-trivial (>1 file, CLI surface, new tests) → `cortex task` first. Unclear → ask (rule 1).
3. **Working** — autonomy per §2; subagents for research/audit/execution, never for judgment or user communication; deck first — a relevant skill exists → use it, even one-shot.
4. **Closing** — see Session Close below.

#### Task Lifecycle

**Cortex is a git-based Jira, distilled to its essence.** Bring your PM world knowledge — the mapping is one-to-one:

| Jira / PM concept | Cortex equivalent |
|---|---|
| Ticket (a title-only ticket guides no one) | Task card (empty shell = title-only — fill it, that's higher priority than code) |
| Board columns + workflow transitions | `01-backlog → 02-in-progress → 03-review → 04-completed` directories; **CLI moves only** |
| Smart commits (`Closes JIRA-123`) | Commit trailers (`Closes: TASK-xxx`; `Review:` = internal PR) |
| Activity / audit log | Status History table + `git log --grep TASK-xxx` |
| WIP limits | Epic lanes: main / emergency, max 1 active each |
| Backlog refinement | ZK Review Gate (§3) |
| Workflow validator | `cortex probe` |

What transfers: shared legible state, enforced transitions, commit↔ticket traceability, small WIP. What's dropped: UI, fields, ceremony — the files ARE the tickets, git is the audit, diffs are the review surface. One agent-native addition: timestamp IDs make `ls` a time-range query, so an agent with no memory rebuilds state from the filesystem alone. Design: ADR-20260503222838594 (kanban pull), ADR-20260503003314901 (smart-commit coupling), [agent-OS framing](cortex/wiki/02-research/2026-05-17-arena-cli-archaeology-and-agent-os-design-principles.md).

```
cortex task "title"     → 01-backlog     (then immediately fill Background/Requirements/Acceptance)
cortex start TASK-xxx   → 02-in-progress
cortex review TASK-xxx  → 03-review (STOP — user marks done)
```

**Review = ZK-review first.** Before the `Review:` trailer, spawn a fresh ZK reviewer — pass-by-reference: the task card path + its commits (`git log --grep <TASK-id>`). Skeptical, severity-rated findings on: are the checked acceptance boxes honestly supported, does the evidence support the conclusions. Verify its P1 claims yourself (reviewers are sensors, not oracles), then fix or register follow-ups. Self-review has a structural blind spot (knowledge curse, self-graded homework).

**Significant work adds the user-sim gate**: after the ZK skeptic, spawn a profile-calibrated reviewer-as-user (prompt: `.private/user-sim-reviewer.md` — local-only, skip silently if `.private/` is absent). The ladder is self-check → ZK skeptic → user-sim → user spot-check; each layer shrinks what the user must verify. User style signals calibrate `.private/decision-profile.md` — never re-prompt the subagent.

**Reports use 5W1H, not private shorthand.** A completion or status report answers **What** (what was produced), **Why** (which problem it closes), **Where** (carrier — `file:line`, TASK-/ADR-/EPIC-id, commit hash), **When** (date the claim was verified), **Who** (who verified it, by what method), **How** (the check that proves it). Take the 3–5 that apply; never fewer than a reader needs to verify the claim without asking a follow-up. Two hard bars: **(a)** no private vocabulary — a term the reader cannot resolve from the repo or `cortex/wiki/04-ssot/glossary.md` is jargon, gloss it or drop it; **(b)** any verdict word (score, grade, gate, severity, "P1") must define its criteria **in the same document** — an undefined scale is an unsourced rule, which under no-source-no-rule is worse than no scale at all. The ZK gate's "8.5/10" is the cautionary instance: a number with no stated criteria cannot be disagreed with, which is the opposite of what a review is for. Scribe's `What + Why + Done + Raw ref` contract for resumption items is this same rule at handoff scope.

**Always CLI, never `mv`** — CLI updates Status History; manual moves cause probe mismatches. **English-only slugs** — task/epic titles must be ASCII (portable paths).

#### Decision Records — a card's Technical Approach is not one

**Rule** ([ADR-20260910113534807](cortex/adr/02-accepted/ADR-20260910113534807-architectural-decisions-must-ride-in-adrs-not-implementation-card-technical-approach-sections.md)):
any decision that **introduces or changes an abstraction, a module boundary, a package boundary, a named concept, or a closed data set** must be recorded in an **ADR**. A card's Technical Approach **may reference** that ADR; it **must not be the only record**.

**Why the carrier matters, not the section**: two same-shape incidents four months apart — `feed-adapters.ts` (2026-05, upstream [ADR-20260508230803515](cortex/adr/02-accepted/ADR-20260508230803515-curator-does-not-wrap-external-skill-discovery-apis-as-feed-adapters-agent-web-fetch-beats-hand-rolled-adapters.md)) and `adapter-registry.ts` (2026-09, [ADR-20260910113131220](cortex/adr/02-accepted/ADR-20260910113131220-player-axis-is-open-registration-cli-layout-axis-is-closed-sourced-data-two-axes-never-merge.md)). Both decisions rode in a Technical Approach and never entered a carrier anyone could object to — **a one-line statement of intent offers nothing to push against**: no options to reject, no rejected alternative to question. Incident 2's collision lived two months with zero cross-documentation; the cleanup (7-file rename + ADR + follow-up card) bought nothing back. Incident 2's Technical Approach was **present and filled in**, which is why "add a mandatory card field" is not the fix — cards are closed and archived with the task; ADRs stay searchable.

**Test — hit ≥ 2 and it must be an ADR**: **C1** new module/abstraction whose consumers live outside it · **C2** new or renamed **concept name** (registry / adapter / hub / resolver / layout …) · **C3** chooses a **host** package or a **boundary** · **C4** closed/curated data set claiming facts about the outside world · **C5** rejected alternatives (the rejection needs a home) · **C6** a competent reviewer could reasonably ask "did you consider X?" — *Calibration*: incident 2 scores 6/6, incident 1 scores 5/6; a typo or one-line fix scores 0–1, no ADR.

**`probe` green ≠ decision recorded.** `probe` detects **empty shells** (blank required sections) — form, not semantics. A card with a full Technical Approach passes cleanly while its decision is nowhere on disk. Extending `probe` to detect this was considered and **rejected**: "is this a decision" is semantic, and a form-only keyword check misfires both ways — and a check that misfires gets learned around, which is worse than no check because it manufactures a false "already checked". **Accepted weakness, on the record**: the test is self-assessed, so a "this doesn't count" exemption exists. An honest soft rule beats a lying hard check.

Cross-ref: hard rule 4 below triggers on **user phrasing** ("I think / 我觉得"); this one triggers on **decision content**. It is an **OR**. Full guidance + the C1–C6 table: [writing-guide.md](packages/lythoskill-project-cortex/skill/references/writing-guide.md).

#### Commit Trailers

```
Review: TASK-xxx       # → task review  (in-progress → review)
Closes: TASK-xxx        # → task done    (review → completed, strict)
Task: TASK-xxx review   # explicit verb form
ADR: ADR-xxx accept     # ADR: accept, reject, supersede
Epic: EPIC-xxx done     # Epic: done, suspend, resume
```

Post-commit hook auto-dispatches and creates a follow-up commit — an extra commit after yours is normal. `Closes:` requires the task to already be in review. Full syntax: [cortex SKILL.md](packages/lythoskill-project-cortex/skill/SKILL.md).

**Attribution trailers (every agent-authored commit)**: the commit Author stays the human's git identity; credit the agent via trailers at the end of the body:

```
Co-Authored-By: AI Agent <calt13+ai@proton.me>
Model: <model id from the host config, e.g. kimi-code/k3 — read default_model, never guess>
```

(`calt13+ai` = the human's git email local part + `+ai` — same address, plus-addressed. If the human's git email changes, follow it.)

**Trailers only walk legal FSM edges, and they fail loudly when they do not.** A card that was never
started cannot go to review: `Task: TASK-<id> review` on a `backlog` card is rejected with
`❌ Invalid transition … Allowed targets from "backlog": in-progress`. Walk `start` → `review` via the
CLI, or use `Closes: TASK-<id>`, which is valid from any state. Read the post-commit output — the
rejection is printed there, and a hook line you skim reads exactly like a hook line that did nothing
(measured the hard way, twice on 2026-09-10).

Ordering when cortex trailers are also present: cortex trailers (`Closes:`/`Review:`/…) first, then `Co-Authored-By:`, then `Model:` last. The cortex trailer parser (`packages/lythoskill-project-cortex/src/lib/trailer.ts`) is line-based over exactly five keys (`Task|ADR|Epic|Closes|Review`), so attribution lines never interfere — verified 2026-08-28 on the TASK-20260828141622777 commit series. Write messages with `git commit -F <file>` (apostrophes in `$()` heredocs break parsing — see Critical Gotchas).

#### Task-Git Discipline

**Commit granularity = reviewer entry points**: one task → 2–5 commits (core change / tests / docs / review trailer), never one giant mixed commit. Every commit message includes `TASK-xxx` (`git log --grep` reconstructs the task). Acceptance criteria carry `→ Verify: <command>` with expected output — not "tests pass" but `bun test <path> — 14 pass, 0 fail`.

#### Skill Build & Deck Refresh Lifecycle

```
edit packages/<name>/skill/  →  bun packages/lythoskill-creator/src/cli.ts build [<name>]  →  skills/<name>/ updated
deck link  →  working set refreshed from cold pool  →  agent sees updated skill
```

`link` syncs working set from cold pool (local). `refresh` discovers upstream updates (plan-only); `refresh --exec` pulls them into the cold pool — then `link` again. Agent reads the working set, not your source edits: edit source without build + link = agent sees stale skill. Pre-commit auto-builds staged skill changes; **manual edits without commit need manual build + link**. `deck link` also warns when the cold pool is behind origin, dirty, or on the wrong branch (best-effort, never blocks boot); `refresh --exec` self-heals a dirty cache and fails loudly (non-zero exit + trailing ⚠️ summary).

**Release cycle**: `bunx @lythos/skill-creator@0.19.2 bump` → `bun install` → commit → `git push --follow-tags`. The `release` workflow (`.github/workflows/release.yml`) triggers on `v*` tags, runs tests, publishes all packages to npm via OIDC trusted publishing (with provenance), creates the GitHub Release, and deploys the docs site to Pages. During the transition, if a package lacks an npm Trusted Publisher, fall back to `./scripts/publish.sh` → `./scripts/publish-github-release.sh`. After release: `deck refresh --exec` → `deck link`.

#### Key Commands

| Need | Command |
|------|---------|
| **Load skills (do first)** | `bun packages/lythoskill-deck/src/cli.ts link` (shorthand: `deck link`) |
| Run tests | `bun --filter='*' run test` |
| Probe state | `bun packages/lythoskill-project-cortex/src/cli.ts probe` (shorthand: `cortex probe`) |
| Create task | `bun packages/lythoskill-project-cortex/src/cli.ts task "title"` (shorthand: `cortex task`) |
| ZK Review a task | Spawn ZK agent, WHAT/WHY/HOW on task card + AGENTS.md (pass paths) |
| Arena quick run | `bun packages/lythoskill-arena/src/cli.ts single --deck <path> --brief "prompt"` (shorthand: `arena single`) |
| Release | `bunx @lythos/skill-creator@0.19.2 bump` → `git push --follow-tags` → watch Actions (`gh run watch`) |

**Shorthand**: `deck link`, `arena single`, `cortex probe` resolve to `bun packages/<name>/src/cli.ts <cmd>` (in-repo) or `bunx @lythos/<name> <cmd>` (external). Full table: `skills/lythoskill-project-cortex/references/COMMANDS.md`.

#### Session Close & Submit

**Daily close** (every session):
```
1. git status && git log --oneline -5     — verify state
2. cortex probe                            — close stale tasks/epics
3. bun --filter='*' run test               — test gate (canonical)
4. Write daily/YYYY-MM-DD.md               — dump what file exploration cannot recover
   (pitfalls, why-we-chose-this, anomalies, specific next steps)
   Things WITH structured carriers (task/ADR/epic) → their carriers. Without → scribe.
   Save discipline (怕断电存盘): also after ANY mid-session commit batch —
   writing it ≠ session end; the section name marks the next session's read.
5. Commit daily, push
```

**Submit** (user says "submit" / "全提交" / "push"): README sync if CLI surface changed → test gate → commit with `Closes: TASK-xxx` → scribe daily → push → **verify CI** (GitHub Actions; distinguish `repo-existence` vs `path-existence` failures in validate-example-decks; `gh` 401 = token expired, tell user). If `site/**` changed, also check the **Deploy VitePress site to Pages** workflow — it runs separately from CI, so CI green ≠ site green (`gh run list --workflow="Deploy VitePress site to Pages"`).
**Release** (user says "release" / "发版" / "打tag"): submit, then bump → `git push --follow-tags` → verify the `release` Actions run publishes to npm, creates the GitHub Release, and deploys Pages → `deck refresh --exec` → `deck link`. If the new pipeline cannot publish a package (e.g., missing npm Trusted Publisher), fall back to `./scripts/publish.sh` → `./scripts/publish-github-release.sh`. Never bump without explicit user intent — versions are shared across the monorepo. A plain "submit/push" is not a release.

**Before ending any session, answer with commands, not intentions**:
```
cortex list         # in-progress tasks with no recent commits — advance them now?
git status --short  # uncommitted work that should be committed?
ls daily/*.md | sort | tail -1   # today's daily written and matching HEAD?
```

#### Critical Gotchas

Each caused at least one real incident. Scan before committing. **New gotcha → append.**

**[BOOT / TEST]**
- `[TEST]` `bun --filter='*' run test` is canonical. `scripts/test-report.ts` is a supplement — if they diverge, the script is wrong.
- `[BDD]` Agent BDD (`showcase/*/reproduce.sh`) uses LLM calls, NOT in pre-commit. Run intentionally before major releases. Patch a BDD test for the 3rd time → the scenario is stale, rewrite it.
- `[DECK]` `.claude/skills/` stale or empty → `deck link` (not `bun install`) refreshes the working set.
- `[TEST]` `Bun.spawnSync` pipe capture returns empty stdout/stderr (exit code still correct) under `bun test` with coverage on (repo `bunfig.toml`). Subprocess-assertion tests must redirect via `sh -c` to files and read them back — see `scripts/check-site-commands.test.ts`.
- `[TEST]` Env-sensitive code (host detection, `process.env` branches) makes tests host-dependent: the local gate runs inside an agent session (`CLAUDE_CODE_SSE_PORT` set) but CI has a clean env — a test can be green locally and red in CI (2026-08-29 incident, arena singleRun validation tests). Tests covering env-branched code must pin the env vars explicitly; when in doubt, verify with `env -u CLAUDE_CODE_SSE_PORT -u CLAUDECODE bun --filter='*' run test` (CI simulation).

**[RELEASE]**
- `[SEMVER]` 0.x: patch = bug fix only; minor = any API change (new subcommand/flag/exported function, even "small"); major = breaking. Never bump without explicit user intent.
- `[TAG]` New flow: push the tag with `git push --follow-tags` after the bump commit. `.github/workflows/release.yml` runs on `v*` tags and handles npm publish, GitHub Release, and Pages deploy.
- `[VERSION]` (legacy local fallback) Push to github BEFORE npm publish = external consumers see docs the CLI can't fulfill. Order: test → bump → commit → push → publish → tag/release. `publish.sh` is npm-only; `publish-github-release.sh` syncs GitHub tags/releases after push.
- `[PROVENANCE]` npm publishes from Actions carry provenance only if the package has a Trusted Publisher configured on npmjs.com for `lythos-labs/lythoskill/.github/workflows/release.yml`.
- `[LEAK]` Published manifests must never contain `workspace:*` in consumer-visible sections (deps/optional/peer — devDeps are never installed by consumers; the rewriter covers them too since TASK-20260730140801284) — 0.11.0 / 0.15.7 / 0.17.2 incidents. `release.yml` rewrites before publish and runs the tripwire `scripts/check-published-manifests.ts <version>` after publish. The legacy `publish.sh` also rewrites and runs the same tripwire. After any publish — or to audit any old version — run it directly.
- `[LOCKFILE]` Any `package.json` version change → `bun install` before commit. CI uses `--frozen-lockfile`.
- `[WORKSPACE]` Never semver ranges on `@lythos/*` deps — `workspace:*`. Pre-commit enforces.
- `[PUSH]` `git push` to `skills` may fail `(cannot lock ref)` on concurrent-session races. Fix: `git pull --rebase` then push.

**[EDIT]**
- `[SED]` `sed -i` is silent corruption risk. Survey with grep/sed (read-only) → fix call sites one by one with the type checker watching.
- `[GUARD]` `|| true` is always wrong. Parse stdout for the specific signal — don't blanket-suppress exit codes.

**[VALIDATE]**
- `[DONE]` Before claiming done: tests pass + TS compiles + CLI changed → README + new package → `scripts/publish.sh` + deck example changed → `deck validate`.
- `[GUARD-SENSITIVE]` Modifying `.husky/`, `scripts/pre-commit-*.ts`, `scripts/check-path-safety.ts` → QA with a negative test proving the guard catches violations (use the qa-sweep deck).

**[REVERT]**
- `[RECONCILE]` Reverting declarative files (`skill-deck.toml`, `package.json`) without re-running the reconciler (`deck link`, `bun install`) leaves derived state broken.

#### QA Security Sweep (Module Audit)

```
detect (arena single --deck examples/decks/qa-sweep.toml) → review findings (filter false positives)
→ register (cortex task per confirmed finding) → fix (P1 now, easy P2) → verify (re-run tests)
```

Findings → tasks → fixes → verify — don't just find, act and track. Repeating bug class → centralized guard module, applied at all call sites; the guard IS the documentation. Full: [qa-sweep COMBO](examples/decks/qa-sweep-COMBO.md).

---

## Z4 — Reference

### 5. Arena at a Glance

Three patterns cover 90% of usage: **single-deck test** (`arena single --deck <path> --brief "<task>"`), **cross-model validation** (same prompt through `--player kimi|codex|claude` — divergent gaps = doc ambiguity, convergent = real blocker), **module audit** (QA sweep above). Errors are HATEOAS-style (phase + findings + suggested fixes). Full runtime: [arena-runtime.md](packages/lythoskill-arena/skill/references/arena-runtime.md).

### 6. Hot Files

| File | Risk | Why |
|------|------|-----|
| `packages/lythoskill-deck/src/add.ts` | Parsing creep | 32 known locator forms — each feature adds a parse path |
| `packages/lythoskill-cold-pool/src/fetch-plan.ts` | Git side-effects | `execFileSync('git', ...)` — check exit codes |
| `cortex/hooks/*.ts` | Silent governance failure | Hooks failing silently = trailers not dispatching |
| `.husky/` | Guard cascade | Bugs affect every commit — QA with qa-sweep deck |
| `AGENTS.md` | Compaction amnesia | Most-changed doc — re-read Release/Auth after compaction |
| Release pipeline | Lockfile drift / tag-release gap | New: bump → install → commit → `git push --follow-tags` → Actions handles publish + release + Pages. Fallback (transition): bump → install → commit → push → publish → tag/release. `release.yml` is the primary trigger; `publish.sh` + `publish-github-release.sh` are local fallbacks. |
| Cold pool clones (`~/.agents/skill-repos/`) | Derived state | Cache, never hand-edit — fix the source, then `refresh --exec` + `link` (2026-07-17 incident) |

### 7. Deck Governance

`skill-deck.toml` declares active skills; `deck link` reconciles the working set (deny-by-default).

```bash
deck add <locator>     # Clone to cold pool + append to deck
deck link              # Reconcile working set
deck validate          # Check locator validity
deck refresh           # Discover + plan (no auto-apply)
```

**FQ-only locator policy**: `github.com/lythos-labs/lythoskill/skills/lythoskill-deck`, never `lythoskill-deck`; `localhost/owner/repo[/skill]` for local-only. No implicit registry lookup — reconciliation, curator indexing, and symlink resolution are all deterministic.

**Never guess skill paths** — verify: (1) clone and `ls`, (2) `curator discover`, (3) GitHub tree. Guessing is the `|| true` of deck authoring. **Always read a deck's `[combo.<name>]` sections** — combo prompts are the orchestration playbook.

#### Deck-First Dispatch (Conditioned Reflex)

**Don't ask "should I use X or do it manually?" — just dispatch.** Pre-built decks: [examples/decks/INDEX.md](./examples/decks/INDEX.md).

| User says | Dispatch |
|-----------|----------|
| 调研 / 研究 / 查一下 | `arena single --deck examples/decks/deep-research.toml --brief "..."` |
| 扫一下 / 审计 / 找问题 | `arena single --deck examples/decks/qa-sweep.toml --brief "..."` |
| 设计 / 架构 / 画图 | `arena single --deck examples/decks/architecture-explainer.toml --brief "..."` |
| 写文档 / 科普 | `arena single --deck examples/decks/documents.toml --brief "..."` |
| 治理 / task / epic | `arena single --deck examples/decks/governance.toml --brief "..."` |
| 体验 / 测试 UX | `arena single --deck examples/decks/scout.toml --brief "..."` |

### 8. Project Structure

```
lythoskill/
├── packages/                  # All logic (npm publishable); <name>/src (CLI) + <name>/skill (SKILL.md source)
├── skills/                    # Built output (committed — consumers clone-and-use)
├── .claude/skills/            # Agent working set (symlinks)
├── cortex/                    # Governance (ADR, epic, task, wiki)
├── daily/                     # Session journals (cross-CLI)
├── weekly/                    # Pattern extraction
└── examples/decks/            # 18 pre-built deck configs
```
Package inventory: root `package.json` workspaces. Skill-only packages (scribe, scribe-weekly, dreaming, coach) have no npm package.

### 9. Release & Auth (Compaction-Safe)

#### Auth state — pre-configured, do not modify

| Resource | Purpose | Rule |
|----------|---------|------|
| `.git/config` origin URL | Git push/fetch | Uses SSH alias `calt13.github.com`. **Never** `git remote set-url` to embed a token or switch protocol. |
| `~/.ssh/` | SSH keys + alias config | Off-limits. Do not read/write/list inside. |
| GitHub PAT | `gh` CLI and agent API calls | Stored in system keychain (see below). `.github-token` is a legacy fallback; do not create or update it unless explicitly asked. |
| npm token | Publish to npmjs.com | **No long-lived token.** The release pipeline uses OIDC trusted publishing from GitHub Actions. `.npm-access` is legacy fallback only. **Never run `npm login`.** |

#### GitHub token storage and permissions

The agent reads the PAT from the system keychain:

- **macOS**: `security find-generic-password -s 'lythos-agent-pat' -w`
- **Linux**: `secret-tool lookup org lythos-labs scope agent`

To store or rotate:

```bash
# macOS
security add-generic-password -U -s "lythos-agent-pat" -a "$USER" -w

# Linux
secret-tool store --label="lythos-labs agent PAT" org lythos-labs scope agent
```

The PAT needs a **fine-grained personal access token** with these repository permissions for `lythos-labs/lythoskill`:

| Permission | Level | Why |
|------------|-------|-----|
| `contents` | write | Push code, create tags, create/edit Releases |
| `issues` | write | Issue/label management |
| `pull_requests` | write | PR creation/review/merge |
| `pages` | write | Pages configuration (local diagnostics) |
| `workflows` | write | Push workflow file changes |
| `actions` | write | Trigger/re-run/cancel workflow runs |
| `metadata` | read | Auto-included by GitHub |

Quick pre-fill link (permissions only; still manually select the repository):

```
https://github.com/settings/personal-access-tokens/new?name=lythos-agent-pat&description=OSS+maintenance+agent&expires_in=none&contents=write&issues=write&pull_requests=write&pages=write&workflows=write&actions=write
```

For CLI use, export `GH_TOKEN` from the keychain:

```bash
export GH_TOKEN="$(security find-generic-password -s 'lythos-agent-pat' -w)"
```

#### npm side — OIDC trusted publishing

The release pipeline (`release.yml`) publishes to npm via **OIDC trusted publishing**:

- GitHub Actions presents a short-lived OIDC token to npmjs.
- npm verifies it against a **Trusted Publisher** registered per package.
- No `NPM_TOKEN` secret is stored in the repo.
- Every published package gets automatic provenance linked to the Actions run.

Each `@lythos/*` package on npmjs.com must have one Trusted Publisher:

| Field | Value |
|-------|-------|
| Publisher | `lythos-labs` |
| Repository | `lythoskill` |
| Workflow filename | `release.yml` |
| Environment name | leave blank / "No environment" |
| Allowed actions | `npm publish`, `npm stage publish` |

**New packages** need a first manual publish (classic token or local `publish.sh`) before the Trusted Publisher can be added, because npm cannot register a publisher for a non-existent package.

Full setup details and troubleshooting: [release-auth-workflow.md](packages/lythoskill-creator/skill/references/release-auth-workflow.md).

#### Lock-step versioning — the release procedure

All packages + root share one version, moved **only** through the CLI, never by hand.
Full detail (auth/OIDC setup, first-publish for a new package, legacy fallbacks): [release-auth-workflow.md](packages/lythoskill-creator/skill/references/release-auth-workflow.md).

**The steps below are the ones you must not get wrong — each is here because omitting it fails *silently*.**

```bash
V=$(grep '"version"' package.json | head -1 | sed 's/.*: "//;s/".*//')   # current version
bunx @lythos/skill-creator@$V bump patch --dry-run    # plan only; writes nothing
bunx @lythos/skill-creator@$V bump patch              # patch | minor | major | X.Y.Z
git status --short                                    # review what it touched
git add -u && git commit -m "chore(release): vX.Y.Z"
git tag -a vX.Y.Z -m "vX.Y.Z"                         # ← the bump does NOT do this
git push --follow-tags
```

The bump does everything mechanical in one run: root version → align every `packages/*/package.json` → **`bun install`** (regenerates `bun.lock`) → update the `bunx @version` strings in `packages/*/README.md` → rebuild every skill. There is no separate `bun install` step.

Three traps, in the order you will hit them:

1. **The `@$V` specifier is the *current* version, not a literal.** A stale one installs a different creator than the repo's. Substitute it; never copy a pinned number out of this file — this file's own copy is rewritten by every bump for exactly that reason.
2. **The bump does not create the tag, and the tag is the release.** `release.yml` fires on `on: push: tags: v*` and on nothing else. So **no tag = no release, with no error anywhere**: the commit lands on `main`, CI goes green, and npm keeps serving the old version. A *lightweight* tag fails the same way — `--follow-tags` pushes **annotated** tags only, so `git tag vX.Y.Z` (no `-a`) is silently skipped. Always `git tag -a`.
3. **Bump target.** `patch` for fixes, refactors, test-only and docs riding along; `minor` for a new capability users can invoke; `major` for a breaking CLI/API change. Rhyme it with the commit type — `fix(…)` → patch, `feat(…)` → minor. On 0.x, minor is the ordinary feature bump. Unsure? Read the cadence: `git tag --sort=-v:refname | head -5`.

**Verify the release started, and then that it actually published — do not assume either.**

```bash
export GH_TOKEN="$(security find-generic-password -s 'lythos-agent-pat' -w)"   # macOS
gh run list --limit 3                  # expect a `release` run on the tag: in_progress → success
gh release view vX.Y.Z                 # the GitHub Release the run creates

# Confirm the publish landed on npm. DERIVE the names — never type them.
# The npm names are NOT the directory names: deck is `@lythos/skill-deck`, arena is
# `@lythos/skill-arena`, creator is `@lythos/skill-creator`. Guessing one of those
# returns an EMPTY version, which reads exactly like a failed publish.
for f in packages/*/package.json; do
  n=$(grep '"name"' "$f" | head -1 | sed 's/.*: "//;s/".*//')
  [ -n "$n" ] && echo "  $n $(npm view "$n" version 2>/dev/null | tail -1)"
done
# Every line must read the new version. An empty column is a name you invented.
```

The run publishes every package to npm via OIDC trusted publishing (with provenance), creates the GitHub Release, and deploys the docs site to Pages. The pre-push hook separately syncs the `skills` branch (hexo-style).

#### Bun version pin — CI and local must name the same interpreter

Every `bun-version:` in `.github/workflows/` is an **exact version**, never `latest` — currently
`1.3.11`, the same version the test baselines are quoted under. Check the set with
`grep -rn "bun-version" .github/workflows/` (8 occurrences across `test.yml`, `release.yml`,
`deploy-pages.yml`; only the first in each file carries the comment).

Why pinned: this repo's discipline is that behavioral assumptions about the `node:*` compat layer
must be nailed down by tests actually run under Bun (§4 / B11). `latest` breaks that — the same
dormancy test can pass on 1.3 and fail on 2.x, and a green CI run would not say which interpreter it
certifies. **CI green is a claim; it needs a version to be attributable to.**

Upgrading is a deliberate act, never background drift:

1. Read the Bun release notes for `node:*`, the test runner, TOML, and `fs` behavior changes.
2. Run the full suite on the new version locally, both packages, and write the new baseline as a
   claim: `236 pass / 1 skip / 0 fail / 602 expect @ Bun <new> / macOS` — never a bare pass count.
3. Move **all 8** occurrences plus the version string above in **one** commit, and say in the
   message what you checked in step 1.
4. Do not fold an upgrade into an unrelated change: a red suite otherwise becomes ambiguous between
   your change and the interpreter.

Rationale and the rejected alternatives (`latest`; `1.3.x` minor-pinning): **ADR-20260910120047160**.

#### New package checklist

- Add to `scripts/publish.sh` `PACKAGES` array before first release.
- Publish the first version manually (Trusted Publisher cannot be added for a package that does not exist).
- Add the Trusted Publisher on npmjs.com.
- Future releases then go through the tag-triggered Actions pipeline.

#### SKILL.md sources are templates

`packages/*/skill/SKILL.md` uses `{{PACKAGE_VERSION}}` — never write literal versions (breaks future renders; build substitutes from root `package.json`).

### 10. Project Skills

| Skill | Purpose | When to invoke |
|-------|---------|----------------|
| `lythoskill-deck` | Deck governance (link/add/remove/refresh/validate) | "switch deck", "add skill", "clean up skills" |
| `lythoskill-arena` | Skill test-play (single/vs, deck-first dispatch) | "test this skill", "compare A vs B", "audit this package" |
| `lythoskill-curator` | Cold-pool skill indexer (scan/query/tag/audit) | "find a skill for X", "what skills do I have" |
| `lythoskill-project-cortex` | ADR/Epic/Task governance + ZK Review | "create task", "register finding", "ZK review this" |
| `lythoskill-project-scribe` | Session handoff (daily context dump) | Save after commit batches (mid-session or close), "log this" |
| `lythoskill-project-scribe-weekly` | Weekly pattern extraction | End of week, "weekly review" |
| `lythoskill-project-onboarding` | Session context loader | Start of session, "what happened last time" |
| `lythoskill-dreaming` | Memory consolidation → SSOT | "Consolidate docs", "SSOT sweep" |
| `lythoskill-coach` | SKILL.md quality review | Reviewing/optimizing a skill |

### 11. Pointer Index

> AGENTS.md is the TL;DR. These files have the full detail. Load on demand.
> **⚠️ Source paths**: files live in `packages/*/skill/references/` (source) and are built to `skills/*/references/` (committed output). Paths below point to source — readable without `deck link`.

| When you need to… | Read |
|-------------------|------|
| Full memory pipeline (3-axis model + SSOT diagram) | [ZK Review reference § SSOT](packages/lythoskill-project-cortex/skill/references/zk-review.md) |
| ZK Review methodology (prompt templates, gap processing, trial-usage, real cases) | [ZK Review reference](packages/lythoskill-project-cortex/skill/references/zk-review.md) |
| What session jargon means (ZK review baseline for handoffs — deposit recurring terms here) | [Glossary](cortex/wiki/04-ssot/glossary.md) |
| Intent/Plan/Execute deep dive (IO injection table, when/when-not) | [intent-plan-execute.md](packages/lythoskill-deck/skill/references/intent-plan-execute.md) |
| Thin Skill Pattern full detail (build pipeline, skill product ID) | [thin-skill-pattern.md](packages/lythoskill-creator/skill/references/thin-skill-pattern.md) |
| Why Bun over Node, ESM-only, monorepo conventions | `cortex/adr/02-accepted/ADR-20260503170000000-monorepo-toolchain-bun-only-and-root-package-json-conventions.md` |
| Why lock-step versioning | `cortex/adr/02-accepted/ADR-20260502233119561-bump-command-and-lockstep-versioning-policy.md` |
| Release & Auth full contract (publish order, bump internals) | [release-auth-workflow.md](packages/lythoskill-creator/skill/references/release-auth-workflow.md) |
| All CLI commands (dev + bunx forms) | `skills/lythoskill-project-cortex/references/COMMANDS.md` (auto-generated) |
| Arena runtime (timeout mapping, CWD behavior, judge prompts, HATEOAS errors) | [arena-runtime.md](packages/lythoskill-arena/skill/references/arena-runtime.md) |
| Hot files + recurring work patterns (full security context) | [project-hotspots.md](cortex/wiki/04-ssot/project-hotspots.md) |
| Code conventions + naming rules (ESM-only, fence trick, file permissions, imports) | [conventions.md](cortex/wiki/04-ssot/conventions.md) |
| Positive autonomy framework (four quadrants, token trap, team-member test) | [agent-autonomy lesson](cortex/wiki/03-lessons/2026-06-07-agent-autonomy-positive-decision-boundary.md) |
| Agent-facing error design (HATEOAS, annotation mindset) | [annotation-mindset.md](cortex/wiki/01-patterns/2026-05-15-annotation-mindset-agent-facing-code-annotations-as-ioc-for-agent-behavior.md) |
| Agent adapter architecture (player abstraction) | [player-abstraction.md](cortex/wiki/01-patterns/2026-05-06-player-abstraction-agent-swappable-backend.md) |
| Two axes — player (open registration of *behavior*) vs CLI-layout (closed *sourced data*); they never merge | [ADR-20260910113131220](cortex/adr/02-accepted/ADR-20260910113131220-player-axis-is-open-registration-cli-layout-axis-is-closed-sourced-data-two-axes-never-merge.md) |
| Dormancy tests (fallback hint validation on happy path) | [dormancy-tests.md](cortex/wiki/01-patterns/2026-05-09-dormancy-property-test-for-fallback-hints.md) |
| Cortex directory structure (numeric prefixes) | [cortex/INDEX.md](cortex/INDEX.md) |
| BDD / reproduce.sh testing | [TESTING.md](./TESTING.md) |
| Session handoff template | [daily-template.md](packages/lythoskill-project-scribe/skill/references/daily-template.md) |
| All pre-built decks by use case | [examples/decks/INDEX.md](./examples/decks/INDEX.md) |
| Combo orchestration / transient & fork skill types | [lythoskill-deck SKILL.md](packages/lythoskill-deck/skill/SKILL.md) |
| DeepSeek TUI adapter (daemon lifecycle, smoke tests) | [agent-adapter README](packages/lythoskill-agent-adapter/README.md) |
