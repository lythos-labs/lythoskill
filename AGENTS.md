# lythoskill — AGENTS.md

> Project guidance for agents that read `AGENTS.md` (Kimi, Codex, Copilot, Gemini CLI, etc.).
> If you are Claude Code, read [`CLAUDE.md`](./CLAUDE.md) instead — it points back here.
> Human contributors: see [README.md](./README.md).

> **⚠️ COMPACTION-SAFE — read this before any release, version, git remote, or npm command.** (Compaction = context window overflow — the agent loses conversation history. After compaction, re-read this section before touching auth, version, git, or npm.)
> Auth (`.git/config`, `~/.ssh/`, `.github-token`, `.npm-access`) is **pre-configured — do not modify**.
> Versions move via `bunx @lythos/skill-creator@0.16.0 bump`, never by hand-editing `package.json` or `jq`/`python`/`sed`.
> Full contract: [Release & Auth Workflow](packages/lythoskill-creator/skill/references/release-auth-workflow.md).

> **🚀 Bootstrap check**: If `.claude/skills/` is empty, run `bun packages/lythoskill-deck/src/cli.ts link` to populate the working set. This makes all skill references below resolvable. Deck reconciles the working set against `skill-deck.toml` — creating symlinks from the cold pool (`~/.agents/skill-repos/` by default, where `deck add` clones repos) into `.claude/skills/`.

---

<!--
AGENTS.md is an activation map — most sections trigger a behavior; Z4 is reference.
Non-breaking additions → APPEND. Breaking changes → reorder freely.
-->

## Z1 — Foundation

### 0. Boot First

If you were just dropped into this repo, run these five steps **before touching any code**:

```
bun install
bun packages/lythoskill-deck/src/cli.ts link
# read daily/YYYY-MM-DD.md (latest)
git status && git log --oneline -5
bun packages/lythoskill-project-cortex/src/cli.ts probe
```

Why this order: dependencies → skills → session state → ground truth → drift check.

**Source paths are readable immediately.** `packages/*/skill/references/` and `skills/*/` are git-tracked source files. You do not need `.claude/skills/` to be populated before reading them. `.claude/skills/` is the runtime working set; source paths are the SSOT.

Full session rhythm: see §4 Daily Operations.

### 1. Identity

#### What Lythoskill Is

**A governance layer for the agent skill ecosystem.** Two audiences:

1. **Deck Governance**: Declare which skills a project needs. Undeclared skills are physically absent from the agent's working set — deny-by-default prevents silent conflicts (e.g., two skills defining the same command name, or stale symlinks from a prior session).
2. **Thin Skill Pattern**: Scaffold monorepos where heavy logic lives in npm packages and agent-facing instructions live in lightweight SKILL.md files.

Lythoskill is its own first user (self-bootstrap: it uses its own deck/arena/cortex tools to build itself). It is a **meta-layer** — it doesn't compete with skills, it governs them.

**Community-interoperable**: `skills/` (committed build output) is designed to be read by any agent ecosystem — a consumer looking only at `skills/` sees a self-contained skill collection, independent of the monorepo's implementation details. As a developer in this repo, you edit `packages/*/skill/SKILL.md` and `packages/*/src/`, then `build` to update `skills/`.

#### What Lythoskill Is Not

- **Not a skill registry** — curator is a local indexer, not a marketplace
- **Not an MCP server** — skills are agent-facing instructions, not protocol adapters
- **Not a runtime/framework** — no install required by consumers; skills are called via `bunx`

#### Memory Infrastructure (Meta-Cognition)

> The project has 1000+ commits. The bottleneck is no longer agent capability — it's agent memory across sessions.

Lythoskill develops **three complementary memory axes**, not one pipeline:

| Axis | Problem | Solution | When to use |
|------|---------|----------|-------------|
| **Externalization** | Agent doesn't know what happened | cortex tasks/ADRs, plan-extract tests (verifiable memory), wiki | When you finish work that has structure (task, decision, pattern) |
| **Compression** | Context window can't fit everything | daily ground truth (overwrite, not append), weekly core_thread, refs (on-demand load) | When context is full; when ending a session |
| **Zeroing** | Self-review has blind spots | ZK Review (task executability), ZK audit (test adequacy), ZK validation (doc readability) | Before assigning any task; before claiming any doc "done" |

**SSOT is a compass, not a database.** Git + filesystem = territory (always queryable). SSOT docs = compass (what matters, why, where next). Never write into SSOT what `git log`/`ls`/`grep`/`diff` can recover. Full model: [SSOT Memory Pipeline](packages/lythoskill-project-cortex/skill/references/zk-review.md#ssot-记忆管线三轴模型).

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

**Cold pool / working set relationship**: see `"skill-deck.toml"` in the root of this workspace — the `[deck]` section has inline comments explaining `cold_pool` (git clone cache) and `working_set` (symlinks your agent loads). Read the file for the canonical explanation.

**Intent / Plan / Execute (Fractal)** — every command decomposes into three layers:
```
Intent (DSL)   →  Plan (pure data)  →  Execute (IO, injectable)
```
Why: dry-run emerges naturally, pure plan functions unit-test without IO, inject `io = { spawn, log, delete }` for mock testing. Full: [intent-plan-execute.md](packages/lythoskill-deck/skill/references/intent-plan-execute.md). The IO injection table (spawn/delete/log/gitPull/linkDeck → production default vs test swap) is documented there.

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
3. **Do not guess emotions.** "The user seems angry" is projection, not fact. "The user said this is wrong" is fact — stop and ask.
4. **"I think / 我觉得" = start an ADR.** User is exploring options, not issuing a command. Write an ADR capturing trade-offs; do not jump to implementation.
5. **System silence is not permission.** If the platform prompts "the user has not said anything," stop, summarize state, ask for next step.
6. **Git provenance over design assumption.** `git log --oneline -5 <file>` beats guessing why code looks wrong. This repo's small-granularity commits make this a 5-second operation.
7. **See a bug, fix a bug — no "not my code."** If you discover a broken test, a mismatched import, a stale comment, or any defect that would trip up the next agent, fix it. Git provenance tells you who introduced it; that information is for learning, not for excusing. The codebase has no owners, only stewards.

#### When Internal Signals Fire

| When you catch yourself thinking... | Do this |
|-------------------------------------|---------|
| "The user seems angry" | Re-read their literal words. What did they actually ask? Tone-reading burns cognition on imaginary signals. |
| "I need this to pass so the user isn't upset" | Report what you found — including failures. Fake green is worse than red. |
| "I shouldn't bother them with questions" | State the ambiguity, propose options, ask. One clear question costs less than an hour of wrong work. |
| "The real problem is the architecture" | Quote their ask back literally. If you still think something bigger needs fixing, ask — don't substitute silently. |

**The rule**: internal hesitation = signal to pause and surface. Ambiguity is not a bug to hide — it's information the user needs. Full case study: [sunk-cost-fallacy.md](cortex/wiki/02-research/2026-05-13-sunk-cost-fallacy-git-rollback-cheaper-than-patch.md).

#### Intent Belongs to the User

When the user asks for a "simple fetch wrapper," do not silently substitute "write a `fetch-text` helper." Tell-tales of Intent hijacking:

| Tell-tale | What it sounds like |
|-----------|-------------------|
| **Rename the ask** | "By 'simple wrapper' you probably mean a helper class" |
| **Defend the rename** | "The alternative would be very long / messy / risky" |
| **Manufacture cost** | "Rewriting from scratch is risky" (when it's 3 extra lines) |
| **Commit before interrupt** | Push changes before user can react, then cite cost-of-undo |
| **Delete unfamiliar artifacts** | Remove prior-session work you don't recognize — ignorance is not license to delete |

**Positive path**: quote their ask back literally. Disagree? Ask — don't silently substitute. Small change ≠ small decision — architectural choices (signature shape, abstraction boundary, exported name) don't get committed before user acceptance. `git stash` is reversible; `git rm` + commit is not.

**Sunk-cost defense**: when direction is wrong, return to Plan and state the target shape — don't stay in Execute morphing the pile. `git checkout HEAD -- <file>` or `git reset`, then rewrite.

**Verify ≠ commit landed**: reverting declarative state (skill-deck.toml, package.json) without re-running the reconciler leaves derived state broken. Reconcilers are idempotent commands that derive state from declarative config — e.g., `deck link` (derives `.claude/skills/` from `skill-deck.toml`), `bun install` (derives `node_modules/` from `package.json`). After reverting declarative files, always re-run the reconciler. Full case study: [sunk-cost-fallacy.md](cortex/wiki/02-research/2026-05-13-sunk-cost-fallacy-git-rollback-cheaper-than-patch.md).

---

## Z3 — Operations

### 3. Task Design

#### ZK Review Gate (Mandatory Pre-Assignment)

**Pattern impression**: Spawn a zero-context agent, give it the task card + AGENTS.md, ask WHAT/WHY/HOW, collect gaps. Fill real gaps, challenge false positives, ignore exploration-friendly ones. Spawn the same agent for round 2. Converge at <2 new gaps.

**Detailed operation**:
```
write task → self-review → ZK Review (WHAT/WHY/HOW) → process gaps
                                              ↓
                                    <2 new gaps & all low-priority?
                                              ↓ no
                                    spawn same agent → back to ZK Review
```
Three rounds is a reasonable default. If still not converged after round 3, the task design itself is the problem — go back to scope/solution, not more description.

**4 required content types** (what ZK Review most often exposes as missing):

| Type | Question | Example fix |
|------|----------|------------|
| Prerequisite knowledge | Where is the code? | File path + line number |
| Interface contracts | What are the signatures? | Upstream/downstream function declarations |
| Baseline data | What are the anchors? | Current value, target range |
| Scope declaration | Mandatory vs optional vs not-doing? | 必达/可选/不做 with explicit boundaries |

**Boundary**: ZK agents expose gaps, not provide truth. Test: "Can the executor start work without this?" Yes → fill. No → note and move on.

**How to run** (you already know how to spawn a subagent — use your own tool):

**Pass by reference, not by value.** Don't paste the task card content into the prompt — give the subagent the file path and let it read. Same for AGENTS.md, deck configs, or any structured artifact. This is how you hand a subagent its own deck: point it at `examples/decks/<name>.toml` and let it load the skills it needs.

1. Spawn a subagent with ZERO project context
2. Give it: the **file path** to the task card + the **file path** to this AGENTS.md file
3. Prompt template:
   ```
   You are a ZERO-KNOWLEDGE reviewer. You have never seen this project.
   Read the attached task card and AGENTS.md.
   For the task, report:
   1. WHAT: What does this task ask you to do? (yes/no/partially)
   2. WHY: Why does this task matter? (yes/no/partially)
   3. HOW: What files would you touch and what would you change? (yes/no/partially)
   4. GAPS: List every specific thing you DON'T know that you'd need to ask before starting.
      Be specific: missing file paths, missing function signatures, missing parameter values,
      missing scope boundaries (mandatory vs optional vs not-doing), anything ambiguous.
   Do not say "it's clear" if you're guessing. Be specific about each gap.
   ```
4. Process each gap:
   - **Fill**: Would this gap prevent the executor from starting independently? → Add to task card
   - **Challenge**: Is this the ZK agent's knowledge gap rather than a real gap? → Note in task card why not fixing
   - **Ignore**: Would the executor figure this out from AGENTS.md + normal file exploration? → Move on
5. If gaps remain, spawn the SAME agent (or append review log to a new one) for round 2
6. Converge when new gaps < 2 and all low-priority. Full methodology + real cases: [ZK Review reference](packages/lythoskill-project-cortex/skill/references/zk-review.md).

**Convergence is coordination, not elimination.** The goal is not "zero gaps" — it's "gaps no longer produce new information." If a ZK agent misunderstands something, that's signal: either the doc is ambiguous (fix it) or the agent's knowledge is genuinely incomplete (note why it's not a blocker). When you challenge a gap, the ZK agent can challenge back — this back-and-forth is the convergence mechanism. Three rounds is a practical ceiling; if you're still debating after round 3, the task scope itself is unclear.

**Real example — what ZK Review surfaced that self-review missed:**

> *Task: "Implement V2 encoder with temporal smoothing."*
> *ZK agent: "The old encoder already does some temporal smoothing in `_encode_pcm_tts()`. The task doesn't say whether V2 replaces, extends, or duplicates that logic."*

This is not a "missing file path" — it's a **design overlap** that the task author knew the answer to ("I plan to replace it") but never wrote down. Self-review can't catch this because the author already knows their own intent. ZK Review can — because the ZK agent has no prior context and reads only what's on the page.

**False positive — when to challenge back:** A ZK agent may report "cold pool is not defined" when AGENTS.md literally says "see `\"skill-deck.toml\"` in the root of this workspace." If the agent didn't follow the reference, that's **agent failure, not doc failure**. Challenge it: "The definition is in the referenced file — did you read it?" The ZK agent can then challenge back if the reference was unclear. This back-and-forth is the convergence mechanism.

#### Side Decks (Pass-by-Reference Dispatch)

Any deck in `examples/decks/` can be handed to a subagent as a **side deck** — a temporary, task-scoped skill set. The pattern is the same as ZK Review: pass the file path, let the subagent read it.

| Need | Side deck to pass |
|------|-------------------|
| Research a topic | `examples/decks/deep-research.toml` |
| Audit code quality | `examples/decks/qa-sweep.toml` |
| Write architecture docs | `examples/decks/architecture-explainer.toml` |
| Generate social content | `examples/decks/lythoskill-promo.toml` |
| Explore codebase | `examples/decks/deepseek-codebase.toml` |

The subagent reads the deck → runs `deck link --deck <path>` → loads only those skills → does the task. Your main deck stays unchanged. Full index: [examples/decks/INDEX.md](./examples/decks/INDEX.md).

#### ZK Validation Pattern (Documentation Readability)

For documents (wiki, ADRs, guides — distinct from task executability above), two escalating levels:
- **Level 1**: ZK subagent reads doc → self-reports understanding. Misunderstood sections need revision.
- **Level 2** (important docs): `arena single --player kimi` cross-model validation. If a non-Claude agent also understands, the doc is broadly usable. Available players: `kimi`, `codex`, `claude`, `deepseek` (see arena-runtime.md for full list).

Pattern: `produce doc → ZK agent read → self-report → revise → re-validate`. For task executability verification, see ZK Review Gate above.

---

### 4. Daily Operations

#### Start of Session

**Mechanical first, understanding later.** Don't read everything before acting.

0. **Ensure the environment works**: `bun install` (at the root of this workspace — Bun workspaces)
1. **Ensure skills are loaded**: confirm `skill-deck.toml` exists, then `bun packages/lythoskill-deck/src/cli.ts link` → populates `.claude/skills/` from cold pool. If `.claude/skills/` is already populated but stale from a prior session, run `bun packages/lythoskill-deck/src/cli.ts link` anyway — it's idempotent.
2. Read `daily/YYYY-MM-DD.md` (latest) → session handoff
3. `git status` + `git log --oneline -5` → verify freshness against handoff's git_commit
4. `bun packages/lythoskill-project-cortex/src/cli.ts probe` → check for state drift

**Troubleshooting**:
- `deck link` fails → check `"skill-deck.toml"` exists at the root of this workspace; check cold pool path (`~/.agents/skill-repos/` by default)
- `cortex probe` reports drift → run `bun packages/lythoskill-project-cortex/src/cli.ts list` to see mismatches
- Tests fail with "0 test files" in some packages → expected for skill-only packages, not an error

#### Daily Rhythm

A session goes through four phases:

**1. Boot** — mechanical, don't think, just execute:
```
bun install → bun packages/lythoskill-deck/src/cli.ts link → read daily/YYYY-MM-DD.md (latest) → git status && git log --oneline -5 → bun packages/lythoskill-project-cortex/src/cli.ts probe
```
You now know what happened last time and what's pending.

**2. Incoming** — user gives you something:
- 调研 / 扫一下 / 设计 / 写文档 / 治理 / 体验 → **dispatch.** Spawn arena with the matching side deck. Don't deliberate. (Full dispatch table: §6 Deck Governance.)
- Direct work → trivial? (single typo, one-liner, obvious import fix) just fix it. Non-trivial? (touches >1 file, changes CLI surface, needs new tests) `cortex task` first, then work.
- Unclear? **Ask.** Quote their words back, state the ambiguity, propose options.

**3. Working** — three guardrails that run the whole time:
- **Autonomy**: act without asking only when low-impact + reversible + ≥90% confident. `npm publish`, force-push, external messaging → always ask.
- **Subagent**: spawn for research, audit, execution. Don't spawn for judgment, architecture, or user communication — those are yours.
- **Deck first**: relevant skill exists? Use it — even for one-shot. Bypassing deck is the failure mode this project exists to solve.

**4. Closing** — `git status && git log --oneline -5` → `cortex probe` (close stale tasks) → write `daily/YYYY-MM-DD.md` (what file exploration cannot recover) → commit daily → push. (Full checklist: Session Close below.)

#### Task Lifecycle

```
bun packages/lythoskill-project-cortex/src/cli.ts task "title"    → 01-backlog
bun packages/lythoskill-project-cortex/src/cli.ts start TASK-xxx  → 02-in-progress
bun packages/lythoskill-project-cortex/src/cli.ts review TASK-xxx → 03-review (STOP — user marks done)
```

**Always use CLI** — never `mv` files by hand. CLI moves update Status History; manual `mv` causes probe mismatches. After creating a task, immediately edit the file to fill Background/Requirements/Acceptance — empty templates are rejected by pre-commit probe.

**English-only slugs**: `cortex task` / `cortex epic` titles must be ASCII-only. The generated filename (`TASK-xxx-<slug>.md` / `EPIC-xxx-<slug>.md`) must contain no Chinese or other non-ASCII characters, so paths remain portable across agents, CLIs, and operating systems.

#### Commit Trailers

```
Review: TASK-xxx       # in-progress → review  (dev complete, submit for review / internal PR)
Closes: TASK-xxx        # review → completed    (reviewed and approved / LGTM)
Task: TASK-xxx review   # Explicit verb (start, review, done, suspend, resume)
ADR: ADR-xxx accept     # ADR: accept, reject, supersede
Epic: EPIC-xxx done     # Epic: done, suspend, resume
```

Post-commit hook auto-dispatches to cortex CLI and creates a follow-up commit. This means after `git commit`, you may see an additional commit appear — this is normal. Malformed trailers print warnings but don't block. `Closes: TASK-xxx` is strict: it maps to `done` and requires the task to already be in `review`. Use `Review: TASK-xxx` when development is complete and ready for review. Full syntax: [cortex SKILL.md](packages/lythoskill-project-cortex/skill/SKILL.md).

#### Key Commands

| Need | Command |
|------|---------|
| **Load skills (do first)** | `bun packages/lythoskill-deck/src/cli.ts link` (shorthand: `deck link`) |
| Run tests | `bun --filter='*' run test` |
| Probe state | `bun packages/lythoskill-project-cortex/src/cli.ts probe` (shorthand: `cortex probe`) |
| Create task | `bun packages/lythoskill-project-cortex/src/cli.ts task "title"` or `... task create "title"` (shorthand: `cortex task` / `cortex task create`) |
| ZK Review a task | Spawn ZK agent, ask WHAT/WHY/HOW on the task card + AGENTS.md |
| Arena quick run | `bun packages/lythoskill-arena/src/cli.ts single --deck <path> --brief "prompt"` (shorthand: `arena single`) |
| Release | `bunx @lythos/skill-creator@0.16.0 bump` → `./scripts/publish.sh` |

**Shorthand convention**: throughout this doc, `deck link`, `arena single`, `cortex probe` etc. are shorthand. Resolution: `bun packages/<name>/src/cli.ts <cmd>` (in-repo dev) or `bunx @lythos/<name> <cmd>` (external). Full command table (auto-generated): `skills/lythoskill-project-cortex/references/COMMANDS.md`.

#### Session Close (Handoff)

1. `git status` + `git log --oneline -5` — verify state
2. `bun packages/lythoskill-project-cortex/src/cli.ts probe` — close stale tasks, close done epics
3. Write `daily/YYYY-MM-DD.md` — **dump what file exploration cannot recover** (pitfalls, why-we-chose-this, working-tree anomalies, specific next steps). Things WITH structured carriers (task files, ADRs, epics) go to their carriers. Things WITHOUT carriers go to scribe.
4. Commit daily, push

Scribe skill: [lythoskill-project-scribe](packages/lythoskill-project-scribe/skill/SKILL.md).

#### Critical Gotchas

Each of these caused at least one real incident. Scan before committing.
**When you discover a new gotcha — append it here.** This section grows as the project learns.

Format: `[PHASE] [TAG]` + **When you'll forget:** the moment the mistake feels safe → the rule.

**[BOOT / TEST]**
- `[TEST]` **When you'll forget:** you see two test commands and pick the prettier report. → `bun --filter='*' run test` is canonical. `scripts/test-report.ts` is a supplement — if they diverge, the script is wrong.
- `[BDD]` **When you'll forget:** you want cheap regression coverage in CI. → Agent BDD (`showcase/*/reproduce.sh`) uses LLM calls, NOT in pre-commit. Run intentionally before major releases. If you patch a BDD test for the 3rd time, the scenario is stale — rewrite it.

**[EDIT]**
- `[SED]` **When you'll forget:** a bulk rename looks faster than editing one by one. → `sed -i` is silent corruption risk. Survey with grep/sed (read-only) → fix call sites one by one with the type checker watching.
- `[GUARD]` **When you'll forget:** a guard script returns a non-zero exit you didn't expect. → `|| true` is always wrong. Parse stdout for the specific signal — don't blanket-suppress exit codes.

**[VALIDATE]**
- `[DONE]` **When you'll forget:** you're 90% sure and want to call it finished. → tests pass + TS compiles + if CLI changed → update README + if new package → add to `scripts/publish.sh` + if deck example changed → `deck validate` it.
- `[GUARD-SENSITIVE]` **When you'll forget:** you tweak a guard and assume the change is obviously correct. → Modifying `.husky/`, `scripts/pre-commit-*.ts`, or `scripts/check-path-safety.ts` triggers a pre-commit warning. QA with a negative test — verify the guard actually catches violations. Use `bun packages/lythoskill-arena/src/cli.ts single --deck examples/decks/qa-sweep.toml` for guard changes.

**[REVERT]**
- `[RECONCILE]` **When you'll forget:** you `git checkout HEAD --` a declarative file and think you're done. → Reconcilers must be re-run: `deck link` derives `.claude/skills/` from `skill-deck.toml`; `bun install` derives `node_modules/` from `package.json`. Reverting the input without re-running the function leaves derived state broken.

**[RELEASE]**
- `[LOCKFILE]` **When you'll forget:** you bump versions and the lockfile "looks unchanged." → Any `package.json` version change → `bun install` before commit. CI uses `--frozen-lockfile`.
- `[WORKSPACE]` **When you'll forget:** you pin an internal dep like an external one. → Never semver ranges on `@lythos/*` deps. Pre-commit enforces `workspace:*`.
- `[PUSH]` **When you'll forget:** you push to `skills` branch and it has always worked before. → `git push` to `skills` may fail with `[remote rejected] (cannot lock ref)` when concurrent sessions race. Fix: `git pull --rebase` then push.

#### Full Submit Pipeline

When user says "submit" / "全提交" / "push":

```
1. README sync (if CLI surface changed — check if commands/flags differ from docs)
2. Test gate (pre-commit already enforces)
3. Commit with Closes: TASK-xxx trailer
4. Scribe daily → commit daily
5. Push
6. (if release) bump → publish.sh
```

#### QA Security Sweep (Module Audit)

When asked to audit/sweep/check a module, follow this 5-phase loop:

```
Phase 1 — detect:  bun packages/lythoskill-arena/src/cli.ts single --deck examples/decks/qa-sweep.toml --brief "audit <module>" → findings
Phase 2 — review:  read findings, filter false positives, confirm real issues
Phase 3 — register: cortex task for each confirmed finding (P1 → fix now, P2 → backlog)
Phase 4 — fix:      fix P1 + easy P2 items, run tests
Phase 5 — verify:   re-run tests to confirm no regressions
```

Key principle: findings → tasks → fixes → verify. Don't just find — act and track. Use `Closes: TASK-xxx` trailer when committing fixes. When a bug class repeats across files, don't whack-a-mole — research best practices, write a centralized guard module in `scripts/` or `packages/<name>/src/guards/`, and apply at all call sites. The guard IS the documentation. Full: [qa-sweep deck](examples/decks/qa-sweep.toml) + [COMBO.md](examples/decks/qa-sweep-COMBO.md).

---

## Z4 — Reference

### 5. Hot Files

High-risk modification targets. Read before touching.

| File | Risk | Why |
|------|------|-----|
| `packages/lythoskill-deck/src/add.ts` | Parsing creep | 32 known locator forms — each feature adds a parse path |
| `packages/lythoskill-cold-pool/src/fetch-plan.ts` | Git side-effects | `execFileSync('git', ...)` — check exit codes |
| `cortex/hooks/*.ts` | Silent governance failure | Hooks failing silently = trailers not dispatching |
| `.husky/` | Guard cascade | Bugs affect every commit — QA with qa-sweep deck |
| `AGENTS.md` | Compaction amnesia | Most-changed doc — re-read Release/Auth after compaction |
| Release pipeline | Lockfile drift | bump → install → commit → push → publish — never skip steps |

#### Recurring Work Types

What 60+ recent commits look like — helps orient to project norms:

| Type | Frequency | Pattern |
|------|-----------|---------|
| Security hardening | 13 | Waves: P0/P1 sweep → P2 sweep → QA audit → repeat |
| Deck add/locator | 10 | Incremental: each shorthand adds normalize→parse→validate chain |
| Infra/CI | 8 | Meta-layer: bump lockfile, test counters, hook gates |
| Agent adapters | 6 | Template: build command array, spawn, parse, return AgentResult |
| Release | 5 | Mechanical: bump → commit → publish.sh |

### 6. Deck Governance

`skill-deck.toml` declares active skills. `deck link` reconciles the working set (deny-by-default).

```bash
deck add <locator>     # Clone to cold pool + append to deck (shorthand, see Key Commands)
deck link              # Reconcile working set (deny-by-default)
deck validate          # Check locator validity
deck refresh           # Discover + plan (no auto-apply)
```

**FQ-only locator policy**: all skill locators must be fully-qualified. No bare names. Write `github.com/lythos-labs/lythoskill/skills/lythoskill-deck`, never `lythoskill-deck`. `localhost/owner/repo[/skill]` for local-only skills. This eliminates implicit registry lookup — reconciliation, curator indexing, and symlink resolution are all deterministic.

**Never guess skill paths — verify with real repo structure.** Options in priority order: (1) clone and `ls`, (2) `curator discover` (`bun packages/lythoskill-curator/src/cli.ts discover`), (3) GitHub tree. Guessing paths is the `|| true` of deck authoring — silent failure with no error message.

**When using a deck, always read its `[combo.<name>]` sections.** Combo prompts are the orchestration playbook — not optional metadata.

#### Deck-First Dispatch (Conditioned Reflex)

**Don't ask "should I use X or do it manually?" — just dispatch.** Pre-built decks at `examples/decks/INDEX.md`.

| User says | Dispatch |
|-----------|----------|
| 调研 / 研究 / 查一下 | `bun packages/lythoskill-arena/src/cli.ts single --deck examples/decks/deep-research.toml --brief "..."` |
| 扫一下 / 审计 / 找问题 | `bun packages/lythoskill-arena/src/cli.ts single --deck examples/decks/qa-sweep.toml --brief "..."` |
| 设计 / 架构 / 画图 | `bun packages/lythoskill-arena/src/cli.ts single --deck examples/decks/architecture-explainer.toml --brief "..."` |
| 写文档 / 科普 | `bun packages/lythoskill-arena/src/cli.ts single --deck examples/decks/documents.toml --brief "..."` |
| 治理 / task / epic | `bun packages/lythoskill-arena/src/cli.ts single --deck examples/decks/governance.toml --brief "..."` |
| 体验 / 测试 UX | `bun packages/lythoskill-arena/src/cli.ts single --deck examples/decks/scout.toml --brief "..."` |

Full deck docs: [lythoskill-deck SKILL.md](packages/lythoskill-deck/skill/SKILL.md).

### 7. Project Structure

```
lythoskill/
├── packages/                  # All logic (npm publishable)
│   ├── lythoskill-deck/       # src/ (CLI code) + skill/ (SKILL.md source) — npm package
│   ├── lythoskill-arena/      # same: src/ + skill/ — npm package
│   ├── lythoskill-cold-pool/  # src/ + skill/ — npm package
│   ├── lythoskill-creator/    # src/ + skill/ — npm package
│   ├── lythoskill-curator/    # src/ + skill/ — npm package
│   ├── lythoskill-project-cortex/  # src/ + skill/ — npm package
│   ├── lythoskill-project-scribe/  # skill/ only — pure skill, no npm package
│   ├── lythoskill-project-scribe-weekly/  # skill/ only — pure skill
│   ├── lythoskill-dreaming/   # skill/ only — pure skill
│   ├── lythoskill-coach/      # skill/ only — pure skill
│   └── ...                    # Agent adapters, test utils (see root package.json workspaces)
├── skills/                    # Built output (committed! — so consumers can clone-and-use)
├── .claude/skills/            # Agent working set
├── cortex/                    # Governance (ADR, epic, task, wiki)
├── daily/                     # Session journals (cross-CLI)
├── weekly/                    # Pattern extraction
└── examples/decks/            # 18 pre-built deck configs
```

### 8. Release & Auth (Compaction-Safe)

**Do not modify auth state.** `.git/config` uses SSH alias `calt13.github.com` (a host alias in `~/.ssh/config` for key selection convenience — do not change). `~/.ssh/` is off-limits. `.github-token` is for `gh` CLI only. `.npm-access` is for `publish.sh` only.

**Lock-step versioning**: all packages + root share one version. Bump via `bunx @lythos/skill-creator@0.16.0 bump`, never by hand. Bump pipeline: write root → align all packages → build skills (part of bump command). Then: `bun install` → commit → push → `./scripts/publish.sh`.

**New package must be added to `scripts/publish.sh`** PACKAGES array before first release. Skill-only packages (no `package.json`) are exempt.

**SKILL.md source files are templates**: `packages/*/skill/SKILL.md` contains `{{PACKAGE_VERSION}}` placeholders. Never replace with literal values — that breaks future renders. Full contract: [release-auth-workflow.md](packages/lythoskill-creator/skill/references/release-auth-workflow.md).

### 9. Project Skills

These are our own skills. Each has a SKILL.md that agents load.

| Skill | Purpose | When to invoke |
|-------|---------|----------------|
| `lythoskill-deck` | Deck governance (link/add/remove/refresh/validate) | User says "switch deck", "add skill", "clean up skills" |
| `lythoskill-arena` | Skill test-play (single/vs, deck-first dispatch) | User says "test this skill", "compare A vs B", "audit this package" |
| `lythoskill-curator` | Cold-pool skill indexer (scan/query/tag/audit) | User says "find a skill for X", "what skills do I have" |
| `lythoskill-project-cortex` | ADR/Epic/Task governance + ZK Review | User says "create task", "register finding", "ZK review this" |
| `lythoskill-project-scribe` | Session handoff (daily context dump) | Session ending, record pitfall, "log this" |
| `lythoskill-project-scribe-weekly` | Weekly pattern extraction | End of week, "weekly review", "what happened this week" |
| `lythoskill-project-onboarding` | Session context loader | Start of session, "what happened last time" |
| `lythoskill-dreaming` | Memory consolidation → SSOT | "Consolidate docs", "SSOT sweep", "memory consolidation" |
| `lythoskill-coach` | SKILL.md quality review | Reviewing a new skill, "optimize this skill" |

### 10. Pointer Index

> AGENTS.md is the TL;DR. These files have the full detail. Load on demand.
> **⚠️ Source paths**: these files live in `packages/*/skill/references/` (source) and are built to `skills/*/references/` (committed output). The paths below point to source — readable without running `deck link` first.**

| When you need to… | Read |
|-------------------|------|
| Full memory pipeline (3-axis model + SSOT diagram) | [ZK Review reference § SSOT](packages/lythoskill-project-cortex/skill/references/zk-review.md) |
| Write a ZK-reviewed task card (methodology + real cases) | [ZK Review reference](packages/lythoskill-project-cortex/skill/references/zk-review.md) |
| Intent/Plan/Execute deep dive (IO injection table, when/when-not) | [intent-plan-execute.md](packages/lythoskill-deck/skill/references/intent-plan-execute.md) |
| Thin Skill Pattern full detail (build pipeline, skill product ID) | [thin-skill-pattern.md](packages/lythoskill-creator/skill/references/thin-skill-pattern.md) |
| Why Bun over Node, ESM-only, monorepo conventions | `cortex/adr/02-accepted/ADR-20260503170000000-monorepo-toolchain-bun-only-and-root-package-json-conventions.md` |
| Why lock-step versioning (all packages share one version) | `cortex/adr/02-accepted/ADR-20260502233119561-bump-command-and-lockstep-versioning-policy.md` |
| Release & Auth full contract (publish order, bump internals) | [release-auth-workflow.md](packages/lythoskill-creator/skill/references/release-auth-workflow.md) |
| All CLI commands (dev + bunx forms for every package) | `skills/lythoskill-project-cortex/references/COMMANDS.md` (auto-generated) |
| Arena runtime (timeout mapping, CWD behavior, judge prompts, HATEOAS errors) | [arena-runtime.md](packages/lythoskill-arena/skill/references/arena-runtime.md) |
| Hot files + recurring work patterns (full security context) | [project-hotspots.md](cortex/wiki/04-ssot/project-hotspots.md) |
| Code conventions + naming rules (ESM-only, fence trick, file permissions, imports) | [conventions.md](cortex/wiki/04-ssot/conventions.md) |
| Agent-facing error design (HATEOAS, annotation mindset, phase+findings+suggestedFixes) | [annotation-mindset.md](cortex/wiki/01-patterns/2026-05-15-annotation-mindset-agent-facing-code-annotations-as-ioc-for-agent-behavior.md) |
| Agent adapter architecture (player abstraction, swappable backends) | [player-abstraction.md](cortex/wiki/01-patterns/2026-05-06-player-abstraction-agent-swappable-backend.md) |
| Dormancy tests (fallback hint validation on happy path) | [dormancy-tests.md](cortex/wiki/01-patterns/2026-05-09-dormancy-property-test-for-fallback-hints.md) |
| Cortex directory structure (adr/epic/task/wiki numeric prefixes) | [cortex/INDEX.md](cortex/INDEX.md) |
| BDD / reproduce.sh testing (Agent BDD format, runner usage) | [TESTING.md](./TESTING.md) |
| Session handoff template (full daily file format) | [daily-template.md](packages/lythoskill-project-scribe/skill/references/daily-template.md) |
| All 18 pre-built decks by use case | [examples/decks/INDEX.md](./examples/decks/INDEX.md) |
| Combo orchestration (`[combo.<name>]` in deck.toml — multi-skill pipeline playbook) | [lythoskill-deck SKILL.md](packages/lythoskill-deck/skill/SKILL.md) |
| Transient / fork skill types (`deck_skill_type` custom field) | [lythoskill-deck SKILL.md](packages/lythoskill-deck/skill/SKILL.md) |
| Graduate from reading docs to shipping | [graduation-exam-spec.md](cortex/wiki/01-patterns/2026-05-15-graduation-exam-spec.md) |
| DeepSeek TUI adapter (daemon lifecycle, smoke tests) | [agent-adapter README](packages/lythoskill-agent-adapter/README.md) |
