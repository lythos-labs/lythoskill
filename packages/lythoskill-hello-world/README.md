# @lythos/hello-world

> The thinnest possible lythoskill skill. A single SKILL.md and a one-line sanity-check CLI. Use as a template when starting a new skill from scratch.

## Why

Not every skill needs complex logic, dependencies, or build steps. The thinnest possible skill is a single `SKILL.md` with YAML frontmatter — intent, usage, and constraints. This package demonstrates that minimal form and adds a trivial CLI for sanity-checking your toolchain.

## Install

```bash
bun add -d @lythos/hello-world
# or use directly
bunx @lythos/hello-world@0.9.17
```

## Quick Start

```bash
# Sanity-check: does the thin-skill ecosystem work?
bunx @lythos/hello-world@0.9.17
# → ✅ Hello from lythoskill-hello-world! The thin-skill ecosystem works.

# Use the SKILL.md as a template for your own skill
cp -r node_modules/@lythos/hello-world/skill ./skills/my-skill
```

## Commands

| Command | Description |
|---------|-------------|
| (no args) | Prints a sanity-check confirmation message |

## Skill Documentation

This package is primarily a **Skill** layer template — the agent-visible documentation is here:  
[packages/lythoskill-hello-world/skill/SKILL.md](../../packages/lythoskill-hello-world/skill/SKILL.md)

The CLI exists only as a minimal smoke test. The real value is the `SKILL.md` structure.

## Architecture

Part of the [lythoskill](https://github.com/lythos-labs/lythoskill) ecosystem. This is the thinnest possible complete package — it has a Starter layer (the one-line CLI) and a Skill layer (the `SKILL.md`), but both are intentionally minimal.

## License

MIT
