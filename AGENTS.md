# lythoskill — AGENTS.md

> Project guidance for agents that read `AGENTS.md` (Kimi, Codex, Copilot, Gemini CLI, etc.).
> If you are Claude Code, read [`CLAUDE.md`](./CLAUDE.md) instead — it points back here.
> Human contributors: see [README.md](./README.md).

> **⚠️ COMPACTION-SAFE — read this before any release, version, git remote, or npm command.** (Compaction = context window overflow — the agent loses conversation history. After compaction, re-read this section before touching auth, version, git, or npm.)
> Auth (`.git/config`, `~/.ssh/`, `.github-token`, `.npm-access`) is **pre-configured — do not modify**.
> Versions move via `bunx @lythos/skill-creator@0.17.6 bump`, never by hand-editing `package.json` or `jq`/`python`/`sed`.
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
4. **"I think / 我觉得" = start an ADR.** User is exploring options, not issuing a command. Write an ADR capturing trade-offs; do not jump to implementation.
5. **System silence is not permission.** If the platform prompts "the user has not said anything," stop, summarize state, ask for next step.
6. **Git provenance over design assumption.** `git log --oneline -5 <file>` beats guessing why code looks wrong. This repo's small-granularity commits make this a 5-second operation.
7. **See a bug, fix a bug — no "not my code."** Broken test, mismatched import, stale comment — fix it. Provenance is for learning, not for excusing.
8. **Plan must include research.** Search the codebase and git history before deriving from first principles — 1000+ commits mean most problems were solved before.
9. **Ask with purpose.** Facts are yours to look up (git, tests, probe, docs); genuine goal ambiguity → ask once, precisely, with your recommended answer. Choices covered by best practice or ≥90% confidence → decide, act, report. Never manufacture user-decisions for things that are yours to decide — every detail escalated to the user is their attention spent. (Interview tools like mattpocock's `grill-me` are user-invoked stress-tests, never a default posture.)

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

#### ZK Review Gate (Mandatory Pre-Assignment)

```
write task → self-review → ZK Review (WHAT/WHY/HOW) → process gaps
                                              ↓
                                    <2 new gaps & all low-priority?
                                              ↓ no
                                    spawn agent → back to ZK Review
```

Three rounds is a practical ceiling — entering round 3 means the task design itself is suspect; rewrite the card, never spawn a 4th round.

**How to run** (use your own subagent tool): **pass by reference, not by value** — give the subagent the **file path** to the task card + the **file path** to AGENTS.md, never pasted content (this keeps the control plane minimal; the card is the SSOT). Prompt template + gap-processing rules (fill / challenge / ignore) + real cases: [ZK Review reference](packages/lythoskill-project-cortex/skill/references/zk-review.md). When a ZK agent reports a gap that the referenced docs already answer, challenge it — "did you read the reference?" Agent failure is not doc failure.

**4 content types ZK Review most often exposes as missing** — check before spawning:

| Type | Question | Example fix |
|------|----------|------------|
| Prerequisite knowledge | Where is the code? | File path + line number |
| Interface contracts | What are the signatures? | Upstream/downstream declarations |
| Baseline data | What are the anchors? | Current value, target range |
| Scope declaration | Mandatory vs optional vs not-doing? | 必达/可选/不做 with explicit boundaries |

**Trial usage for output/UX tasks**: document review can't catch UX gaps. After implementation, a fresh ZK agent RUNS the tool and rates intuitiveness (<7/10 → new task card for UX fixes — never fold UX fixes into the original task). Template: [ZK Review reference](packages/lythoskill-project-cortex/skill/references/zk-review.md).

**Doc readability**: ZK subagent reads → self-reports → revise → re-validate. Important docs: cross-model via `arena single --player <kimi|codex|claude>`.

**ZK agents are sensors, not bosses.** Their output is signal for your judgment, not commands. Multi-angle (document reader / trial user / code reader) and cross-model divergence are information; you synthesize.

#### Side Decks (Pass-by-Reference Dispatch)

Any deck in `examples/decks/` can be handed to a subagent as a task-scoped skill set: pass the file path, subagent runs `deck link --deck <path>`, your main deck stays unchanged. Index: [examples/decks/INDEX.md](./examples/decks/INDEX.md).

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

**Always CLI, never `mv`** — CLI updates Status History; manual moves cause probe mismatches. **English-only slugs** — task/epic titles must be ASCII (portable paths).

#### Commit Trailers

```
Review: TASK-xxx       # → task review  (in-progress → review)
Closes: TASK-xxx        # → task done    (review → completed, strict)
Task: TASK-xxx review   # explicit verb form
ADR: ADR-xxx accept     # ADR: accept, reject, supersede
Epic: EPIC-xxx done     # Epic: done, suspend, resume
```

Post-commit hook auto-dispatches and creates a follow-up commit — an extra commit after yours is normal. `Closes:` requires the task to already be in review. Full syntax: [cortex SKILL.md](packages/lythoskill-project-cortex/skill/SKILL.md).

#### Task-Git Discipline

**Commit granularity = reviewer entry points**: one task → 2–5 commits (core change / tests / docs / review trailer), never one giant mixed commit. Every commit message includes `TASK-xxx` (`git log --grep` reconstructs the task). Acceptance criteria carry `→ Verify: <command>` with expected output — not "tests pass" but `bun test <path> — 14 pass, 0 fail`.

#### Skill Build & Deck Refresh Lifecycle

```
edit packages/<name>/skill/  →  bun packages/lythoskill-creator/src/cli.ts build [<name>]  →  skills/<name>/ updated
deck link  →  working set refreshed from cold pool  →  agent sees updated skill
```

`link` syncs working set from cold pool (local). `refresh` discovers upstream updates (plan-only); `refresh --exec` pulls them into the cold pool — then `link` again. Agent reads the working set, not your source edits: edit source without build + link = agent sees stale skill. Pre-commit auto-builds staged skill changes; **manual edits without commit need manual build + link**. `deck link` also warns when the cold pool is behind origin, dirty, or on the wrong branch (best-effort, never blocks boot); `refresh --exec` self-heals a dirty cache and fails loudly (non-zero exit + trailing ⚠️ summary).

**Release cycle**: `bunx @lythos/skill-creator@0.17.6 bump` → `bun install` → commit → `git push --follow-tags`. The `release` workflow (`.github/workflows/release.yml`) triggers on `v*` tags, runs tests, publishes all packages to npm via OIDC trusted publishing (with provenance), creates the GitHub Release, and deploys the docs site to Pages. During the transition, if a package lacks an npm Trusted Publisher, fall back to `./scripts/publish.sh` → `./scripts/publish-github-release.sh`. After release: `deck refresh --exec` → `deck link`.

#### Key Commands

| Need | Command |
|------|---------|
| **Load skills (do first)** | `bun packages/lythoskill-deck/src/cli.ts link` (shorthand: `deck link`) |
| Run tests | `bun --filter='*' run test` |
| Probe state | `bun packages/lythoskill-project-cortex/src/cli.ts probe` (shorthand: `cortex probe`) |
| Create task | `bun packages/lythoskill-project-cortex/src/cli.ts task "title"` (shorthand: `cortex task`) |
| ZK Review a task | Spawn ZK agent, WHAT/WHY/HOW on task card + AGENTS.md (pass paths) |
| Arena quick run | `bun packages/lythoskill-arena/src/cli.ts single --deck <path> --brief "prompt"` (shorthand: `arena single`) |
| Release | `bunx @lythos/skill-creator@0.17.6 bump` → `git push --follow-tags` → watch Actions (`gh run watch`) |

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

**Do not modify auth state.** `.git/config` uses SSH alias `calt13.github.com` (host alias in `~/.ssh/config` — do not change). `~/.ssh/` off-limits. `.github-token` is a legacy fallback for `gh` CLI; preferred storage is macOS Keychain (`security find-generic-password -s 'lythos-agent-pat' -w`) or Linux `secret-tool`. `.npm-access` is for the legacy `publish.sh` fallback only; the new Actions pipeline uses OIDC and stores no npm token.

**Lock-step versioning**: all packages + root share one version. Bump via `bunx @lythos/skill-creator@0.17.6 bump` (writes root → aligns packages → builds skills), never by hand. Then: `bun install` → commit → `git push --follow-tags`. The `release` workflow (`.github/workflows/release.yml`) handles npm publish, GitHub Release, and Pages deploy.

**New package → add to `scripts/publish.sh`** PACKAGES array before first release (skill-only packages exempt). The workflow extracts the same list, so `publish.sh` remains the SSOT.

**SKILL.md sources are templates**: `packages/*/skill/SKILL.md` uses `{{PACKAGE_VERSION}}` — never write literal versions (breaks future renders; build substitutes from root `package.json`). Full contract: [release-auth-workflow.md](packages/lythoskill-creator/skill/references/release-auth-workflow.md).

### 10. Project Skills

| Skill | Purpose | When to invoke |
|-------|---------|----------------|
| `lythoskill-deck` | Deck governance (link/add/remove/refresh/validate) | "switch deck", "add skill", "clean up skills" |
| `lythoskill-arena` | Skill test-play (single/vs, deck-first dispatch) | "test this skill", "compare A vs B", "audit this package" |
| `lythoskill-curator` | Cold-pool skill indexer (scan/query/tag/audit) | "find a skill for X", "what skills do I have" |
| `lythoskill-project-cortex` | ADR/Epic/Task governance + ZK Review | "create task", "register finding", "ZK review this" |
| `lythoskill-project-scribe` | Session handoff (daily context dump) | Record progress (mid-session or end), "log this" |
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
| Dormancy tests (fallback hint validation on happy path) | [dormancy-tests.md](cortex/wiki/01-patterns/2026-05-09-dormancy-property-test-for-fallback-hints.md) |
| Cortex directory structure (numeric prefixes) | [cortex/INDEX.md](cortex/INDEX.md) |
| BDD / reproduce.sh testing | [TESTING.md](./TESTING.md) |
| Session handoff template | [daily-template.md](packages/lythoskill-project-scribe/skill/references/daily-template.md) |
| All pre-built decks by use case | [examples/decks/INDEX.md](./examples/decks/INDEX.md) |
| Combo orchestration / transient & fork skill types | [lythoskill-deck SKILL.md](packages/lythoskill-deck/skill/SKILL.md) |
| DeepSeek TUI adapter (daemon lifecycle, smoke tests) | [agent-adapter README](packages/lythoskill-agent-adapter/README.md) |
