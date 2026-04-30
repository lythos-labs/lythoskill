# Red-Green Release

> User-acceptance-driven release workflow using heredoc patch files. No tag without explicit user LGTM.

## Overview

This is a pure **Skill** layer package — no Starter (npm package), no CLI, no dependencies. It consists of a single `SKILL.md` and optional reference files that agent platforms read directly.

## Usage

Add to your `skill-deck.toml`:

```toml
[tool]
skills = ["lythoskill-red-green-release"]
```

Then run `bunx @lythos/skill-deck link` to activate.

## Skill Documentation

[packages/lythoskill-red-green-release/skill/SKILL.md](../../packages/lythoskill-red-green-release/skill/SKILL.md)

## Architecture

Part of the [lythoskill](https://github.com/lythos-labs/lythoskill) ecosystem. This package has no npm publish step — the Skill layer is the entire package.

## License

MIT
