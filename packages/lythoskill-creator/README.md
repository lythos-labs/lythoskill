# @lythos/skill-creator

> Scaffold and build lythoskill projects — thin-skill monorepos where heavy logic lives in npm packages and skills are lightweight routers.

## Why

AI agent skills are code, and code deserves real tooling. lythoskill separates concerns into three layers:

- **Starter** (npm package): Heavy logic, dependencies, CLI entry points.
- **Skill** (`packages/<name>/skill/`): Thin SKILL.md + scripts that call the starter via `bunx`.
- **Output** (`skills/<name>/`): Build output committed to Git, visible to agents without building.

This package is the Starter layer that scaffolds new projects and builds skills for distribution.

## Install

```bash
bun add -d @lythos/skill-creator
# or use directly
bunx @lythos/skill-creator@0.9.16 <command>
```

## Quick Start

```bash
# Scaffold a new thin-skill monorepo
bunx @lythos/skill-creator@0.9.16 init my-project

# Add a new skill to an existing monorepo
cd my-project
bunx @lythos/skill-creator@0.9.16 add-skill my-new-skill

# Build a skill (copies skill/ to skills/ with template substitution)
bunx @lythos/skill-creator@0.9.16 build my-new-skill

# Audit an existing project against current conventions
bunx @lythos/skill-creator@0.9.16 align
# Auto-fix drift where possible
bunx @lythos/skill-creator@0.9.16 align --fix
```

## Commands

```
@lythos/skill-creator — thin skill scaffolder

Commands:
  init <name>       Create a new lythoskill project
  add-skill <name>  Add a new skill to an existing monorepo
  build <skill>     Build a skill for distribution
  align [path]      Audit project against current conventions (--fix to auto-correct)
```

## Skill Documentation

This package is the **Starter** layer (CLI implementation).  
The agent-visible **Skill** layer documentation is here:  
[packages/lythoskill-creator/skill/SKILL.md](../../packages/lythoskill-creator/skill/SKILL.md)

## Architecture

Part of the [lythoskill](https://github.com/lythos-labs/lythoskill) ecosystem — the thin-skill pattern separates heavy logic (this npm package) from lightweight agent instructions (SKILL.md).

```
Starter (this package) → npm publish → bunx @lythos/skill-creator@0.9.16 ...
Skill   (packages/<name>/skill/)     → build → SKILL.md + thin scripts
Output  (skills/<name>/)             → git commit → agent-visible skill
```

## License

MIT
