# lythoskill — AGENTS.md

> Project guidance for agents that read `AGENTS.md` (Kimi, Codex, Copilot, Gemini CLI, etc.).
> If you are Claude Code, read [`CLAUDE.md`](./CLAUDE.md) instead — it points back here for the full content.
> Human contributors: see [README.md](./README.md) for a higher-level overview.

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
| Package Manager | **pnpm** workspaces |
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
├── pnpm-workspace.yaml       # pnpm workspace: packages/*
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

## Common Commands

All commands run from the repository root.

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
bunx @lythos/skill-creator init <project-name>
bunx @lythos/skill-creator build <skill-name>
bunx @lythos/skill-deck link
bunx @lythos/project-cortex <command>
```

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
bun packages/lythoskill-project-cortex/src/cli.ts epic "<title>"
bun packages/lythoskill-project-cortex/src/cli.ts adr "<title>"

# Maintenance
bun packages/lythoskill-project-cortex/src/cli.ts index    # Regenerate INDEX.md and wiki/INDEX.md
bun packages/lythoskill-project-cortex/src/cli.ts probe    # Check status consistency
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

8. **Unified version policy**: All packages in `packages/` share a single version number. When bumping, update every `package.json` — no subpackage version drift. The version is the project's release identity, not per-package identity.

   **Build-time enforcement**: Root `package.json` is the single source of truth for the unified version.
   - Packages with `package.json`: Use `{{PACKAGE_VERSION}}` in `skill/SKILL.md` frontmatter; the `build` command substitutes it from the package's `package.json` (which must match the root version; drift triggers a warning).
   - Pure-skill packages without `package.json`: The `build` command injects the root version directly into the generated `skills/<name>/SKILL.md` — regardless of what is hard-coded in the source.
   - **Pre-commit safeguard**: `.husky/pre-commit` runs `build --all` whenever any `packages/**/skill/` file changes. This rebuilds all skills in ~0.6s and auto-stages `skills/`, ensuring the built output never drifts from source.

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

Key principle: lythoskill-deck is a declarative package manager and governor. `deck add` downloads skills from GitHub/skills.sh into your cold pool, appends them to `skill-deck.toml`, and runs `link`. `deck link` reconciles the working set so only declared skills are visible. You get both dependency management (like Maven) and runtime governance (like Kubernetes RBAC).

---

## Project Governance (Cortex)

Project documentation lives in `cortex/`:

```
cortex/
├── INDEX.md           <- Start here for self-described structure
├── adr/
│   └── 02-accepted/   <- Architecture Decision Records
├── epics/
│   └── 01-active/     <- Requirement epics
├── tasks/
│   ├── 01-backlog/    <- Pending tasks
│   └── 04-completed/  <- Completed tasks
└── wiki/
    ├── INDEX.md       <- Pattern documentation index
    └── 01-patterns/   <- Reusable patterns and conventions
```

Status directories use numeric prefixes for ordering (`01-`, `02-`, etc.). Document filenames use timestamp IDs: `ADR-yyyyMMddHHmmssSSS-<slug>.md`.

All governance documents include a machine-parseable **Status History** table.

**Always use CLI commands to create governance documents** — do not create ADR/Epic/Task files manually. The CLI handles template alignment and correct timestamp IDs.

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

2. **Write single-file handoff** → `daily/HANDOFF.md` (tracked by git)
   - Use `HANDOFF-TEMPLATE.md` as template
   - Focus on what file exploration CANNOT recover: pitfalls, true working-tree state, specific next steps
   - Do NOT repeat what `git log`, `ls`, or `cat` can already reveal

3. **Archive when session ends** — If starting a new day/iteration, move `daily/HANDOFF.md` to `daily/YYYY-MM-DD.md`

4. **Commit if clean** — If working tree is in a good state, commit with descriptive message

---

## Onboarding for New Agent

When entering this project with no prior context, read in this exact order:
1. `AGENTS.md` (this file) — canonical project guidance
2. `daily/HANDOFF.md` (if exists) — single-file session handoff, highest priority memory
3. `daily/` history (recent 3 days) — project journal, work log across sessions
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
| `src/cli.ts` | Command routing (init / build) |
| `src/init.ts` | Project template generation |
| `src/build.ts` | Build from packages/<name>/skill/ to skills/<name>/ |
| `src/templates.ts` | All string templates |
| `skills/lythoskill-creator/SKILL.md` | Agent-visible usage documentation |
| `cortex/INDEX.md` | Governance system entry |
| `daily/HANDOFF.md` | Current session handoff (ephemeral) |
