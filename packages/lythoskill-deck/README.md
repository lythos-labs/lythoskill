# @lythos/skill-deck

> Declarative skill deck governance. Reconcile declared skills against your cold pool via symlinks.

Part of the [lythoskill](https://github.com/lythos-labs/lythoskill) meta-skill ecosystem.

## What it does

Manages your agent's working set of skills. You declare which skills you want in `skill-deck.toml`; `deck link` creates symlinks from the cold pool to `.claude/skills/`. Supports deny-by-default isolation, max_cards budgeting, transient expiry, and managed directory overlap detection.

## Install

```bash
bun add -d @lythos/skill-deck
# or
bunx @lythos/skill-deck <command>
```

## Commands

```bash
# Link declared skills to working set
bunx @lythos/skill-deck link

# Link with custom deck file
bunx @lythos/skill-deck link --deck ./my-deck.toml

# Show current deck status
bunx @lythos/skill-deck status

# Migrate from old deck format
bunx @lythos/skill-deck migrate
```

## Architecture

This is the **Starter** layer of the thin-skill pattern. The agent-visible **Skill** layer lives in `packages/lythoskill-deck/skill/` and is built to `skills/lythoskill-deck/`.

## License

MIT
