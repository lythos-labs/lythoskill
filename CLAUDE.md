# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**lythoskill** is a self-bootstrapping thin-skill monorepo scaffolding tool for AI agent skills. It solves the tension between development (needs full monorepo experience) and release (needs minimal context-window footprint).

- **Runtime**: Bun (native TypeScript, no compilation step)
- **Package manager**: pnpm workspaces (`packages/*`)
- **Module system**: ESM-only (`"type": "module"`)
- **External dependencies**: Zero for core packages — only Node.js built-ins (`node:fs`, `node:path`)

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
bunx lythoskill init <project-name>
bunx lythoskill build <skill-name>
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
# Create governance documents
bun packages/lythoskill-project-cortex/src/cli.ts task "<title>"
bun packages/lythoskill-project-cortex/src/cli.ts epic "<title>"
bun packages/lythoskill-project-cortex/src/cli.ts adr "<title>"

# Maintenance
bun packages/lythoskill-project-cortex/src/cli.ts index       # Regenerate INDEX.md and wiki/INDEX.md
bun packages/lythoskill-project-cortex/src/cli.ts probe       # Check status consistency
bun packages/lythoskill-project-cortex/src/cli.ts list        # List all tasks and epics
bun packages/lythoskill-project-cortex/src/cli.ts stats       # Show statistics
```

## Project Skills (Self-Contained)

This repository contains its own built skills under `skills/`:

**Core (understanding these is essential to work in this repo):**
- `skills/lythoskill-creator/SKILL.md` — How the scaffolding tool works (init/build commands)
- `skills/lythoskill-deck/SKILL.md` — How deck governance works (link/status/migrate, deny-by-default, max_cards)
- `skills/lythoskill-project-cortex/SKILL.md` — How project governance works (task/epic/adr/index/probe)

**Demo (minimal example, not needed for day-to-day work):**
- `skills/lythoskill-hello-world/` — Zero-script skill demonstrating the thinnest possible skill

**Even without `deck link`, you can read any `skills/<name>/SKILL.md` directly** to understand how that skill works. These files describe intent, usage, and available commands.

## Architecture: Thin Skill Pattern

The codebase follows a **three-layer separation** pattern:

```
Starter (packages/<name>/)       -> npm publish -> dependency management + CLI entry
Skill   (packages/<name>/skill/) -> lythoskill build -> SKILL.md + thin scripts
Output  (skills/<name>/)         -> committed to Git -> final agent-visible skill
```

- **Starter**: The npm package (`@lythos/skill-creator`, `@lythos/skill-deck`, `@lythos/project-cortex`). Contains all implementation logic, dependencies, and CLI entry points. Agents do not read this code directly.
- **Skill**: Lives in `packages/<name>/skill/`. Contains only `SKILL.md` (intent description) and `scripts/` (thin routers that call `bunx <starter> <command>`). `SKILL.md` has no knowledge of dependencies.
- **Output**: The `skills/` directory contains the built output. **`skills/` is build output that must be committed to Git** so agent users can clone and use skills without building. It is also the standard discoverable directory structure for skill platforms (e.g. Vercel skills) to consume directly.

The `build` command (`src/build.ts`) copies from `packages/<name>/skill/` to `skills/<name>/`, filters out dev files (`__tests__`, `node_modules`, `.test.ts`, `.spec.ts`), validates that `SKILL.md` starts with YAML frontmatter (`---`), and substitutes template variables (`{{PACKAGE_NAME}}`, `{{BIN_NAME}}`, etc.) from the package's `package.json`.

## Code Conventions

1. **ESM-only**: No `require()`. Import JSON with assertions:
   ```typescript
   import pkg from '../package.json' with { type: 'json' }
   ```

2. **Built-in module prefix**: Always use `node:` prefix (`node:fs`, `node:path`).

3. **Zero external dependencies**: Core packages (`creator`, `project-cortex`) have no npm dependencies. Only `deck` uses `zod` and `@iarna/toml`.

4. **CLI style**: Parse with `process.argv.slice(2)`, route with simple `switch` statements. No CLI frameworks.

5. **Fence variable trick**: When generating content containing code blocks with backticks, use:
   ```typescript
   const fence = '`'.repeat(3)  // => '```'
   ```

6. **File permissions**: Generated shell scripts must be executable:
   ```typescript
   chmodSync(path, 0o755)
   ```

7. **tsconfig**: `moduleResolution` must be `"bundler"`, `types` includes `"bun-types"`, target `"esnext"`.

## Deck Governance

The `skill-deck.toml` file at repo root declares which skills are active. Sections: `innate` (always loaded), `tool` (available), `combo` (multi-skill combos), `transient` (time-bounded).

The `lythoskill-deck` tool reconciles the declared deck against the `skills/` cold pool by creating symlinks in `.claude/skills/` (the working set). It generates a `skill-deck.lock` file tracking the resolved state.

## Project Governance (Cortex)

Project documentation lives in `cortex/`:

```
cortex/
├── INDEX.md           <- Start here for self-described structure
├── adr/
│   └── 02-accepted/   <- Architecture Decision Records (see ADR-20260423101938000)
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

**Always use CLI commands to create governance documents** — do not create ADR/Epic/Task files manually. The CLI handles template alignment and correct timestamp IDs. Playground examples exist in `cortex/epics/` and `cortex/tasks/` but are reference-only.

**For full context on the project governance system, read `cortex/INDEX.md`.**

## Session Handoff Checklist

When a session is ending or context is about to compact, you MUST execute this handoff flow:

### Trigger Conditions (any one is sufficient)
- User says "LGTM", "就这样", "先到这里", "记录一下进度"
- Conversation exceeds 20 turns
- A milestone is completed (build succeeds, push to remote, tests pass)
- User says "换个 agent 继续" or "session 要结束了"

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

### Onboarding for New Agent

When entering this project with no prior context, read in this exact order:
1. `CLAUDE.md` (this file)
2. `daily/HANDOFF.md` (if exists) — single-file session handoff, highest priority memory
3. `daily/` history (recent 3 days) — project journal, work log across sessions
4. `skill-deck.toml`
5. `cortex/INDEX.md`
6. `git log --oneline -10`

**Memory bridge:** `.claude/memory/` is Claude Code's native user-level memory. `daily/` is the project's cross-CLI journal — it travels with the repo and can be read by any agent (Cursor, Windsurf, Kimi, etc.) through the skill system.

**All skill enhancements (hooks, templates, configs) are self-contained within each skill's `scripts/`, `references/`, or `assets/` directories. No external platform dependencies.**
