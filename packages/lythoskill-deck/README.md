# @lythos/skill-deck

> Declarative skill deck governance for AI agents. Reconcile declared skills against your cold pool via symlinks — deny-by-default, max-cards budgeting, transient expiry.

## Why

When an AI agent has access to 50+ skills, context window pollution and silent conflicts become real problems. Two skills claiming the same niche, redundant descriptions, incompatible assumptions — all invisible until the agent hallucinates.

`skill-deck.toml` solves this by declaring *exactly* which skills the agent should see. `deck link` creates symlinks from the cold pool to `.claude/skills/` and **removes everything else**. Deny-by-default means undeclared skills physically do not exist in the agent's view.

## Install

```bash
bun add -d @lythos/skill-deck
# or use directly
bunx @lythos/skill-deck <command>
```

## Quick Start

```bash
# 1. Create a skill-deck.toml
cat > skill-deck.toml << 'EOF'
[deck]
max_cards = 10

[tool]
skills = ["lythoskill-deck"]
EOF

# 2. Link — creates symlinks in .claude/skills/
bunx @lythos/skill-deck link
```

## Commands

```
lythoskill-deck — Declarative skill deck governance — cold pool, working set, deny-by-default

Usage: lythoskill-deck link | lythoskill-deck validate [deck.toml]

Commands:
  link                  Sync working set with skill-deck.toml
  validate [deck.toml]  Validate deck configuration

Options:
  --deck <path>    Specify skill-deck.toml path
  --workdir <dir>  Specify working directory
```

## Key Concepts

| Concept | One-liner |
|---------|-----------|
| **Cold Pool** | All downloaded skills (`~/.agents/skill-repos/`). Agent cannot see here. |
| **skill-deck.toml** | Declares desired state: "this project uses these skills." |
| **`deck link`** | Reconciler. Makes `.claude/skills/` match the declaration. |
| **Working Set** | `.claude/skills/` — symlinks only. What the agent actually scans. |
| **deny-by-default** | Undeclared skills are physically absent from the working set. |

## Skill Documentation

This package is the **Starter** layer (CLI implementation).  
The agent-visible **Skill** layer documentation is here:  
[packages/lythoskill-deck/skill/SKILL.md](../../packages/lythoskill-deck/skill/SKILL.md)

## Architecture

Part of the [lythoskill](https://github.com/lythos-labs/lythoskill) ecosystem — the thin-skill pattern separates heavy logic (this npm package) from lightweight agent instructions (SKILL.md).

```
Starter (this package) → npm publish → bunx @lythos/skill-deck ...
Skill   (packages/<name>/skill/)     → build → SKILL.md + thin scripts
Output  (skills/<name>/)             → git commit → agent-visible skill
```

## License

MIT
