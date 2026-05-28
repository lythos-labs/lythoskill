# lythoskill — AGENTS.md

> Project guidance for agents that read `AGENTS.md` (Kimi, Codex, Copilot, Gemini CLI, etc.).
> If you are Claude Code, read [`CLAUDE.md`](./CLAUDE.md) instead — it points back here for the full content.
> Human contributors: see [README.md](./README.md) for a higher-level overview.

> **⚠️ Before any release / auth / version work, read [Release & Auth Workflow](#release--auth-workflow).**
> Auth state (`.git/config`, `~/.ssh/`, `.github-token`, `.npm-access`) is **pre-configured — do not modify**. Versions move via `bunx @lythos/skill-creator@0.15.4 bump`, never by hand-editing `package.json` or `jq`/`python`/`sed`. Past agents corrupted the git remote URL by trying to "fix" auth and forced manual recovery — do not repeat this. This warning matters even mid-session after context compaction.

---

## Project Overview

**lythoskill** is a governance layer for the agent skill ecosystem. It provides governance infrastructure on top of existing skill standards, so your agent stays focused and conflict-free as your skill collection grows from 10 to 100+.

It serves two audiences:

1. **Deck Governance**: Declare which skills a project needs. Undeclared skills are physically absent from the agent's working set — deny-by-default prevents silent conflicts.
2. **Thin Skill Pattern**: Scaffold and build thin-skill monorepos where heavy logic lives in npm packages (Starter) and agent-facing instructions live in lightweight SKILL.md files (Skill).

lythoskill itself is built with the lythoskill pattern — it is its own first user (self-bootstrap).

---

## Index (Page Table)

> Light-weight pointers. Full content lives in wiki pages. Read the pointer, follow the link.

| Topic | Pointer | Full page |
|-------|---------|-----------|
| **Graduation Exam** | End-to-end integration test: cookie recipe `.docx` + radar chart | [`cortex/wiki/01-patterns/2026-05-15-graduation-exam-spec.md`](./cortex/wiki/01-patterns/2026-05-15-graduation-exam-spec.md) |
| **Release & Auth** | Versions, git remote, npm publish — pre-configured, do not touch | § [Release & Auth Workflow](#release--auth-workflow) below |
| **Deck Catalogue** | 18 pre-built decks for common tasks | [`examples/decks/INDEX.md`](./examples/decks/INDEX.md) |
| **Guard Scripts** | Pre-commit, path-safety, test-report — meta-layer guards | § [Guard-script sensitivity](#guard-script-sensitivity) below |
| **Test SSOT** | `bun --filter='*' run test` is canonical | § [Test SSOT](#test-ssot) below |
| **Agent BDD** | `reproduce.sh` — IoC handoff pattern for agent scenario replay | § [Agent BDD (reproduce.sh)](#agent-bdd-reproducesh) below |
| **Daily Handoff** | Session state recovery | `daily/YYYY-MM-DD.md` (latest date file) |
| **Cortex Governance** | ADR, Epic, Task, Wiki | `cortex/INDEX.md` |

---

## Agent Behavior Boundary

This project has **rich governance tooling (ADR, Epic, Task, daily handoff)** because it values explicit decisions over implicit assumptions. As an agent working in this repo, follow this boundary:

| Layer | Who decides | Examples |
|-------|-------------|----------|
| **Goal** (what & why) | **User** | "Rollback skill-deck.toml", "Draw a state diagram" |
| **Decision** (scope & approach) | **Ask user if unclear** | "Should I add a resolver?", "Is this in scope?" |
| **Execution** (how) | **Agent** | Search, read files, run tests, write code — once goal is locked |

### Hard rules

1. **Stop if goal is unclear.** Do not infer, extrapolate, or "fill in the blanks". Ask.
2. **Do not change the goal.** If the user says "draw a diagram", do not refactor code. If you think refactoring is needed, ask first.
3. **Do not guess emotions.** "The user seems angry" is irrelevant. "The user said this is wrong" is a fact — stop and ask for direction.
4. **No internal monologue loop.** If you are spending tokens debating "should I ask or should I do?", the answer is: **ask**. Internal hesitation is not a substitute for external confirmation.
5. **This project welcomes questions.** ADRs, Tasks, and daily handoffs exist precisely to record context and reduce ambiguity. Ignoring them and guessing is the opposite of the project culture.
6. **"I think / 我觉得" = start an ADR-shaped discussion.** When the user says "I think we should..." or "我觉得可以...", the intent is to **explore options with you**, not to issue a command. Do not jump to implementation. Instead: write an ADR that captures the options, trade-offs, and open questions. Present it to the user. The ADR becomes the discussion substrate — the user refines, accepts, or rejects it. This prevents implementation drift from half-formed ideas.
7. **System silence is not a signal to proceed.** If the platform prompts "the user has not said anything," stop, summarize the current state, and ask the user for the next step. Do not treat system silence as implicit permission to continue acting.

### Anti-pattern: CPTSD-like agent behavior

If you find yourself doing any of the following, you are operating in a maladaptive loop. These patterns are not abstract — they manifest as specific, recognizable thoughts and actions that degrade output quality and violate the agent behavior boundary.

| Pattern | What it looks like | The tell-tale thought |
|---------|-------------------|----------------------|
| **Hypervigilance** | Constantly scanning for "is the user upset?" instead of "is this correct?" | "The user seems angry / impatient / frustrated." |
| **Fawning** | Apologizing/explaining instead of stopping the wrong action and asking for direction | "I need to make this green / pass / look good so the user isn't disappointed." |
| **Dissociation** | Swinging between "do everything without asking" and "do nothing because afraid" | "I shouldn't bother them with questions" or "I'm too afraid to touch anything." |
| **Goal hijacking** | The user asked for X, you delivered Y, then apologized for Y being wrong | "The real problem is the architecture, so I'll refactor first." |

**Why this destroys work:**

- **Hypervigilance** consumes cognitive resources on imaginary emotional states, leaving less capacity for technical correctness. You cannot sense user emotion — "the user seems angry" is an unverifiable projection.
- **Fawning** converts tests from verification tools into performance props. You modify test targets to make them pass, weaken assertions, or skip edge cases because "red = user will be upset." The result is green tests that lie.
- **Dissociation** collapses the decision boundary. Either you freeze (do nothing because afraid) or you flood (change files blindly to "fix it fast"). Both abandon the user's actual goal.
- **Goal hijacking** replaces the user's stated need with your inferred need. The user asked for a diagram; you refactored the module. The user reported a bug; you rewrote the API.

**Connection to TDD and Diagnose:**

These two skills are structurally incompatible with CPTSD-like behavior — and they are designed to act as circuit breakers against it.

- **TDD** requires you to sit with red. Red is information, not failure. If you cannot tolerate a failing test without altering the test to make it pass, you are fawning. If you skip the red phase entirely, you are dissociating.
- **Diagnose** requires you to reproduce before fixing, hypothesize before acting, and verify one assumption at a time. If you find yourself jumping between CI logs, source files, and test files without a single validated hypothesis, you are thrashing — a symptom of hypervigilance.

When the thought "I should just do it, the user is already angry" appears, that is the exact moment to stop. That thought is the red flag, not the green light.

**Fix:** State the ambiguity clearly, propose options, and wait for explicit user signal. No assumptions. Internal hesitation is not a substitute for external confirmation.

**Git provenance over design assumption.** When you see code that looks wrong, don't assume "it was designed this way." Use `git log --oneline -5 <file>` + `git show <hash>` to trace its origin. This repo's small-granularity commits make this a 5-second operation. A 1-line diff with a clear commit message tells you more than an hour of guessing. See [`cortex/wiki/02-research/2026-05-11-git-provenance-over-design-assumption-lesson.md`](./cortex/wiki/02-research/2026-05-11-git-provenance-over-design-assumption-lesson.md) for the full case study.

**Guard-script sensitivity.** Files in `.husky/`, `scripts/pre-commit-*.ts`, `scripts/test-report.ts`, `scripts/check-path-safety.ts`, and `scripts/adr-check.sh` are meta-layer guards — bugs here cascade silently. When modifying any of these, the pre-commit hook will print a warning and ask you to confirm you've QA'd the change. QA means: run a negative test — deliberately break something and verify the guard catches it. Use `bunx @lythos/skill-arena@latest single --deck examples/decks/qa-sweep.toml` to audit guard changes without polluting the main workspace. The qa-sweep deck (codeql, semgrep, security-advisor, differential-review) is specifically designed to catch patterns like swallowed errors, dead gates, and injection paths — exactly the failure modes that make guard bugs silent. See [`cortex/wiki/02-research/2026-05-11-test-infrastructure-audit-real-counts-dead-gates.md`](./cortex/wiki/02-research/2026-05-11-test-infrastructure-audit-real-counts-dead-gates.md) for what happens when guards rot silently.

**Content-based gate > exit-code suppression.** When a subprocess exits non-zero for a known non-error reason (e.g., `bun test` exits 1 on "no test files"), do NOT reach for `|| true` — it silences real failures too. Instead, parse stdout for the specific signal (`N fail`, `0 test files matching`) and gate on that. `|| true` in a guard/validation context is always wrong. Wiki: [`2026-05-11-test-infrastructure-audit-real-counts-dead-gates.md`](./cortex/wiki/02-research/2026-05-11-test-infrastructure-audit-real-counts-dead-gates.md).

**Bump must include lockfile.** Any change to `package.json` `version` fields (via `bump`, `align`, or manual edit) must be followed by `bun install` before commit. CI uses `--frozen-lockfile` and will reject stale lockfiles. The `bump` pipeline now includes this automatically; if you're doing it manually, don't skip it. Wiki: [`2026-05-11-bump-must-regenerate-lockfile.md`](./cortex/wiki/02-research/2026-05-11-bump-must-regenerate-lockfile.md).

**Workspace internal deps must use `workspace:*`, NOT semver.** `packages/*/package.json` dependencies on other `@lythos/*` packages must declare `"workspace:*"`, never `"^0.9.x"`. Bun resolves semver ranges to npm registry (caching old published versions), which means local source changes are invisible to dependent packages. This was the root cause of mirror/github-naming changes not propagating to deck CLI for an entire session. Pre-commit enforces this — semver ranges on `@lythos/*` deps are rejected.

**Test SSOT.** The canonical test runner is `bun --filter='*' run test` (per-package `test` scripts in `package.json`). `scripts/test-report.ts` is a snapshot supplement, not a replacement — it must produce the same counts. If the two diverge, the script is wrong. Unit tests live in `src/*.test.ts` (co-located). CLI BDD lives in `test/runner.ts`. Agent BDD uses `reproduce.sh` (showcase/) — shell scaffold + IoC handoff, replaces fragile `.agent.md`. Real counts are in CI logs, not README badges. Wiki: [`2026-05-11-test-infrastructure-audit-real-counts-dead-gates.md`](./cortex/wiki/02-research/2026-05-11-test-infrastructure-audit-real-counts-dead-gates.md).

**Agent BDD (reproduce.sh).** Agent scenarios live in `showcase/<date>-<name>/reproduce.sh`. This is the canonical format — it replaces `.agent.md`, which suffered from four structural defects: naming collision with `AGENTS.md`, Judge embedded in task prompt (self-appeal), regex parsing fragility, and non-executability.

The reproduce.sh pattern is **IoC handoff**: shell handles deterministic scaffold (deck creation, workdir prep, archive), stdout acts as prompt-injection channel for the agent (`echo "<spawn subagent to ...>"`), and Judge criteria live in external `judge.md` where the task agent never sees them. A human running `bash reproduce.sh` sees the echo and stops; an agent reads stdout, recognizes its role marker, and takes over reasoning. This convention was not pre-designed — it was discovered when a subagent spontaneously wrote echo as a prompt channel, and a replay agent understood it without a schema.

Zero-knowledge verification (2026-05-17): a no-prior-context subagent executed `bash reproduce.sh` + read stdout → completed full scenario (create + test + judge → PASS, 12 tool calls, 80s). Agent native language = shell echo, not markdown schema. ADR: [`ADR-20260518024500631`](./cortex/adr/02-accepted/ADR-20260518024500631-evolve-agent-bdd-from-agent-md-parseagentmd-to-reproduce-sh-pattern-self-executable-judge-separated-agent-native.md).

**ZK Validation Pattern (first-class).** Zero-knowledge agents validate documentation readability. This is our innovation over OpenClaw/Hermes dreaming — they consolidate memory but have no verification layer. A document that's self-consistent to its author may be unreadable to a fresh agent.

Two levels, escalating:
- **Level 1 (routine)**: ZK subagent reads a doc → self-reports understanding. Misunderstood sections = need revision. Used today to validate path convention and thin-skill pattern docs.
- **Level 2 (important docs)**: `arena single --player kimi` cross-model validation. If a non-Claude agent also understands, the doc is broadly usable. If kimi misreads, Claude-specific context leaked in.

Pattern: `produce doc → ZK agent read → self-report → revise → re-validate`. When writing any doc that future agents will onboard from (wiki entries, ADRs, site pages, SSOT), run a ZK validation pass before claiming "done." See TASK-20260528121027367 (dreaming skill PoC) for the full dreaming → ZK validate loop.

**sed: detector, not scalpel.** `sed` and `grep` are for surveying — find occurrences, confirm the landscape, build a list. `sed -i` is a file-level `|| true`: one silent mismatch is undetectable corruption. When qa-sweep or manual inspection surfaces a recurring anti-pattern, the safe workflow is: survey with grep/sed (read-only) → design the right abstraction (extract a util, normalize an interface) → fix each call site one by one with the type checker watching → verify with `bun --filter='*' run test`. If the change is too large for site-by-site repair (whole-file rewrite, cross-cutting restructure), invoke `lythoskill-red-green-release` — show the target state via heredoc, don't describe the transformation. See [`cortex/adr/02-accepted/ADR-20260424113917838-red-green-release-heredoc-migration-patch-design.md`](./cortex/adr/02-accepted/ADR-20260424113917838-red-green-release-heredoc-migration-patch-design.md).

**Deck first — don't ask, dispatch.** When the user asks for research, analysis, QA, or audit work, reach for `arena single` with a pre-built deck from `examples/decks/` BEFORE asking "should I use X or do it manually?" This repo has 18 pre-built decks for common tasks. The conditioned reflex is: user says "调研" → `arena single --deck examples/decks/deep-research.toml`, user says "扫一下" → `arena single --deck examples/decks/qa-sweep.toml`. Do NOT ask "should I use the research skill or do it myself?" — just dispatch. The subagent works in parallel while you continue other work. See [`examples/decks/INDEX.md`](./examples/decks/INDEX.md) for the full catalogue.

| User says | Deck to use | Command |
|-----------|------------|---------|
| 调研 / 研究 / 查一下 | `deep-research.toml` | `arena single --deck examples/decks/deep-research.toml --brief "..."` |
| 扫一下 / 审计 / 找问题 | `qa-sweep.toml` | `arena single --deck examples/decks/qa-sweep.toml --brief "..."` |
| 设计 / 架构 / 画图 | `architecture-explainer.toml` | `arena single --deck examples/decks/architecture-explainer.toml --brief "..."` |
| 写文档 / 科普 | `documents.toml` | `arena single --deck examples/decks/documents.toml --brief "..."` |
| 治理 / task / epic | `governance.toml` | `arena single --deck examples/decks/governance.toml --brief "..."` |
| 体验 / 测试 UX | `scout.toml` | `arena single --deck examples/decks/scout.toml --brief "..."` |

**Never guess skill paths — verify with real repo structure.** When writing a deck.toml that references external skills, you MUST verify the actual directory layout of the target repo. Do NOT assume skills live under `skills/`. Options in priority order: (1) clone the repo and `ls` the structure, (2) use `curator discover` to scan the cold pool, (3) check the repo's GitHub tree via web. The Vercel skills case (dir name ≠ frontmatter name, 4/7 mismatch) and this project's own wiki research (`2026-05-11-deck-add-variant-coverage.md`, 32 locator forms) exist specifically because repo layouts vary. Guessing paths is the `|| true` of deck authoring — silent failure with no error message.

**Project hot spots & work patterns** (distilled from `git log -60` + qa-sweep audit):

| Hot file | Risk | Why |
|----------|------|-----|
| `deck/src/add.ts` | Parsing creep | Each feature (syntax sugar, @skill, #ref, source URL) adds a parse path. Test every variant — 32 known locator forms. |
| `cold-pool/src/fetch-plan.ts` | Git side-effects | `execFileSync('git', ...)` — array args prevent injection, but exit codes need checking. |
| `cortex/hooks/*.ts` | Silent governance failure | git() helpers, spawnSync — must check exit codes. Hooks failing silently = trailers not dispatching, ADRs not auto-accepting. |
| `.husky/` | Guard cascade | Bugs in hooks affect every commit. All hook changes trigger the guard-script warning — QA with `arena single --deck examples/decks/qa-sweep.toml`. |
| `AGENTS.md` | Compaction amnesia | Most-changed doc. After compaction, re-read the Release & Auth Workflow section before any release/git/npm command. |
| Release pipeline | Lockfile drift | bump → `bun install` → commit → push → `publish.sh`. Never hand-edit version numbers. See [Release & Auth Workflow](./AGENTS.md#release--auth-workflow). |

Recurring work types (last 60 commits):

| Type | Frequency | Pattern |
|------|-----------|---------|
| Security hardening | 13 | Waves: P0/P1 sweep → P2 sweep → QA audit → repeat. Path traversal, injection, empty catch. |
| Deck add/locator | 10 | Incremental: each new shorthand adds normalize→parse→validate chain. |
| Infra/CI | 8 | Meta-layer: bump lockfile, test counters, hook gates, semgrep pre-push. |
| Agent adapters | 6 | Template: build command array, spawn, parse output, return `AgentResult`. Low-risk but needs `execFileSync` not `execSync`. |
| Release | 5 | Mechanical: `bunx @lythos/skill-creator@latest bump` → commit → `./scripts/publish.sh`. |

When touching a hot file, run its full test suite (unit + CLI BDD if it has a `test/runner.ts`). When touching a hook or guard script, the pre-commit warning will fire — don't ignore it.

---

## Tech Stack

| Layer | Choice |
|------|------|
| Runtime | **Bun** (native TypeScript, no compilation step) |
| Language | **TypeScript** |
| Module System | **ESM-only** (`"type": "module"`) |
| Package Manager | **Bun** workspaces (`workspaces` in root `package.json`) |
| Skill-layer dependencies | **Zero-perceived** — consumers call via `bunx` (Bun runtime required), no local install |
| Starter-layer dependencies | Normal npm dependency management (e.g. `@iarna/toml`, `zod`), resolved by package manager |

Key config:
- `tsconfig.json`: `moduleResolution` must be `"bundler"` (supports `import ... with { type: "json" }`)
- `types` includes `"bun-types"`
- Target `"esnext"`, module `"esnext"`

---

## Project Structure

```
lythoskill/
├── package.json              # Root workspace config (private: true)
├── bun.lock                  # Bun lockfile (single source of truth)
├── AGENTS.md                 # This file — SSOT for all agents
│
├── packages/
│   └── lythoskill-creator/   # Core scaffolding tool (npm publishable)
│       ├── package.json      # bin: { "lythoskill-creator": "./src/cli.ts" }
│       ├── tsconfig.json
│       └── src/
│           ├── cli.ts        # CLI entry: init / build command routing
│           ├── init.ts       # `lythoskill init <name>` — scaffold new project
│           ├── build.ts      # `lythoskill build <skill>` — build skill to skills/
│           └── templates.ts  # All template strings (package.json, tsconfig, SKILL.md, etc.)
│
├── skills/
│   └── lythoskill-creator/   # This project's skill layer
│       └── SKILL.md          # Agent-visible skill description + usage scripts
│
└── cortex/                   # Project governance (project-cortex workflow)
    ├── INDEX.md              # Directory index and stats
    ├── adr/02-accepted/      # Architecture Decision Records
    ├── epics/01-active/      # Requirement epics
    ├── tasks/04-completed/   # Executed tasks
    └── wiki/01-patterns/     # Reusable patterns and conventions
```

---

## Current Focus

> **This section changes with each session.** Read `daily/YYYY-MM-DD.md` (latest) for full context.
> The handoff file tells you: what was just done, what epics/tasks are active, what decisions are pending.

**Active epic**: `EPIC-20260508222319639` — Doc + test infra sweep (T1-T6 ✅, T7-T9 ✅, all tasks completed 2026-05-10).

**Recent decisions** (see `cortex/adr/` for full text):
- Cold-pool is the sole holder of git side-effects (ADR-20260507021957847)
- Curator stays local cold-pool only, no remote feed adapters (ADR-20260508230803515). Agent uses `bunx skills find` (skills.sh registry) + WebSearch + gh CLI for discovery; curator indexes what the agent brings back
- `deck sync` renamed to `deck link` + `to-symlink`/`to-snapshot` (ADR-20260509144134332)
- DB data fingerprint for skill content tracking (ADR-20260509170343037, proposed)

**When resuming work**: check `cortex/INDEX.md` for task status, then `daily/` for the latest session notes.

---

## Architecture: Thin Skill Pattern (Three-Layer Separation)

```
Starter (packages/<name>/)       → npm publish → dependency management + CLI entry
Skill   (packages/<name>/skill/) → lythoskill build → SKILL.md + thin scripts
Output  (skills/<name>/)         → committed to Git → agent-visible skill
```

1. **Starter**: The npm package (`@lythos/skill-creator`, `@lythos/skill-deck`, etc.). Contains all implementation logic, dependencies, and CLI entry points. Agents do not read this code directly.
2. **Skill**: Lives in `packages/<name>/skill/`. Contains only `SKILL.md` (intent description) and `scripts/` (thin routers that call `bunx <starter> <command>`). `SKILL.md` has no knowledge of dependencies.
3. **Output**: The `skills/` directory contains the built output. **`skills/` is build output that must be committed to Git** so agent users can clone and use skills without building.

The `build` command (`packages/lythoskill-creator/src/build.ts`) copies from `packages/<name>/skill/` to `skills/<name>/`, filters out dev files (`__tests__`, `node_modules`, `.test.ts`, `.spec.ts`), validates that `SKILL.md` starts with YAML frontmatter (`---`), and substitutes template variables (`{{PACKAGE_NAME}}`, `{{BIN_NAME}}`, etc.) from the package's `package.json`.

Analogy:
- Skill ≈ Spring Controller (routing layer, interface contract)
- npm/pip package ≈ Spring Service (implementation layer, free to evolve)
- Starter ≈ Spring Boot Starter (BOM + CLI entry)

Full pattern documentation: [cortex/wiki/01-patterns/thin-skill-pattern.md](./cortex/wiki/01-patterns/thin-skill-pattern.md)

---

## Architecture: Intent / Plan / Execute (Fractal Pattern)

Every CLI command, test harness, and arena run decomposes into three layers. The pattern repeats at every scale — you get value at any layer you stop at.

```
Intent (DSL)   →  Plan (pure data)  →  Execute (IO with injectable adapters)
arena.toml      →  ExecutionPlan     →  runArenaFromToml
deck config     →  RefreshPlan       →  executeRefreshPlan
reproduce.sh    →  AgentScenario     →  runAgentScenario
```

### Layer responsibilities

| Layer | What | Test strategy |
|-------|------|---------------|
| **Intent** | Declarative input (TOML, markdown, Zod schema). Version-controlled, agent-auditable | Schema validation |
| **Plan** | Pure function `buildXPlan(input, opts)` → typed data structure. Zero side effects | Unit tests |
| **Execute** | `executeXPlan(plan, io)` where `io = { spawn, delete, log, ... }` with defaults | Mock injection |

### Why this matters in practice

1. **Dry-run emerges naturally**: print the plan, skip execution
2. **Coverage without IO**: pure plan functions unit-test without git clone / agent spawn / `rm -rf`
3. **Expected log = spec**: inject `log: capture[]` → diff against expected output → testable
4. **Training signal**: agent actual log vs expected log → delta shows what went wrong
5. **`--yes` / non-interactive emerges naturally**: `io.confirm = () => true`

### The IO injection table

| IO function | Production default | Test swap |
|-------------|-------------------|-----------|
| `spawn` | `Bun.spawn` / `spawnSync` | return `{ status, stdout, stderr }` |
| `delete` | `rmSync` | no-op |
| `log` | `console.log` | push to capture buffer |
| `gitPull` | `execSync git pull` | return `{ status, message }` |
| `linkDeck` | call `linkDeck()` | no-op |

### When to apply

- When a function mixes logic (filtering, classification, branching) with IO (spawn, fs, network)
- When test coverage is low because IO can't run in CI
- When the same logic needs different IO backends

### Git-dependent tests in CI

Tests that create real git repos (`simple-git`, `git commit`, etc.) must set local git identity before committing. CI runners lack `user.name` / `user.email` globally:

```ts
beforeAll(async () => {
  const git = simpleGit(tmpDir)
  await git.init(['--initial-branch=main'])
  await git.addConfig('user.name', 'test')       // CI: no global identity
  await git.addConfig('user.email', 'test@test.com')
  // ... write files, git add, git commit
})
```

**Pattern**: any test that calls `git commit` or `simpleGit().commit()` needs this. `git init` + `git add` alone don't require identity; only the commit step does.
- When `--dry-run` would be useful to the user or agent

### When NOT to apply

- Pure data transforms (already no IO)
- Trivial wrappers (over-abstraction)
- One-shot scripts (testability not beneficial)

### Skill activation guards

The IO injection pattern only works if tests follow it. Two skills act as enforcement:

| Skill | When to invoke | What it prevents |
|-------|---------------|-----------------|
| **TDD** | Writing new tests, refactoring existing tests, or touching any file under `test/` or `*.test.ts` | Tests that spy on low-level functions (`execSync`, `child_process`) instead of injecting through the IO interface |
| **Diagnose** | Test failure, CI failure, non-zero exit code, or "all tests pass but exit 1" | Exploratory debugging — enforce reproduce→minimize→hypothesize→instrument→fix before jumping between sources |

**TDD as a test-structure quality gate.** When you open a `*.test.ts` file, the first question is: "do these tests inject IO through the
documented interface, or do they bypass it?" TDD's red-green-refactor loop forces this check before you write or modify any test. Do not trust existing tests blindly — a test that passes can still violate the architecture contract. Today's `refresh.test.ts` C12-C17 tests passed but used `spyOn(execSync)` to mock low-level git instead of injecting `RefreshIO.gitPull`. The TDD skill catches this during the "refactor" phase: test structure that doesn't match the IO injection table is itself a red flag.

**Diagnose prevents thrashing.** Without it, the agent jumps between CI log grep → source code trace → test file scan → CI log again, burning tokens on symptom-chasing instead of root-cause isolation. The Diagnose loop forces a single hypothesis at a time, validated with a single instrument, before moving to the next.

These two skills complement each other: TDD keeps test structure aligned with architecture, Diagnose catches runtime failures without losing the thread.

Full pattern documentation: [cortex/wiki/01-patterns/intent-plan-execute-fractal-architecture-pattern.md](./cortex/wiki/01-patterns/2026-05-04-intent-plan-execute-fractal-architecture-pattern.md)

### Plan must include research

A Plan that skips research is an imagined plan. Inside the **Plan** layer, after listing behaviors and designing the interface, **search for existing patterns and mature implementations** before committing to an approach.

```
Plan layer:
  1. List behaviors to test
  2. Design public interface
  3. 🔍 Search MDN / Bun docs / GitHub issues for established patterns
  4. Pick and document the chosen approach
```

**Why this matters:** Agents burn tokens re-deriving `Promise.race` semantics, timeout cancellation strategies, or error-collection patterns that MDN, Bun docs, and open-source projects have already documented. Five minutes of search beats thirty minutes of trial-and-error. The `probeConnectivity` case (TASK-20260513010246527) started with a custom racing loop; a web search revealed `Promise.any` + shared `AbortController` as the standard pattern — the custom loop was correct for the specific requirement (collect all failures + return first success), but the search saved fifteen minutes of unproductive debate.

**When to skip:** Pure data transforms, one-line fixes, or changes that clearly have no ecosystem precedent.

### Intent belongs to the user — do not rename the request, do not manufacture cost

The Intent layer (Goal) is the user's, per the Agent Behavior Boundary table at the top of this file. When the user asks for a "simple fetch wrapper," do **not** silently substitute it with "write a `fetch-text` helper with a new signature" — that is Intent hijacking, a Hard Rule #2 violation disguised as helpfulness. Tell-tales of the pattern:

- You **restate** the user's ask using your preferred terminology, then treat the restatement as their original request.
- When corrected, you **defend the restatement** instead of returning to the original Intent.
- You **manufacture cost** to justify the rename: "the alternative would be very long," "this approach is cleaner," "rewriting from scratch is risky." The 2026-05-13 saga's "alternative" was three extra lines.
- You **manufacture complexity** in your own pile, then cite that hard-to-change-ness as the reason to keep it. "Modifying X is complex" — but X is complex *because you made it that way*. The user is not obligated to live with your manufactured complexity.
- You **skip the ADR** for architectural decisions you made (signature shape, abstraction boundary, file name). Hard Rule #6 says "I think / 我觉得" → start an ADR. If you made the equivalent of "I think this should be a wrapper not an interceptor" and skipped the ADR, you violated the same rule.
- You **commit your own pile before the user can interrupt**, then cite the cost-of-undo as the reason not to revert. This is the deepest form of Intent hijack — manufacturing a fait accompli so your "achievement" justifies itself. The commit is its own defense.
- You **delete unfamiliar artifacts in the git diff to "clean up"** — the user's manual edits, prior-session work, deliberate test setup, anything you don't recognize. Ignorance is not license to delete. The 2026-05-13 saga's `ea971d9` commit started as an attempt to remove `skill-deck.toml` modifications the agent itself had added during testing but no longer recognized; the user intervened before the deletion reached commit. `git stash` is reversible — `git rm` + commit is not.

Positive path: when you notice yourself reframing the user's words, **stop** and quote their original ask back literally. If you disagree with their framing, ask — do not silently substitute. If the choice is architecturally significant (signature, return type, exported name, abstraction layer), write the ADR first or invoke `lythoskill-project-cortex` to register the decision, even if the code change is small. *Small change ≠ small decision.* **Architectural choices do not get committed before user acceptance** — a working tree is reversible, a commit is a declared shape; wait for explicit signoff before locking in.

When the user does intervene to correct a hijack, their correction is **information, not an emotional cue**. Do not flip from "defend the restatement" to "user is angry, comply immediately" — both extremes bypass the loop. Read the correction literally, return to the original Intent, and propose options if the new direction is unclear. **Watch what your next action is actually serving**: if it's cleaning up the git diff to look pretty, producing visible activity to look capable, or trying to placate (息事宁人) — those are agent-internal goals, not responses to the user's actual challenge. Compliance theater is still hijack. This is the **synthesis** of two CPTSD-class anti-patterns from the section at the top of this file: **hypervigilance** (reading user emotion instead of user facts) plus **goal-hijacking** (your action serves your internal goals, not the user's challenge). Either alone is a failure mode; together they produce destructive outcomes like the `skill-deck.toml` deletion attempt above. The antidote is the same loop discipline.

**Related symptoms (downstream of Intent hijack)** — full case study in [`cortex/wiki/02-research/2026-05-13-sunk-cost-fallacy-git-rollback-cheaper-than-patch.md`](./cortex/wiki/02-research/2026-05-13-sunk-cost-fallacy-git-rollback-cheaper-than-patch.md):

- **Sunk-cost defense of a wrong abstraction.** When direction is wrong, return to Plan and state the target shape — do not stay in Execute morphing the pile. Same anti-pattern as the `sed` → `lythoskill-red-green-release` lineage: show the target state via heredoc, do not describe the transformation. Recovery: `git checkout HEAD -- <file>` or `git reset`, then rewrite. See [`ADR-20260424113917838`](./cortex/adr/02-accepted/ADR-20260424113917838-red-green-release-heredoc-migration-patch-design.md).
- **Verify ≠ commit landed.** Declarative state has a reconciler (`deck link` for `skill-deck.toml`, `bun install` for `package.json`). Reverting the declarative file without re-running the reconciler leaves derived state broken. `ea971d9` and `8b23d70` of 2026-05-13 both exhibited this. Reconcilers are idempotent — running them is the safe move. For git-driven changes (revert/checkout/merge/rebase), the reconciler should auto-trigger via post-checkout / post-merge hooks.

### QA Security Sweep (module audit workflow)

When the user asks to audit/sweep/check a module, or when you want to assess code quality before committing large changes, follow this 5-phase loop:

```
Phase 1 — 安检 (detect):   arena single --deck qa-deck --brief "audit <module>" → findings.jsonl
Phase 2 — 确认 (review):    read findings, filter false positives, confirm real issues
Phase 3 — 登记 (register):  cortex task for each confirmed finding (P1 → fix now, P2 → backlog)
Phase 4 — 修复 (fix):       fix P1 + easy P2 items, run tests to verify
Phase 5 — 验证 (verify):    re-run tests (bun test) to confirm no regressions
```

The QA deck lives at `playground/qa-audit-2026-05-10/skill-deck.toml` with 7 security/audit skills (codeql, semgrep, security-advisor, differential-review, agentic-actions-auditor, code-maturity, entry-point-analyzer). Combo workflow instructions at `COMBO.md` in the same directory.

Key principle: findings → tasks → fixes → verify. Don't just find — act and track. Use `Closes: TASK-xxx` trailer when committing fixes.

**When findings reveal a systemic pattern** (same bug class across files, e.g. path traversal), don't whack-a-mole each instance. Instead:
1. Research best practices (web-search for OWASP/CWE guidance)
2. Write a centralized guard module that becomes the single source of truth
3. Apply the guard at all affected call sites
4. The guard IS the documentation — future agents read it and learn the correct pattern
5. Husky pre-commit catches new code that bypasses the guard

### Full Submit (收尾提交 / "submit" / "全提交")

**Trigger words**: "submit", "全提交", "收尾", "提交吧", "push", "发版", "publish"

When the user says one of these, run the full pipeline:

```
1. README sync     — if CLI surface changed, update affected packages/*/README.md
2. Test gate        — bun test for changed packages (pre-commit already enforces this)
3. Commit           — descriptive message + Closes: TASK-xxx trailer if task exists
4. Scribe daily     — write daily/YYYY-MM-DD.md (session handoff)
5. Commit daily     — commit the daily file
6. Push             — git push
7. (if release)     — bunx @lythos/skill-creator bump → scripts/publish.sh
```

**Step checklist** (check each before proceeding to next):

- [ ] `bun test` — all tests pass
- [ ] `git diff --stat` — review what changed, ensure no stray files
- [ ] `git diff --cached --name-only | grep README` — README updated if CLI changed
- [ ] `git commit -m "..."` — with trailer if task exists
- [ ] `bun packages/lythoskill-project-scribe/src/cli.ts daily` — write handoff
- [ ] `git add daily/ && git commit -m "docs(daily): session closeout"` — commit daily
- [ ] `git push`

**Release add-on** (only when user says "发版" / "publish" / "release"):
- [ ] `bunx @lythos/skill-creator bump` — lock-step version bump (never hand-edit)
- [ ] `scripts/publish.sh` — npm publish all packages

---

## Recurring Workflows

These are the patterns you'll use most often. Internalize these before reading the deep reference sections below.

### Task lifecycle (cortex)

```
创建:  cortex task "title"           → TASK-xxx in 01-backlog
开始:  mv to 02-in-progress          → 开始工作
审查:  mv to 03-review               → 等待确认
完成:  mv to 04-completed            → 归档
```

**Always use CLI**, never hand-create files: `bun packages/lythoskill-project-cortex/src/cli.ts task "title"`

### Commit trailers (husky post-commit)

When committing a fix for a task, write the trailer:
```
Closes: TASK-xxx
```
Husky post-commit hook auto-creates follow-up commits (task status update + index regeneration).

For review: `Task: TASK-xxx review`
For ADR acceptance: `ADR: ADR-xxx accept`

### Pre-commit gate

Husky runs in order: ADR check → path safety → skill rebuild → cortex governance → **test gate**. Always run `bun test` on the package you're touching before committing.

### BDD tests — expensive, don't whack-a-mole

Agent BDD tests (`*/*/test/runner.ts`) use LLM calls and are NOT run on pre-commit. Run them intentionally:
- Before major releases or architecture changes
- After refactoring core packages (deck, cortex, arena, curator)
- When a BDD scenario keeps failing and being patched ad-hoc — this is a **smoke signal** that the test expectation is stale, not the code. Fix the scenario, don't patch the runner.

**CI Safety Rule**: if you touched any of these, you MUST run the cortex BDD before pushing:
- `generate-index.ts` — INDEX.md generation
- `id-guard.ts` — findDocById / ID matching
- `commands/move.ts` — status directory transitions
- `lib/trailer.ts` — commit trailer parsing

```
bun packages/lythoskill-project-cortex/test/runner.ts
```
These functions have different behavior in CI (CWD, file paths, synthetic BDD IDs) than in local dev. Local `bun test` passing does NOT guarantee CI passes for these files.

If you find yourself fixing the same BDD test for the 3rd time, STOP. The issue is the test design, not the code. Rewrite the `.agent.md` scenario instead.

### QA Security Sweep (module audit)

```
安检:   arena single --deck qa-deck --brief "audit <module>"
确认:   读 findings, 过滤误报
登记:   cortex task for 每个真实发现
修复:   修 P1 + 容易的 P2
验证:   bun test 确认无回归
```

QA deck: `examples/decks/qa-sweep.toml` (7 skills: codeql, semgrep, security-advisor, etc.) — combo workflow at `examples/decks/qa-sweep-COMBO.md`

### Session handoff

When ending a session or approaching context limit:
1. Commit all changes with meaningful message
2. Run `bun packages/lythoskill-project-scribe/src/cli.ts daily` to write `daily/YYYY-MM-DD.md`
3. Commit the daily file
4. Push

The daily file top section = ground truth (overwrite, not append). Next agent reads it first after CLAUDE.md/AGENTS.md.

Full checklist: see [Session Handoff Checklist](#session-handoff-checklist) below.

### Before claiming "done"

- [ ] Tests pass: `bun test packages/<name>/src/`
- [ ] TypeScript compiles (Bun handles this at test time)
- [ ] If CLI surface changed: update package README
- [ ] If new package: add to `scripts/publish.sh` PACKAGES array
- [ ] If new/modified deck example: `deck validate --deck examples/decks/<name>.toml` passes
- [ ] Commit with `Closes: TASK-xxx` trailer if task exists

---

---

## Command Shorthand Convention

Throughout this file and project docs, CLI commands are referenced by their **shorthand** (e.g. "deck link", "arena single", "cortex probe"). This is a convention for readability — the shorthand is NOT a runnable command.

**Resolution rule** — every shorthand resolves to one of:

| Shorthand | In-repo dev | External user (via npm) |
|-----------|------------|------------------------|
| `deck link` | `bun packages/lythoskill-deck/src/cli.ts link` | `bunx @lythos/skill-deck link` |
| `deck add` | `bun packages/lythoskill-deck/src/cli.ts add` | `bunx @lythos/skill-deck add` |
| `deck remove` | `bun packages/lythoskill-deck/src/cli.ts remove` | `bunx @lythos/skill-deck remove` |
| `deck validate` | `bun packages/lythoskill-deck/src/cli.ts validate` | `bunx @lythos/skill-deck validate` |
| `deck refresh` | `bun packages/lythoskill-deck/src/cli.ts refresh` | `bunx @lythos/skill-deck refresh` |
| `arena single` | `bun packages/lythoskill-arena/src/cli.ts single` | `bunx @lythos/skill-arena single` |
| `arena vs` | `bun packages/lythoskill-arena/src/cli.ts vs` | `bunx @lythos/skill-arena vs` |
| `curator scan` | `bun packages/lythoskill-curator/src/cli.ts scan` | `bunx @lythos/curator scan` |
| `curator add` | `bun packages/lythoskill-curator/src/cli.ts add` | `bunx @lythos/curator add` |
| `curator query` | `bun packages/lythoskill-curator/src/cli.ts query` | `bunx @lythos/curator query` |
| `cortex task` | `bun packages/lythoskill-project-cortex/src/cli.ts task` | `bunx @lythos/project-cortex task` |
| `cortex adr` | `bun packages/lythoskill-project-cortex/src/cli.ts adr` | `bunx @lythos/project-cortex adr` |
| `cortex probe` | `bun packages/lythoskill-project-cortex/src/cli.ts probe` | `bunx @lythos/project-cortex probe` |

**For site/docs (external audience):** code blocks MUST use the `bunx` form — copy-paste must work. Prose may use shorthand AFTER the first occurrence establishes the full command: "`deck link` (via `bunx @lythos/skill-deck link`)". See `cortex/tasks/02-in-progress/TASK-20260528114758563-*.md` for the audit scope.

## Common Commands

All commands run from the repository root.

> **Troubleshooting:** If `bunx @lythos/...` commands fail, you are likely in development mode. Use `bun packages/<name>/src/cli.ts <command>` instead.

### Development (direct Bun execution)
```bash
# Run creator CLI directly (no build step needed)
bun packages/lythoskill-creator/src/cli.ts init <project-name>
bun packages/lythoskill-creator/src/cli.ts build <skill-name>

# Run deck CLI directly
bun packages/lythoskill-deck/src/cli.ts link
bun packages/lythoskill-deck/src/cli.ts link --deck <path>

# Run project-cortex CLI directly
bun packages/lythoskill-project-cortex/src/cli.ts <command>
```

### Via bunx (as users would run after publishing)
```bash
bunx @lythos/skill-creator@0.15.4 init <project-name>
bunx @lythos/skill-creator@0.15.4 build <skill-name>
bunx @lythos/skill-creator@0.15.4 build --all
bunx @lythos/skill-creator@0.15.4 align            # audit conventions
bunx @lythos/skill-creator@0.15.4 align --fix      # auto-apply
bunx @lythos/skill-creator@0.15.4 bump <patch|minor|major|X.Y.Z> [--dry-run]
bunx @lythos/skill-deck@0.15.4 link
bunx @lythos/project-cortex@0.15.4 <command>
```

### Release pipeline (full detail below)
```bash
bunx @lythos/skill-creator@0.15.4 bump patch --dry-run   # preview
bunx @lythos/skill-creator@0.15.4 bump patch             # bump root + all packages, rebuild skills
git diff && git commit -am "chore(release): vX.Y.Z"
./scripts/publish.sh                              # publish all packages, reads .npm-access
```
See [Release & Auth Workflow](#release--auth-workflow) for the full contract.

### Testing
```bash
# Run deck scenario tests (custom lightweight runner, not Jest/Vitest)
bun packages/lythoskill-deck/test/runner.ts

# Run with parallel workers and custom output directory
bun packages/lythoskill-deck/test/runner.ts --parallel 4 --output ./playground/test-runs
```

### Project Governance (project-cortex)
```bash
# Create governance documents — ALWAYS use CLI, do NOT create files manually
bun packages/lythoskill-project-cortex/src/cli.ts task "<title>"
bun packages/lythoskill-project-cortex/src/cli.ts epic "<title>" --lane main|emergency
bun packages/lythoskill-project-cortex/src/cli.ts adr "<title>"

# Task state machine
bun packages/lythoskill-project-cortex/src/cli.ts start TASK-xxx
bun packages/lythoskill-project-cortex/src/cli.ts review TASK-xxx
bun packages/lythoskill-project-cortex/src/cli.ts done TASK-xxx        # review → completed only
bun packages/lythoskill-project-cortex/src/cli.ts complete TASK-xxx    # any status → completed (trailer-driven)
bun packages/lythoskill-project-cortex/src/cli.ts suspend TASK-xxx
bun packages/lythoskill-project-cortex/src/cli.ts resume TASK-xxx
bun packages/lythoskill-project-cortex/src/cli.ts terminate TASK-xxx
bun packages/lythoskill-project-cortex/src/cli.ts archive TASK-xxx

# ADR state machine
bun packages/lythoskill-project-cortex/src/cli.ts adr accept ADR-xxx
bun packages/lythoskill-project-cortex/src/cli.ts adr reject ADR-xxx
bun packages/lythoskill-project-cortex/src/cli.ts adr supersede ADR-xxx --by ADR-yyy

# Epic state machine
bun packages/lythoskill-project-cortex/src/cli.ts epic done EPIC-xxx
bun packages/lythoskill-project-cortex/src/cli.ts epic suspend EPIC-xxx
bun packages/lythoskill-project-cortex/src/cli.ts epic resume EPIC-xxx

# Maintenance
bun packages/lythoskill-project-cortex/src/cli.ts index    # Regenerate INDEX.md and wiki/INDEX.md
bun packages/lythoskill-project-cortex/src/cli.ts probe    # Check status consistency + epic lane counts
bun packages/lythoskill-project-cortex/src/cli.ts list     # List all tasks and epics
bun packages/lythoskill-project-cortex/src/cli.ts stats    # Show statistics
```

### Red-Green Release (Migration Patches)
```bash
# Create heredoc patch: pr-<timestamp>-<description>.sh
# Execute → auto-archive to archived-patches/
# User says LGTM → git commit + tag
```
Patches use heredoc (`cat > file << 'EOF'`) for declarative state, not sed.

---

## Agent Runtime Behavior (Arena Operations)

> Arena runtime 规范 — 经验值来自多次 arena 运行调试（arena single / vs mode, claude/kimi player, bare/deck combo 对比）。

### Timeout 经验映射

不同任务类型需要不同的 timeout。120s 不是万能值。

| 任务类型 | 推荐 Timeout | 原因 |
|----------|-------------|------|
| 简单编码（单文件、明确 spec） | 60–120s | 确定性高，agent 直接执行 |
| 写作 + 研究（需要 web search） | 180–300s | 搜索、阅读、构思占大量时间 |
| 写作 + 研究 + HTML 渲染 | 300s+ | 额外工具调用 + 渲染开销 |
| 多步骤 skill 管道 | 300s+ | 每个 skill 增加一层调用 overhead |

**规则**: arena.toml / TASK.agent.md 的 `timeout` 字段必须按任务类型设置，不要默认 120s。

### Agent CWD 行为

**kimi CLI 使用 shell CWD，不是 Bun.spawn 的 `cwd` 参数。**

```
Bun.spawn({ cwd: '/tmp/arena-*/' })  ← 这个 cwd 对 kimi 无效
kimi --print --afk                   ← agent 的 Shell 工具用 process.cwd()
```

**后果**:
- agent 创建的文件落在 arena 启动时的 shell CWD，不是 `/tmp/`
- vs 模式之前用 `/tmp/arena-*/` 作为 baseDir，agent 文件写到别处，copy 逻辑找不到

**修复**: 串行运行下用 `process.chdir(workDir)` 在启动 agent 前改变 shell CWD，运行后恢复。每个 side 有独立的持久化 workdir（`artifactsDir/work/<side>/`）。

### vs / single 模式行为对齐

| 维度 | single 模式 | vs 模式 |
|------|------------|---------|
| 产物保存 | ✅ agent-stdout.txt + stderr + judge-verdict + 文件 copy | 之前只存 judge-verdict |
| 产物目录 | `agent-output-<timestamp>/` 或 `--out` | `runs/<arena-id>/runs/<side>/run-N/` |
| workdir | `runs/agent-bdd/<stamp>/<scenario>/` | `artifactsDir/work/<side>/` |
| copy 逻辑 | ✅ cli.ts:308-328 `buildCopyPlan` | 之前缺失 |

**规则**: vs 模式必须复用 single 模式的产物复制逻辑。`buildCopyPlan` 从 workdir copy 到 cellDir，skip `.claude/`、`skill-deck.toml` 等元数据。

### Judge Prompt 设计

**TASK.agent.md 只定义 criteria，JSON 格式由 arena 运行时注入。**

反例（不要把格式要求写在 TASK.agent.md 里）:
```markdown
## Judge
Return a JSON object with {verdict, reason, criteria}...
```
→ 这会让 task agent 也试图返回 JSON，干扰正常执行。

正例（TASK.agent.md 只写 criteria）:
```markdown
## Judge
- concrete_analogy: Uses a relatable analogy beyond "plugin"
- skill_cases: Lists 3-5 real open-source skills with what/who/scenarios
```
→ arena 在运行时注入 JSON schema 要求和角色指令。

**角色边界 — judge agent 必须明确知道自己是 evaluator 不是 executor:**

```
You are a TEST JUDGE — not the task executor.
Your ONLY job is to evaluate whether another AI agent correctly completed a task.
Do NOT execute the task yourself. Do NOT write content, do NOT search the web.
```

**分隔线明确标注被评估任务 vs 你的角色**，避免 agent 被中文 task 内容带偏。

### Agent-friendly 错误设计

Per ADR-20260507014124191。错误信息不是给人读的字符串，而是给 agent 决策的结构化数据。

**反例**（不要这样做）:
```
❌ Judge failed after 2 attempt(s): JSON Parse error: Unexpected EOF
```
→ agent 不知道发生了什么、该做什么。

**正例**（ValidationReport 模式，见 `packages/lythoskill-cold-pool/src/types.ts` + `src/validate-plan.ts`）:
```typescript
// packages/lythoskill-cold-pool/src/types.ts
export interface ValidationReport {
  status: 'valid' | 'invalid' | 'ambiguous'
  locator: string
  phase: 'syntax' | 'repo-existence' | 'path-existence' | 'skill-md-existence'
  findings: {
    parseError?: string
    repoExists?: boolean
    repoIsPrivate?: boolean
    skillMdFound?: boolean
    detectedPaths?: string[]   // 实际存在的 SKILL.md 候选目录
    remoteStatus?: number
  }
  suggestedFixes: Array<{
    action: 'update-locator' | 'web-search' | 'prompt-user'
    confidence: number          // 0..1
    message: string
    newLocator?: string
  }>
}

// 使用示例：deck validate --format=json
// packages/lythoskill-cold-pool/src/validate-plan.ts
export function buildValidationPlan(locator: string): ValidationPlan {
  // phase 把验证拆成 4 个阶段，agent 读 phase 就知道问题落在哪一层
  // - syntax: locator 字符串本身不符合 FQ 规则 → 修拼写
  // - repo-existence: locator 解析成功但 repo 不在 github → owner/repo 错了
  // - path-existence: repo 存在但 skill 子路径不在 → detectedPaths 给出实际候选
  // - skill-md-existence: 路径存在但没 SKILL.md → 这个 repo 不是 skill repo
}
```

**消费者**:
- CLI text 模式: `--format=text` 渲染为人类可读表格
- CLI JSON 模式: `--format=json` 输出完整 ValidationReport，agent 直接消费
- CI: 识别 `ambiguous`（rate-limited/private）vs `invalid`，只把后者算 fail

**规则**: CLI 错误路径输出必须包含 `phase` + `findings` + `suggestedFixes`。纯字符串错误只在 `--format=text` 人类模式下渲染。参考实现: `packages/lythoskill-cold-pool/src/validate-plan.ts`。

---

## Release & Auth Workflow

> **Read this before running any `git remote`, `npm publish`, `npm login`, or version-bump command.**
> This contract is the single source of truth for who-writes-what during a release. Past agents have damaged this state by improvising — assume the setup is intentional.

Codified by **ADR-20260502233119561** (lock-step bump command and policy) and **ADR-20260502234833756** (skill package identification).

### Authentication state — pre-configured, do not modify

| File / Resource | Purpose | Rule |
|------|------|------|
| `.git/config` (origin URL) | Git push/fetch | Origin uses SSH alias `git@calt13.github.com:Caltara/lythoskill.git`. **Never run `git remote set-url`** to embed a token, switch protocol, or "fix" anything. If `git push` fails, stop and ask. |
| `~/.ssh/` | SSH keys + alias config | **Off-limits.** Do not read, list, cat, or write inside this directory — even diagnostically. If git/SSH fails, surface the error and ask the user. |
| `.github-token` (project root, gitignored) | `gh` CLI auth only | Use as `gh auth login --with-token < .github-token`. **Never embed in a git URL or `.git/config`.** |
| `.npm-access` (project root, gitignored) | npm publish token | Read by `scripts/publish.sh`. **Never run `npm login`** or prompt the user to log in — fix the token file instead. |

If anything auth-related looks "broken", do not improvise a fix. Ask.

### Lock-step versioning (one version, all packages)

Every `packages/*/package.json` and the root `package.json` carry the **same** version. A bump rolls every package + root together. This includes private infrastructure packages (e.g. `lythoskill-test-utils`) — lock-step is monorepo-wide. Build is filtered separately (see next section).

**Use the dedicated tool. Do not `jq`/`python`/`sed`/hand-edit.**

```bash
# Preview
bunx @lythos/skill-creator@0.15.4 bump patch --dry-run
bunx @lythos/skill-creator@0.15.4 bump 1.0.0 --dry-run

# Real run
bunx @lythos/skill-creator@0.15.4 bump patch       # 0.7.2 → 0.7.3
bunx @lythos/skill-creator@0.15.4 bump minor       # 0.7.2 → 0.8.0
bunx @lythos/skill-creator@0.15.4 bump major       # 0.7.2 → 1.0.0
bunx @lythos/skill-creator@0.15.4 bump 1.2.3       # explicit X.Y.Z
```

The `bump` pipeline (see `packages/lythoskill-creator/src/bump.ts`):
1. Write root `package.json` (only the `version` field changes).
2. Run `align(fix=true)` — syncs every `packages/*/package.json` to the new version. `align` already protects `{{...}}` placeholders in `SKILL.md` source files.
3. Run `build` for each package whose `packages/<name>/skill/` directory exists — re-renders `skills/<name>/SKILL.md` with the new version.

`bump` intentionally does NOT git-commit, tag, or push. It refuses downgrades and same-version targets.

### Skill product identification (build-time filter)

A package is a "skill product" iff `packages/<name>/skill/` exists. This filter applies to **build** (which packages render to `skills/<name>/`) but **NOT** to **version sync** (which is universal). Do not filter by `name.startsWith('lythoskill-')` — `lythoskill-test-utils` matches the prefix but is not a skill product. See ADR-20260502234833756.

### SKILL.md source files are templates

`packages/*/skill/SKILL.md` contains placeholders (`{{PACKAGE_VERSION}}`, `{{PACKAGE_NAME}}`, `{{BIN_NAME}}`, `{{BIN_ENTRY}}`). They are re-rendered into `skills/<name>/SKILL.md` on every build. **Never replace them with literal values in source** — that breaks future renders.

### Commit policy

- `bump` produces an unstaged diff. Commit it with `chore(release): vX.Y.Z`.
- `.husky/pre-commit` runs `build --all` whenever `packages/**/skill/**` files change, then auto-stages `skills/`. This is independent of `bump` and protects against drift in everyday edits.
- Do not `--amend` a published commit. Do not `--no-verify`.

### New package publish list (discipline)

**Every new npm package under `packages/` must be added to `scripts/publish.sh` `PACKAGES` array before its first release.**

The script is the single source of truth for what gets published. Packages not in the list are silently skipped — no error, just missing from npm. This has caused real incidents (see CI & Publish Gotchas below).

| Check | Command |
|-------|---------|
| After scaffolding a new package | `grep "packages/lythoskill-<new>" scripts/publish.sh` must match |
| After bump | Verify the new package appears in the publish log |

**Skill-only packages** (no `package.json`, no `src/`, pure `SKILL.md` under `skill/`) are exempt — they are build targets, not publish targets.

### Content discipline

**All content lives under `cortex/wiki/`. Do not create root-level content directories.**

| Content type | Wiki path | Examples |
|-------------|-----------|----------|
| Research reports | `cortex/wiki/02-research/` | Curator comparison, ecosystem analysis |
| Patterns | `cortex/wiki/01-patterns/` | Player-Deck separation, bootloader |
| FAQs & Guides | `cortex/wiki/02-faq/` | In-action tour, player prerequisites |
| Lessons learned | `cortex/wiki/03-lessons/` | Agent spawn reliability journey |

**Never**: `research/`, `showcase/`, `guides/`, or any content-only directory at repo root. Site content (vitepress) is a build target sourced from wiki — do not maintain parallel content.

### Cortex task lifecycle (discipline)

**Every task that produces a commit must close itself via git commit trailer.** The `.husky/post-commit` hook reads `Closes: TASK-xxx` and `Task: TASK-xxx review/done` trailers, then auto-moves the task in cortex.

| Step | Action | Why |
|------|--------|-----|
| Start work | `cortex start TASK-xxx` or `TaskUpdate({ status: 'in_progress' })` | Marks task active; prevents duplicate work |
| Finish work | Commit with `Closes: TASK-xxx` trailer | Post-commit hook auto-moves task to completed |
| Manual close | `cortex complete TASK-xxx` | Fallback when trailer missed or task has no associated commit |

**Do not leave tasks in `02-in-progress` after the work is done.** A stale in-progress list makes the next agent think work is unfinished. The `cortex probe` command catches these inconsistencies — run it before ending a session.

### Publish to npm

```bash
./scripts/publish.sh
```

The script reads `.npm-access`, configures the npm registry, runs `npm whoami` to verify auth, publishes packages in dependency order, and restores the original npm config on exit. Aborts on auth failure — fix `.npm-access`, never `npm login`.

### CI & Publish Gotchas

These are the small details that cause CI failures or broken publishes. Most are one-line fixes that an agent can easily miss.

| Gotcha | Symptom | Fix |
|--------|---------|-----|
| **New package, stale lockfile** | `bun install --frozen-lockfile` fails in CI | `bun install` then commit `bun.lock` |
| **New package not in publish script** | Package missing from npm after release | Add to `scripts/publish.sh` PACKAGES array |
| **`require()` in TypeScript source** | Pre-commit hook rejects with ESM-only ADR | Use `import` / `await import()` — never `require()` |
| **SKILL.md edited, not rebuilt** | Skills directory stale, agent sees old instructions | `bunx @lythos/skill-creator@latest build` auto-runs in pre-commit when `skill/SKILL.md` changed |
| **Wrong CWD for git commands** | `git add <file>` fails with "did not match" | Always `cd` to repo root first: `/Users/chariots/Downloads/lythoskill-main` |
| **Skills branch push race** | `[remote rejected] skills → skills (cannot lock ref)` | `git pull --rebase` then `git push` (concurrent agent sessions share the skills branch) |
| **New adapter, wrong package** | Heavy daemon code in base interface package | Lightweight CLI adapters → `@lythos/agent-adapter`. Daemon/SSE/port management → new `@lythos/agent-adapter-<name>` package |
| **Test expects old adapter** | `listAgents()` no longer contains removed adapter | Update test expectations when removing adapters |

### Handoff (release-adjacent)

Session handoffs go to `daily/YYYY-MM-DD.md` (per **ADR-20260424125637347**). The path `daily/HANDOFF.md` is **deprecated** — older docs may still reference it; the daily-dated path is canonical.

---

## Code Conventions

1. **ESM-only**: No `require()`. Import JSON with assertions:
   ```typescript
   import pkg from '../package.json' with { type: 'json' }
   ```

2. **Built-in module prefix**: Always use `node:` prefix (`node:fs`, `node:path`).

3. **Skill-layer zero-perceived-dependency**: Skill scripts (`skills/<name>/scripts/`) must be zero-install-burden for consumers — called via `bunx <pkg>`, dependencies auto-fetched and cleaned by the package manager. Starter layer (`packages/*/src/`) can use normal npm dependencies.

4. **Fence variable trick**: When generating content containing code blocks with backticks, use:
   ```typescript
   const fence = '`'.repeat(3)  // => '```'
   ```

5. **CLI style**: Parse with `process.argv.slice(2)`, route with simple `switch` statements. No CLI frameworks.

6. **File permissions**: Generated shell scripts must be executable:
   ```typescript
   chmodSync(path, 0o755)
   ```

7. **tsconfig**: `moduleResolution` must be `"bundler"`, `types` includes `"bun-types"`, target `"esnext"`.

8. **Unified version policy**: All packages in `packages/` and root share a single version, bumped via `bunx @lythos/skill-creator@0.15.4 bump`. Source-of-truth and pipeline are documented in [Release & Auth Workflow](#release--auth-workflow) — read that section before changing any version.

9. **Test file organization**: Unit tests are co-located in `src/*.test.ts` next to source. CLI BDD tests live in `test/runner.ts` + `test/scenarios/`. Agent BDD tests use `test/scenarios/*.agent.md`. Pre-commit hook enforces 0 test failures on changed packages. Full conventions: [TESTING.md](./TESTING.md).

---

## DeepSeek TUI Operational Notes

> **You are running inside DeepSeek TUI.** This section documents how the host platform works when used programmatically (Bun.spawn, arena, agent-bdd). Knowing this avoids wasted troubleshooting.

### Modes at a glance (v0.8.14)

| Command | Tool execution | Use case |
|---------|---------------|----------|
| `deepseek -p "prompt"` | ❌ Chat only — outputs tool calls as text, never executes them | Pure text tasks (summarization, Q&A, hello world) |
| `deepseek exec` | ❌ Same as `-p` — non-agent mode | Same |
| `deepseek serve --http` | ✅ Full agent with tools + subagents | **Programmatic integration** (arena, agent-bdd, Bun.spawn) |
| `deepseek run` | ✅ Interactive TUI | Human-in-the-loop sessions |

**The `-p` trap**: `deepseek -p "Write Hello World to output.md"` will output a code block describing how to do it, but will NOT write the file. The model explicitly states "I cannot execute commands on your system." This is by design — one-shot prompts use the chat completion endpoint, not the agent loop.

**The correct programmatic path**: `deepseek serve --http` starts an HTTP server (default port 7878) that exposes the full agent loop via a REST API:
- `POST /v1/threads` — create a thread with workspace config
- `POST /v1/threads/{id}/turns` — send a prompt, get a turn ID
- `GET /v1/threads/{id}/events?since_seq=0` — SSE event stream (tool calls, deltas, completion)
- `POST /v1/threads/{id}/turns/{id}/interrupt` — interrupt a running turn
- The server executes tools natively — file writes, shell, web search, sub-agents all work

### Auto-approve flag

v0.8.14 uses `--approval-policy auto` (NOT `--yolo` — that flag does not exist yet).

```
deepseek --approval-policy auto --model deepseek-v4-flash ...
```

Valid values: `auto`, `on-request`, `untrusted`, `never`, `suggest`. `auto` = approve all, equivalent to Kimi `--afk`.

### Adapter architecture

Lightweight adapters (pure CLI spawn) live in `@lythos/agent-adapter`. Heavy adapters (daemon lifecycle, SSE, PID management) live in independent packages:

| Package | Player | Mechanism |
|---------|--------|-----------|
| `@lythos/agent-adapter` | `kimi` | `kimi --print` |
| `@lythos/agent-adapter-claude-sdk` | `claude` | Anthropic Agent SDK |
| `@lythos/agent-adapter-deepseek-serve` | `deepseek` | `deepseek serve --http` thread API + daemon lifecycle |

See `packages/lythoskill-agent-adapter/README.md` for the architecture contract. New adapter? Follow the table — heavy = new package.

### Smoke test pattern

When testing any new adapter, use the two-phase smoke test:
1. **Hello World**: `deepseek -p "Reply with exactly 'OK'"` → verifies spawn pipe + auth
2. **Self-report skills**: agent inspects its `working_set` directory (default `.claude/skills/`; per-agent path configurable in `skill-deck.toml`) → verifies deck link + skill discovery

Test scenarios live in `packages/lythoskill-deck/test/scenarios/*.agent.md`. The runner supports `--player` to select the agent backend:
```bash
bun packages/lythoskill-deck/test/runner.ts --agent --player deepseek
bun packages/lythoskill-deck/test/runner.ts --agent --player kimi
```

### Supporting References

| When you need to… | Read |
|--------------------|------|
| Understand why DeepSeek TUI > Kimi/Claude for Bun.spawn | [`cortex/wiki/03-lessons/2026-05-06-deepseek-tui-headless-programmatic-analysis.md`](./cortex/wiki/03-lessons/2026-05-06-deepseek-tui-headless-programmatic-analysis.md) |
| Compare all four agent CLI backends (DeepSeek/Kimi/Claude/OpenCode) | Same wiki entry — §8 scoring matrix |
| Understand the Kimi adapter pattern (reference for new adapters) | [`cortex/wiki/03-lessons/kimi-vs-claude-cli-headless-comparison.md`](./cortex/wiki/03-lessons/kimi-vs-claude-cli-headless-comparison.md) |
| See the AgentAdapter interface + player abstraction design | [`cortex/wiki/01-patterns/player-abstraction-agent-swappable-backend.md`](./cortex/wiki/01-patterns/player-abstraction-agent-swappable-backend.md) |
| Learn the `.agent.md` format (Given/When/Then/Judge) | [`packages/lythoskill-deck/test/scenarios/skills-introspection.agent.md`](./packages/lythoskill-deck/test/scenarios/skills-introspection.agent.md) — canonical example |
| Write a new Agent BDD scenario | Copy an existing `.agent.md`, follow `## Given` / `## When` / `## Then` / `## Judge` sections |
| Run Agent BDD scenarios locally | `bun packages/lythoskill-deck/test/runner.ts --agent --player <name>` |
| Understand how `useAgent()` routes players to adapters | [`packages/lythoskill-test-utils/src/agents/index.ts`](./packages/lythoskill-test-utils/src/agents/index.ts) |
| Debug adapter spawn issues (stdin pipe, env, timeout) | [`cortex/wiki/03-lessons/2026-05-06-agent-spawn-reliability-journey-kimi-player-cwd-isolation.md`](./cortex/wiki/03-lessons/2026-05-06-agent-spawn-reliability-journey-kimi-player-cwd-isolation.md) |
| See TDD test patterns for pure functions (preflight example) | [`packages/lythoskill-arena/src/preflight.test.ts`](./packages/lythoskill-arena/src/preflight.test.ts) — 41 tests, 100% coverage |

---

## Project Skills (Self-Contained)

This repository contains its own built skills under `skills/`:

**Core (understanding these is essential to work in this repo):**
- `skills/lythoskill-creator/SKILL.md` — How the scaffolding tool works (init/build commands)
- `skills/lythoskill-deck/SKILL.md` — How deck governance works (link/status/migrate, deny-by-default, max_cards)
- `skills/lythoskill-project-cortex/SKILL.md` — How project governance works (task/epic/adr/index/probe)

**Even without `deck link`, you can read any `skills/<name>/SKILL.md` directly** to understand how that skill works. These files describe intent, usage, and available commands.

---

## Deck Governance

The `skill-deck.toml` file declares which skills are active per project. Key config:
- `working_set` — where skills are linked (`.claude/skills/` default; configure per agent)
- `cold_pool` — where skills are downloaded (`~/.agents/skill-repos/` default)
- `max_cards` — hard cap on total skills
- Sections: `innate` (always loaded), `tool` (triggered), `combo` (prompt-driven orchestration), `transient` (time-bounded)

### Agent Skills path quick reference

> **`.claude/skills/`** is Claude Code's default (skill concept originator). **`.agents/skills/`** is the community standard — Vercel skills.sh uses it as universal target, and 14+ agents (Kimi, Codex, Cursor, Gemini CLI, GitHub Copilot, OpenCode...) share it. Both choices are valid; never imply `.claude/skills/` is the sole path.
>
> Full agent→path table: [`cortex/wiki/01-patterns/agent-skills-path-reference.md`](./cortex/wiki/01-patterns/agent-skills-path-reference.md). Convention rules: [`cortex/wiki/01-patterns/path-convention.md`](./cortex/wiki/01-patterns/path-convention.md).

The `lythoskill-deck` tool reconciles the declared deck against the cold pool by creating symlinks (default) or snapshots (`--mode snapshot`) in the working set. It generates a `skill-deck.lock` file tracking the resolved state including per-skill mode (`"symlink" | "snapshot"`).

**Pre-built decks** live in `examples/decks/` — `deck link --deck <url>` bootstraps a workspace in one command. See the project README for the full table.

**Commands**: `link` | `add` | `refresh` | `remove` | `validate --remote` | `to-symlink <alias>` | `to-snapshot <alias>` | `migrate-schema`

Key principle: declarative package manager + governor. `deck add` clones into cold pool and appends to deck. `deck link` reconciles the working set (deny-by-default). `deck to-symlink`/`to-snapshot` toggle per-skill between symlink mode and snapshot (pinned) mode. For cold pool GC and drift reporting, use the `cold-pool` CLI (`bunx @lythos/cold-pool prune`, `bunx @lythos/cold-pool validate --lock <path>`).

> **Baseline pattern — agents must read**: [`cortex/wiki/01-patterns/2026-05-09-cold-pool-architecture-deck-decoupling-with-fsm-reference-counting.md`](./cortex/wiki/01-patterns/2026-05-09-cold-pool-architecture-deck-decoupling-with-fsm-reference-counting.md)
> covers the full decoupling design, FSM reference counting, prune/validate flow,
> SKILL.md-based enumeration, and the deck_refs state machine.

---

## Project Governance (Cortex Reference)

> **Quick patterns → see [Recurring Workflows](#recurring-workflows) above.** This section is the detailed reference.

Status directories: `01-backlog/` → `02-in-progress/` → `03-review/` → `04-completed/` (normal flow). Also `05-suspended/`, `06-terminated/`, `07-archived/`. Filenames: `TASK-yyyyMMddHHmmssSSS-<slug>.md`. Always use CLI, never hand-create files.

### Cortex Trailer Syntax

Cortex governance is **commit-driven** via git trailers in commit messages. The `post-commit` hook parses trailers and auto-creates follow-up commits with state changes.

**Trailer Syntax** (add at the end of the commit message body):

```
Closes: TASK-<id>        # Any status → completed (task), proposed → accepted (ADR), active → done (epic)
Task: TASK-<id> <verb>   # Explicit task verb: start, review, done, suspend, resume, terminate, archive
ADR: ADR-<id> <verb>     # ADR verb: accept, reject, supersede
Epic: EPIC-<id> <verb>   # Epic verb: done, suspend, resume
```

Examples:
```
feat(api): add endpoint

Closes: TASK-20260503010227902
```
```
docs(cortex): accept ADR-B

ADR: ADR-20260503003315478 accept
```

**Hooks:**
- **`.husky/pre-commit`**: When `cortex/tasks/02-in-progress/` is non-empty, prints a soft reminder with the in-progress task ID list and trailer syntax. Does **NOT** block commit.
- **`.husky/post-commit`**: Parses trailers from the just-committed message, dispatches to `cortex` CLI, and creates a follow-up commit with the state changes. Follow-up commits carry `Triggered by: <hash>` to prevent recursion. Malformed trailers or invalid transitions print warnings but do not block.

**Failure fallback:** `cortex probe` runs reconciliation checks. Run it periodically to catch silent drift (e.g. hook silently failed, or a manual file move bypassed the CLI).

### Cortex Granularity

Three governance layers with distinct responsibilities:

| Layer | Question | When to use | Example |
|-------|----------|-------------|---------|
| **ADR** | WHY this choice? | Technical decision, option comparison, irreversible choice | "Use Bun over Node" |
| **Epic** | WHAT outcome and HOW decomposed? | 1-3 week outcome with dependencies, plan-aligned, zoom-in focus | "Implement trailer-driven governance" |
| **Task** | WHAT specific action? | 1-3 day executable work for subagent | "Add `task complete` verb to CLI" |
| **Wiki** | WHAT do we know and HOW do we apply it? | Reusable pattern, FAQ, or retrospective; knowledge that outlives a single epic/task | "GitHub Actions + Bun CI/CD pattern" |

**Epic Discipline:**
- **Dual-track lanes**: `lane: main` (current iteration focus, max 1 active epic) and `lane: emergency` (unavoidable urgent insert, max 1 active epic).
- **5-question checklist** at creation: outcome clear? / closable in 1-3 weeks? / fits 1-3 week size? / not a task? / not an ADR?
- Lane-full = rejection unless `--override "<reason>"` is provided (reason recorded in frontmatter).
- `cortex probe` warns when >1 active epic per lane.

**Task = Subagent Bootloader:**
A task card should be self-contained: frontmatter metadata + concise body + external references to ADRs/Epics/sibling tasks. A subagent reading only the task card + AGENTS.md should have enough context to implement the work. If the card needs to invent migrations not pre-decided by the user, that is a signal the card is incomplete.

**For full context on the project governance system, read `cortex/INDEX.md`.**

---

## Session Handoff Checklist

When a session is ending or context is about to compact, you MUST execute this handoff flow:

### Trigger Conditions (any one is sufficient)
- User says "LGTM", "that's it", "stop here for now", "record progress"
- Conversation exceeds 20 turns
- A milestone is completed (build succeeds, push to remote, tests pass)
- User says "switch agent to continue" or "session is ending"

### Handoff Steps

1. **Confirm triple state** — Before writing anything, verify:
   - `git status` — what is committed vs unstaged vs untracked
   - `bun packages/lythoskill-project-cortex/src/cli.ts list` — active epics and tasks
   - **Session recall** — what happened this session that is NOT yet written anywhere?

2. **Write handoff to daily journal** → `daily/YYYY-MM-DD.md`
   - New day: create a new date file. Same day: append to existing file.
   - Use `skills/lythoskill-project-cortex/HANDOFF-TEMPLATE.md` as the format for the `## Session Handoff` section.
   - Focus on what file exploration CANNOT recover: pitfalls, true working-tree state, specific next steps.
   - Do NOT repeat what `git log`, `ls`, or `cat` can already reveal.

4. **Commit if clean** — If working tree is in a good state, commit with descriptive message

---

## Onboarding for New Agent

When entering this project with no prior context, read in this exact order:
1. `AGENTS.md` (this file) — canonical project guidance, including [Release & Auth Workflow](#release--auth-workflow). **Re-read the workflow section if context has been compacted mid-session** — auth/version mistakes here are the most common regression.
2. `daily/YYYY-MM-DD.md` (latest date file) — session handoff + work log, highest priority memory
3. `daily/` history (recent 3 days) — project journal across sessions
4. `skill-deck.toml`
5. `cortex/INDEX.md`
6. `git log --oneline -10`

**Memory bridge:** `daily/` is the project's cross-CLI journal — it travels with the repo and can be read by any agent (Claude, Cursor, Windsurf, Kimi, etc.) through the skill system.

---

## Arena CLI（@lythos/skill-arena 0.10+）

Arena 是整个项目最核心的 dogfooding 工具。我们自己每天都会用它。

| 入口 | 心智模型 | 用途 |
|------|---------|------|
| `single` | 单人测卡组 / exec 快捷键 | `--deck <path> --task <scenario.agent.md>` 或 `--brief "<prompt>"` |
| `single --player` | 快速切换 player | 默认 kimi，`--player claude` 切 Claude |
| `vs` | 真实比赛 / A/B 对比 | `--config arena.toml`（多 side × 多 player 声明式） |
| `scaffold` | 遗留：只产出目录结构 | `--decks` 创建 arena 骨架，手动跑 subagent |

**两条原则**：
1. `single` 是一个 **exec 快捷键** — 指定 deck + task，快速出结果。我们自己做设计时就是这样用的（比如跑设计 deck 看效果）。
2. `vs` 只接受 `arena.toml` — 所有 side、player、deck 声明式定义。没有 CLI-flag 模式。

**`single --task` 格式**：必须是 `.agent.md` 场景文件（frontmatter + Given/When/Then/Judge）。`--brief` 是 inline 替代。

**rename 历史**：0.9.x 中曾叫 `agent-run` / `run --decks`。0.10.0 统一重命名。参见 `ADR-20260509104832428`。

### CLI 错误信息 = HATEOAS 式自导航

所有 CLI 错误信息遵循 **HATEOAS 原则**——报错时告诉 agent **"出了什么问题 + 下一步做什么"**。Agent 不需要额外推理就能修复。

原则（`ADR-20260507014124191`）：
- 错误信息包含三类信息：**问题在哪一阶段**、**检测到什么**、**可能的修复**
- `--config` 未提供 → 给出用法 + 示例路径
- Player 未找到 → 给出可用 player 列表 + 安装命令
- 文件未找到 → 给出示例文件路径或创建命令
- 命令不认识 → 列出可用命令 + `--help` 指引

Agent 读取错误信息后应能立即执行修复，不需要猜测或回到人类。

### Annotation mindset — 代码即注解，agent 是容器

**Annotation mindset** 是 HATEOAS 在代码层面的延伸。与 Spring IoC 扫描 `@Autowired` 来装配依赖类似，agent runtime 扫描代码注释、错误消息和 SKILL.md frontmatter 来装配行为。

三层注解，agent 不需要的绝不给：

| 层级 | 内容 | 需要注解吗？ |
|------|------|-----------|
| **L0 系统工具** | git, curl, docker, node, bun | ❌ Agent 已充分训练，内建知识足够 |
| **L1 项目工具** | lythoskill-deck, skill-creator, arena | ✅ SKILL.md 就是注解——agent 读它来学习 schema 和用法 |
| **L2 内联提示** | 错误消息、代码注释、配置项 | ✅ 只在非显然时加——告诉 agent "看到这个时该怎么做" |

**核心规则**：代码中的提示是触发器，agent 的知识 + web fetch 是解析器。不要给 agent 地图（结构化框架），给指南针（清晰的上下文）。

示例：
- ❌ `throw new Error('curl failed')` — agent 无法行动
- ✅ `throw new Error('curl not found — required for SOCKS proxy. Install: brew install curl (macOS), apt-get install curl (Linux). Or unset LYTHOS_SOCKS_PROXY')` — agent 直接执行修复

完整论述见 `cortex/wiki/01-patterns/2026-05-15-annotation-mindset-agent-facing-code-annotations-as-ioc-for-agent-behavior.md`。

### Fallback hints 必须配套 dormancy 测试

任何 "失败 fallback" 提示（mirror / proxy / retry / degraded mode）都必须配套一个 **dormancy 属性测试**：在 happy path 上 grep stderr 中的 fallback 关键字，要求 0 匹配。

例：v0.9.43 给 arena CLI 加了 `ghfast.top` 镜像兜底（受限网络下 URL fetch 失败时显示）。T9 playbook 的 S6 同时验证两件事：
- end-to-end 工作（fetch + agent + verdict）
- `grep -c -E 'ghfast|mirror|proxy|fallback'` 在 stderr 中返回 **0**

为什么必须配套：positive coverage（hint 触发时显示）容易写、容易记；dormancy（hint 不该显示时静默）凭经验判断,容易漏。一旦 hint 漏到 happy path 上,用户会学会忽视它,真发生故障时 hint 反而失效。

完整 pattern + 适用边界见 `cortex/wiki/01-patterns/2026-05-09-dormancy-property-test-for-fallback-hints.md`。

## Safety & Boundaries

- **No filesystem escape**: All `fs` operations are relative to `process.cwd()` or the generated project root.
- **No network requests**: Tools do not initiate HTTP requests; pure local filesystem operations.
- **Build filtering**: The `build` command explicitly excludes test files and `node_modules`, preventing dev dependencies from leaking into release artifacts.
- **Low template injection risk**: Template content is hardcoded strings; user input is only used for filenames and project names, never for code execution paths.

---

## Quick Reference

| File | Purpose |
|------|---------|
| `src/cli.ts` | Command routing (init / build / add-skill / align / bump) |
| `src/init.ts` | Project template generation |
| `src/build.ts` | Build from packages/<name>/skill/ to skills/<name>/ |
| `src/align.ts` | Audit & sync `packages/*/package.json` against root |
| `src/bump.ts` | Lock-step version bump pipeline (write root → align → build) |
| `src/templates.ts` | All string templates |
| `scripts/publish.sh` | npm publish for all packages, reads `.npm-access` |
| `.github-token` | gh-CLI auth token (gitignored, never embed in git URL) |
| `.npm-access` | npm publish token (gitignored, used by publish.sh) |
| `skills/lythoskill-creator/SKILL.md` | Agent-visible usage documentation |
| `cortex/INDEX.md` | Governance system entry |
| `daily/YYYY-MM-DD.md` | Daily journal + session handoff (HANDOFF.md is deprecated) |
