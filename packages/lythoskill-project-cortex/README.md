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
bunx @lythos/project-cortex@0.9.22 <command>
```

## Quick Start

```bash
# Initialize cortex directories
bunx @lythos/project-cortex@0.9.22 init

# Create governance documents
bunx @lythos/project-cortex@0.9.22 task "Fix login bug"
bunx @lythos/project-cortex@0.9.22 epic "User auth system"
bunx @lythos/project-cortex@0.9.22 adr "Choose database"

# Maintenance
bunx @lythos/project-cortex@0.9.22 index   # Regenerate INDEX.md
bunx @lythos/project-cortex@0.9.22 probe   # Check status consistency
bunx @lythos/project-cortex@0.9.22 list    # List all tasks and epics
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

## Jira Without Jira

Cortex is **Jira, but file-driven and git-native**. No server, no API, no sign-up. Just markdown files in your repo.

| Jira | Cortex |
|------|--------|
| Issue tracker | `cortex/tasks/` — timestamp-ID .md files |
| Epic | `cortex/epics/` — requirements + lane discipline |
| Decision log | `cortex/adr/` — architecture decisions with status |
| Confluence | `cortex/wiki/` — patterns, lessons, FAQ |
| JQL / dashboard | `bunx @lythos/project-cortex list` / `stats` / `probe` |
| Workflow automation | `.husky/post-commit` → `dispatch-trailers` |
| Sprint board | `cortex/INDEX.md` — auto-generated overview |

The key difference: Jira stores state in a database. Cortex stores state in **your git repo**. This means:
- Branch, merge, and diff your project governance
- CI/CD can read task status without API calls
- No vendor lock-in — your data is literally `cat`-able

## Commit-Driven Governance

State transitions are triggered by **git trailers** in commit messages. `cortex init` installs a `.husky/post-commit` hook that calls `dispatch-trailers` — parses trailers and auto-creates follow-up commits.

```bash
# Close a task from any status
git commit -m "feat(api): add endpoint

Closes: TASK-20260503010227902"

# Accept an ADR
git commit -m "docs(adr): accept database choice

ADR: ADR-20260503003315478 accept"

# Mark an epic as done
git commit -m "feat(cortex): finish dual-lane implementation

Epic: EPIC-20260503010218940 done"
```

The `.husky/pre-commit` hook prints a soft reminder when you have in-progress tasks.

### Hook Setup

```bash
# One-time: set up husky, then cortex init installs the hook
bunx husky init
bunx @lythos/project-cortex init
# → copies post-commit template to .husky/
```

## Epic Dual-Track

Epics use **dual-track lanes** to enforce focus:

- **`lane: main`** — Current iteration focus. Max 1 active epic. This is your "Workflowy zoom-in" — everything else is background noise.
- **`lane: emergency`** — Unavoidable urgent insert. Max 1 active epic. For genuinely blocking issues that cannot wait.

```bash
# Create a focused epic (will reject if main lane is full)
bunx @lythos/project-cortex@0.9.22 epic "User auth system" --lane main

# Override with reason (recorded in frontmatter)
bunx @lythos/project-cortex@0.9.22 epic "Hotfix login" --lane main --override "security incident"
```

Run `bunx @lythos/project-cortex@0.9.22 probe` to check lane occupancy and catch drift.

## Skill Documentation

This package is the **Starter** layer (CLI implementation).  
The agent-visible **Skill** layer documentation is here:  
[packages/lythoskill-project-cortex/skill/SKILL.md](../../packages/lythoskill-project-cortex/skill/SKILL.md)

## Architecture

Part of the [lythoskill](https://github.com/lythos-labs/lythoskill) ecosystem — the thin-skill pattern separates heavy logic (this npm package) from lightweight agent instructions (SKILL.md).

```
Starter (this package) → npm publish → bunx @lythos/project-cortex@0.9.22 ...
Skill   (packages/<name>/skill/)     → build → SKILL.md + thin scripts
Output  (skills/<name>/)             → git commit → agent-visible skill
```

## License

MIT
