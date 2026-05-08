# Deck: Declarative Skill Governance

> **What it does:** Installs skills, enforces deny-by-default, reconciles drift.
> **The analogy:** `npm install` + `package.json` for agent skills.

## The Problem

You discover 4 great skills. You install them. Then you discover 4 more. Then a teammate installs 3 more. Soon your agent sees 50+ skills, some conflicting, some stale. You don't know which ones are actually used.

## What Deck Solves

```toml
# skill-deck.toml — the single source of truth
[deck]
max_cards = 10
working_set = ".claude/skills"
cold_pool = "~/.agents/skill-repos"

[tool.skills.tdd]
path = "github.com/mattpocock/skills/skills/engineering/tdd"

[tool.skills.mermaid]
path = "github.com/SpillwaveSolutions/skills/mermaid"
```

One command: `deck link`. Only the declared 2 skills exist in `.claude/skills/`. Everything else is **gone**.

## Quick Tour

### Install a skill

```bash
bunx @lythos/skill-deck@latest add github.com/mattpocock/skills/skills/engineering/tdd
# → Clones to cold pool → appends to skill-deck.toml → creates symlink
```

### See what you have

```bash
bunx @lythos/skill-deck@latest link
# → Syncs working set. Removes undeclared skills.
```

### Check for drift

```bash
bunx @lythos/skill-deck@latest reconcile
# → Compares lock file vs actual cold pool state
# → Reports: missing, behind, extra
# → --apply to auto-converge
```

### Pin a version (snapshot mode)

```bash
bunx @lythos/skill-deck@latest freeze tdd
# → Symlink → real directory (pinned to current HEAD)
```

## Core Concepts

| Concept | What it is |
|---------|------------|
| **Cold Pool** | `~/.agents/skill-repos/` — canonical storage. Agent can't see it. |
| **Working Set** | `.claude/skills/` — the subset the agent sees. Deck controls it. |
| **Deny-by-default** | Undeclared = physically absent. Not hidden, not disabled. |
| **skill-deck.lock** | Frozen snapshot of desired state. Used by `reconcile` for drift detection. |

## Cross-Platform

One deck, multiple agents:

```toml
working_set = ".claude/skills"    # Claude Code
working_set = ".cursor/skills"    # Cursor
working_set = ".agents/skills"    # Codex CLI, OpenClaw
```

See the [deck README](../../packages/lythoskill-deck/README.md) for platform-specific guides.
