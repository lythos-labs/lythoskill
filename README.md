# lythoskill

> Self-bootstrapping thin-skill monorepo scaffolding for AI agent skills.
>
> Greek: λίθος (stone) + skill — simple, hard, stackable.

**English** | [中文](./AGENTS.md)

## What is lythoskill

AI agent skills have a structural tension:

- **Development** needs full monorepo experience (dependencies, testing, type checking)
- **Release** needs minimal footprint (SKILL.md + thin scripts, context-window sensitive)

lythoskill solves this with the **Thin Skill Pattern** — three-layer separation:

```
Starter (packages/<name>/)       → npm publish → implementation + CLI
Skill   (packages/<name>/skill/) → lythoskill build → SKILL.md + thin scripts
Output  (skills/<name>/)         → committed to Git → agent-visible skill
```

- **Starter**: npm package with all logic, dependencies, and CLI entry
- **Skill**: Only SKILL.md + scripts/ (thin routers calling `bunx <starter>`)
- **Output**: `skills/` directory — committed build output, clone-and-use

## Install Skills

### Via skills.sh (Vercel)

```bash
# Install all skills globally
npx skills add lythos-labs/lythoskill -g --all

# Install specific skill
npx skills add lythos-labs/lythoskill -g --skill lythoskill-creator
npx skills add lythos-labs/lythoskill -g --skill lythoskill-deck
npx skills add lythos-labs/lythoskill -g --skill lythoskill-project-cortex

# List available skills
npx skills add lythos-labs/lythoskill -l
```

### Via git clone

```bash
git clone https://github.com/lythos-labs/lythoskill.git ~/.claude/skills/lythoskill
# Or clone to any path and symlink skills/ into your agent's skill directory
```

## Available Skills

| Skill | Description | Type |
|-------|-------------|------|
| **lythoskill-creator** | Scaffold and build lythoskill projects (`init`, `build`) | Core |
| **lythoskill-deck** | Declarative skill deck governance (`link`, `status`, `migrate`) | Core |
| **lythoskill-project-cortex** | GTD-style project management (ADR/Epic/Task/Wiki) | Core |
| **lythoskill-hello-world** | Minimal zero-script skill example | Demo |

## Quick Start

```bash
# Scaffold a new lythoskill project
bunx @lythos/skill-creator init my-project

# Build a skill after editing
bunx @lythos/skill-creator build my-skill

# Sync skill deck (declarative working set)
bunx @lythos/skill-deck link

# Create project governance documents
bunx @lythos/project-cortex task "Fix login bug"
bunx @lythos/project-cortex epic "User auth system"
bunx @lythos/project-cortex adr "Choose database"
```

## Architecture

### Thin Skill Pattern

```
┌─────────────────────────────────────────────────────────┐
│                    THIN SKILL PATTERN                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Starter (packages/<name>/)        → npm publish       │
│  ├── Dependency management (zod, toml, etc.)            │
│  ├── CLI entry point (src/cli.ts)                       │
│  └── Implementation logic (src/*.ts)                    │
│                                                         │
│  Skill (packages/<name>/skill/)    → lythoskill build  │
│  ├── SKILL.md (intent + usage instructions)             │
│  └── scripts/ (thin routers: bunx <starter> <cmd>)    │
│                                                         │
│  Output (skills/<name>/)           → release/commit    │
│  ├── SKILL.md (agent-visible)                           │
│  └── scripts/ (final)                                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Analogy**: Skill ≈ Spring Controller (routing layer), npm package ≈ Spring Service (implementation layer), Starter ≈ Spring Boot Starter (BOM + CLI entry).

### Deck Governance

```
skills/ (cold pool: all skills in repo)
  ├── lythoskill-creator/
  ├── lythoskill-deck/
  ├── lythoskill-project-cortex/
  └── lythoskill-hello-world/

skill-deck.toml (declaration: which skills are active)
  ├── innate: always loaded
  ├── tool: available
  └── combo: multi-skill combinations

.claude/skills/ (working set: symlinks to cold pool)
  └── agent scans here
```

### Project Governance (Cortex)

```
cortex/
├── adr/        Architecture Decision Records
├── epics/      Requirement tracking
├── tasks/      Execution cards
└── wiki/       Reusable patterns
```

Timestamp-based IDs: `TASK-20250420120000000` — collision-free, no central database.

## Development

```bash
# Direct execution (no build step, Bun runs TypeScript natively)
bun packages/lythoskill-creator/src/cli.ts init my-test
bun packages/lythoskill-creator/src/cli.ts build lythoskill-deck

# Run deck scenario tests
bun packages/lythoskill-deck/test/runner.ts

# Regenerate project index
bun packages/lythoskill-project-cortex/src/cli.ts index
```

## Tech Stack

| Layer | Choice |
|-------|--------|
| Runtime | **Bun** (native TypeScript) |
| Language | **TypeScript** |
| Module System | **ESM-only** (`"type": "module"`) |
| Package Manager | **pnpm** workspaces |
| External Deps | **Zero** for core (only `node:fs`, `node:path`) |

## Project Documents

| Document | Purpose |
|----------|---------|
| [CLAUDE.md](./CLAUDE.md) | Guidance for Claude Code when working in this repo |
| [AGENTS.md](./AGENTS.md) | 中文版项目说明（面向 AI coding agent） |
| [cortex/INDEX.md](./cortex/INDEX.md) | Self-described governance system entry |
| [skill-deck.toml](./skill-deck.toml) | Active skill declaration |

## License

Proprietary
