# @lythos/skill-arena

> Controlled-variable benchmark for AI agent skills. Compare skills, decks, or configurations on the same task — single-skill A/B or full-deck Pareto frontier analysis.

## Why

"Which skill is better?" is the wrong question. The right question is "which skill is better for what."

`skill-arena` scaffolds isolated environments where subagents complete the same task under different decks. A judge agent scores outputs across multiple dimensions. Supports:

- **Mode 1**: Single-skill comparison (controlled variable — same helper skills, different test skill).
- **Mode 2**: Full-deck comparison (Pareto frontier — no single winner, only optimal trade-offs).

## Install

```bash
bun add -d @lythos/skill-arena
# or use directly
bunx @lythos/skill-arena <command>
```

## Quick Start

```bash
# Mode 1: Compare two skills on the same task
bunx @lythos/skill-arena \
  --task "Generate auth flow diagram" \
  --skills "design-doc-mermaid,mermaid-tools" \
  --criteria "syntax,context,token"

# Mode 2: Compare full deck configurations
bunx @lythos/skill-arena \
  --task "Generate auth flow diagram" \
  --decks "./decks/minimal.toml,./decks/rich.toml" \
  --criteria "quality,token,maintainability"

# Visualize results
bunx @lythos/skill-arena viz tmp/arena-<id>/
```

## Commands

```
Usage: bunx @lythos/skill-arena <options> | bunx @lythos/skill-arena viz <dir>

Mode 1 — Single-Skill Comparison:
  --task, -t <desc>       Task description (required)
  --skills, -s <list>     Comma-separated skills, 2–5 (Mode 1)
  --criteria, -c <list>   Evaluation dimensions (default: syntax,context,logic,token)
  --control <skill>      Control skill (default: lythoskill-project-scribe)

Mode 2 — Full-Deck Comparison:
  --decks <paths>        Comma-separated deck toml paths, 2–5 (Mode 2)
  --criteria, -c <list>   Evaluation dimensions

Common:
  --dir, -d <path>       Arena parent directory (default: tmp)
  --project, -p <path>   Project root (default: .)

Viz:
  viz <dir>               Render ASCII charts from report.md
```

## Skill Documentation

This package is the **Starter** layer (CLI implementation).  
The agent-visible **Skill** layer documentation is here:  
[packages/lythoskill-arena/skill/SKILL.md](../../packages/lythoskill-arena/skill/SKILL.md)

## Architecture

Part of the [lythoskill](https://github.com/lythos-labs/lythoskill) ecosystem — the thin-skill pattern separates heavy logic (this npm package) from lightweight agent instructions (SKILL.md).

```
Starter (this package) → npm publish → bunx @lythos/skill-arena ...
Skill   (packages/<name>/skill/)     → build → SKILL.md + thin scripts
Output  (skills/<name>/)             → git commit → agent-visible skill
```

## License

MIT
