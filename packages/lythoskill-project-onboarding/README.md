# Project Onboarding

> Session context loader. Reads the latest daily handoff to restore project context without redundant file exploration.

## Overview

This is a pure **Skill** layer package — no Starter (npm package), no CLI, no dependencies. It consists of a single `SKILL.md` and optional reference files that agent platforms read directly.

## Usage

Add to your `skill-deck.toml`:

```toml
[tool]
skills = ["lythoskill-project-onboarding"]
```

Then run `bunx @lythos/skill-deck link` to activate.

## Skill Documentation

[packages/lythoskill-project-onboarding/skill/SKILL.md](../../packages/lythoskill-project-onboarding/skill/SKILL.md)

## Architecture

Part of the [lythoskill](https://github.com/lythos-labs/lythoskill) ecosystem. This package has no npm publish step — the Skill layer is the entire package.

## License

MIT
