# @lythos/project-cortex

> GTD-style project governance for AI agent workflows. ADR, Epic, Task, Wiki — timestamp-ID based, machine-parseable.

Part of the [lythoskill](https://github.com/lythos-labs/lythoskill) meta-skill ecosystem.

## What it does

Provides structured project documentation for agent-driven development. All documents use timestamp IDs (e.g. `TASK-20250420120000000`) for collision-free tracking without a central database.

## Install

```bash
bun add -d @lythos/project-cortex
# or
bunx @lythos/project-cortex <command>
```

## Commands

```bash
# Create governance documents (always use CLI — ensures correct timestamp IDs)
bunx @lythos/project-cortex task "Fix login bug"
bunx @lythos/project-cortex epic "User auth system"
bunx @lythos/project-cortex adr "Choose database"

# Maintenance
bunx @lythos/project-cortex index   # Regenerate INDEX.md and wiki/INDEX.md
bunx @lythos/project-cortex probe   # Check status consistency
bunx @lythos/project-cortex list    # List all tasks and epics
bunx @lythos/project-cortex stats   # Show statistics
```

## Architecture

This is the **Starter** layer of the thin-skill pattern. Documents live in `cortex/` under your project root. The agent-visible **Skill** layer is in `packages/lythoskill-project-cortex/skill/`.

## License

MIT
