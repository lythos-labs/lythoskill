# @lythos/skill-creator

> Scaffold and build lythoskill projects. The bootstrapping tool for thin-skill monorepos.

Part of the [lythoskill](https://github.com/lythos-labs/lythoskill) meta-skill ecosystem.

## What it does

Creates new lythoskill projects from scratch and builds individual skills for distribution.

## Install

```bash
bun add -d @lythos/skill-creator
# or
bunx @lythos/skill-creator <command>
```

## Commands

```bash
# Scaffold a new thin-skill monorepo
bunx @lythos/skill-creator init my-project

# Build a skill (copies packages/<name>/skill/ to skills/<name>/)
bunx @lythos/skill-creator build <skill-name>
```

## Architecture

This is the **Starter** layer of the thin-skill pattern:

```
Starter (this package) → npm publish → bunx @lythos/skill-creator ...
Skill   (packages/<name>/skill/)     → lythoskill build → SKILL.md + thin scripts
Output  (skills/<name>/)             → committed to Git → agent-visible skill
```

## License

MIT
