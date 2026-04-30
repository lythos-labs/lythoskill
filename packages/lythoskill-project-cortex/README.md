# @lythos/project-cortex

> GTD-style project governance for AI agent workflows. ADR, Epic, Task, Wiki — timestamp-ID based, machine-parseable, CLI-driven.

## Why

AI agents excel at execution but have no memory across sessions. `project-cortex` brings structured project governance to agent-driven development:

- **Epic** (WHY): Why a feature exists. Requirement origin.
- **ADR** (HOW): How technical decisions were made.
- **Task** (WHAT): Specific executable work.
- **Wiki**: Reusable knowledge after tasks succeed.

All documents use timestamp IDs (e.g., `TASK-20250420120000000`) — collision-free, self-sorting, no central database.

## Install

```bash
bun add -d @lythos/project-cortex
# or use directly
bunx @lythos/project-cortex <command>
```

## Quick Start

```bash
# Initialize cortex directories
bunx @lythos/project-cortex init

# Create governance documents
bunx @lythos/project-cortex task "Fix login bug"
bunx @lythos/project-cortex epic "User auth system"
bunx @lythos/project-cortex adr "Choose database"

# Maintenance
bunx @lythos/project-cortex index   # Regenerate INDEX.md
bunx @lythos/project-cortex probe   # Check status consistency
bunx @lythos/project-cortex list    # List all tasks and epics
```

## Commands

```
📋 lythoskill-project-cortex — Project management CLI

Commands:
  init                  Initialize cortex workflow directories
  task "<title>"        Create a new Task
  epic "<title>"        Create a new Epic
  adr "<title>"         Create a new ADR
  list                  List all tasks and epics
  stats                 Show project statistics
  next-id               Display timestamp ID format example
  index                 Generate INDEX.md and wiki/INDEX.md
  index wiki            Generate wiki/INDEX.md only
  probe                 Check status consistency (dir vs Status History)
```

## Skill Documentation

This package is the **Starter** layer (CLI implementation).  
The agent-visible **Skill** layer documentation is here:  
[packages/lythoskill-project-cortex/skill/SKILL.md](../../packages/lythoskill-project-cortex/skill/SKILL.md)

## Architecture

Part of the [lythoskill](https://github.com/lythos-labs/lythoskill) ecosystem — the thin-skill pattern separates heavy logic (this npm package) from lightweight agent instructions (SKILL.md).

```
Starter (this package) → npm publish → bunx @lythos/project-cortex ...
Skill   (packages/<name>/skill/)     → build → SKILL.md + thin scripts
Output  (skills/<name>/)             → git commit → agent-visible skill
```

## License

MIT
