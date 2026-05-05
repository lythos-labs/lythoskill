# lythoskill — AGENTS.md

> Project guidance for agents that read `AGENTS.md` (Kimi, Codex, Copilot, Gemini CLI, etc.).
> If you are Claude Code, read [`CLAUDE.md`](./CLAUDE.md) instead — it points back here for the full content.
> Human contributors: see [README.md](./README.md) for a higher-level overview.

> **⚠️ Before any release / auth / version work, read [Release & Auth Workflow](#release--auth-workflow).**
> Auth state (`.git/config`, `~/.ssh/`, `.github-token`, `.npm-access`) is **pre-configured — do not modify**. Versions move via `bunx @lythos/skill-creator@0.9.18 bump`, never by hand-editing `package.json` or `jq`/`python`/`sed`. Past agents corrupted the git remote URL by trying to "fix" auth and forced manual recovery — do not repeat this. This warning matters even mid-session after context compaction.

---

## Project Overview

**lythoskill** is a governance layer for the agent skill ecosystem. It provides governance infrastructure on top of existing skill standards, so your agent stays focused and conflict-free as your skill collection grows from 10 to 100+.

It serves two audiences:

1. **Deck Governance**: Declare which skills a project needs. Undeclared skills are physically absent from the agent's working set — deny-by-default prevents silent conflicts.
2. **Thin Skill Pattern**: Scaffold and build thin-skill monorepos where heavy logic lives in npm packages (Starter) and agent-facing instructions live in lightweight SKILL.md files (Skill).

lythoskill itself is built with the lythoskill pattern — it is its own first user (self-bootstrap).

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
.agent.md       →  AgentScenario     →  runAgentScenario
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
- When `--dry-run` would be useful to the user or agent

### When NOT to apply

- Pure data transforms (already no IO)
- Trivial wrappers (over-abstraction)
- One-shot scripts (testability not beneficial)

Full pattern documentation: [cortex/wiki/01-patterns/intent-plan-execute-fractal-architecture-pattern.md](./cortex/wiki/01-patterns/2026-05-04-intent-plan-execute-fractal-architecture-pattern.md)

---

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
bunx @lythos/skill-creator@0.9.18 init <project-name>
bunx @lythos/skill-creator@0.9.18 build <skill-name>
bunx @lythos/skill-creator@0.9.18 build --all
bunx @lythos/skill-creator@0.9.18 align            # audit conventions
bunx @lythos/skill-creator@0.9.18 align --fix      # auto-apply
bunx @lythos/skill-creator@0.9.18 bump <patch|minor|major|X.Y.Z> [--dry-run]
bunx @lythos/skill-deck@0.9.18 link
bunx @lythos/project-cortex@0.9.18 <command>
```

### Release pipeline (full detail below)
```bash
bunx @lythos/skill-creator@0.9.18 bump patch --dry-run   # preview
bunx @lythos/skill-creator@0.9.18 bump patch             # bump root + all packages, rebuild skills
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
bunx @lythos/skill-creator@0.9.18 bump patch --dry-run
bunx @lythos/skill-creator@0.9.18 bump 1.0.0 --dry-run

# Real run
bunx @lythos/skill-creator@0.9.18 bump patch       # 0.7.2 → 0.7.3
bunx @lythos/skill-creator@0.9.18 bump minor       # 0.7.2 → 0.8.0
bunx @lythos/skill-creator@0.9.18 bump major       # 0.7.2 → 1.0.0
bunx @lythos/skill-creator@0.9.18 bump 1.2.3       # explicit X.Y.Z
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

### Publish to npm

```bash
./scripts/publish.sh
```

The script reads `.npm-access`, configures the npm registry, runs `npm whoami` to verify auth, publishes packages in dependency order (`hello-world → project-cortex → curator → arena → creator → deck`), and restores the original npm config on exit. Aborts on auth failure — fix `.npm-access`, never `npm login`.

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

8. **Unified version policy**: All packages in `packages/` and root share a single version, bumped via `bunx @lythos/skill-creator@0.9.18 bump`. Source-of-truth and pipeline are documented in [Release & Auth Workflow](#release--auth-workflow) — read that section before changing any version.

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

The `skill-deck.toml` file at repo root declares which skills are active. Sections: `innate` (always loaded), `tool` (available), `combo` (multi-skill combos), `transient` (time-bounded).

The `lythoskill-deck` tool reconciles the declared deck against the skills cold pool by creating symlinks in `.claude/skills/` (the working set). It generates a `skill-deck.lock` file tracking the resolved state.

Key principle: lythoskill-deck is a declarative package manager and governor. `deck add` git-clones skills into your cold pool, appends them to `skill-deck.toml`, and runs `link`. `deck link` reconciles the working set so only declared skills are visible. You get both dependency management (like Maven) and runtime governance (like Kubernetes RBAC).

---

## Project Governance (Cortex)

Project documentation lives in `cortex/`:

```
cortex/
├── INDEX.md           <- Start here for self-described structure
├── adr/
│   ├── 01-proposed/   <- Pending decisions
│   ├── 02-accepted/   <- Accepted decisions
│   ├── 03-rejected/   <- Rejected decisions
│   └── 04-superseded/ <- Superseded decisions
├── epics/
│   ├── 01-active/     <- Active epics
│   ├── 02-done/       <- Completed epics
│   ├── 03-suspended/  <- Suspended epics
│   └── 04-archived/   <- Archived epics
├── tasks/
│   ├── 01-backlog/    <- Pending tasks
│   ├── 02-in-progress/<- Active tasks
│   ├── 03-review/     <- Pending acceptance
│   ├── 04-completed/  <- Normal completion
│   ├── 05-suspended/  <- Blocked (recoverable)
│   ├── 06-terminated/ <- Cancelled (abnormal end)
│   └── 07-archived/   <- Final archive
└── wiki/
    ├── 01-patterns/   <- Reusable solutions
    ├── 02-faq/        <- Common questions
    └── 03-lessons/    <- Retrospectives
```

Status directories use numeric prefixes for ordering (`01-`, `02-`, etc.). Document filenames use timestamp IDs: `ADR-yyyyMMddHHmmssSSS-<slug>.md`.

All governance documents include a machine-parseable **Status History** table.

**Always use CLI commands to create governance documents** — do not create ADR/Epic/Task files manually. The CLI handles template alignment and correct timestamp IDs.

### Cortex Lifecycle Integration

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
