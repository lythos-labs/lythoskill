# @lythos/hello-world

> The thinnest possible lythoskill skill. Zero scripts, just a SKILL.md. Use as a template when starting a new skill from scratch.

## Why

Not every skill needs a CLI, dependencies, or build steps. The thinnest possible skill is a single `SKILL.md` with YAML frontmatter — intent, usage, and constraints. No Starter layer, no npm package, no complexity.

This package demonstrates that minimal form. Use it as a starting point when you want to create a skill that is pure prompt engineering.

## Install

```bash
bun add -d @lythos/hello-world
# or use directly
bunx @lythos/hello-world <command>
```

## Quick Start

```bash
# Clone as a template
cp -r node_modules/@lythos/hello-world/skill ./skills/my-skill

# Or just read the SKILL.md to understand the pattern
cat node_modules/@lythos/hello-world/skill/SKILL.md
```

## Commands

This package has no CLI. It is a pure skill — a single `SKILL.md` file.

## Skill Documentation

This package is the **Starter** layer (CLI implementation).  
The agent-visible **Skill** layer documentation is here:  
[packages/lythoskill-hello-world/skill/SKILL.md](../../packages/lythoskill-hello-world/skill/SKILL.md)

## Architecture

Part of the [lythoskill](https://github.com/lythos-labs/lythoskill) ecosystem — the thin-skill pattern separates heavy logic (this npm package) from lightweight agent instructions (SKILL.md).

```
Starter (this package) → npm publish → bunx @lythos/hello-world ...
Skill   (packages/<name>/skill/)     → build → SKILL.md + thin scripts
Output  (skills/<name>/)             → git commit → agent-visible skill
```

## License

MIT
