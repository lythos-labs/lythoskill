# @lythos/skill-curator

> Read-only indexer for skill cold pools. Scans, extracts metadata, builds REGISTRY.json + catalog.db. Zero algorithmic recommendation — facts only.

## Why

As your skill ecosystem grows (GitHub trending, awesome lists, marketplace downloads), you lose track of what you have. `skill-curator` scans your cold pool, extracts YAML frontmatter from every SKILL.md, and produces structured indices:

- **REGISTRY.json**: Complete skill index with name, description, triggers, niche, managed dirs.
- **catalog.db**: SQLite database for structured querying.

**Zero algorithmic recommendation.** The CLI never says "use A instead of B." It says "A and B both exist, here are their attributes." The *agent* (reading SKILL.md + project context) combines index data with situational awareness to make informed recommendations.

## Install

```bash
bun add -d @lythos/skill-curator
# or use directly
bunx @lythos/skill-curator <command>
```

## Quick Start

```bash
# Index your cold pool (default: ~/.agents/skill-repos)
bunx @lythos/skill-curator

# Query the catalog with SQL
bunx @lythos/skill-curator query "SELECT name, description FROM skills WHERE niche LIKE '%documentation%'"
```

## Commands

```
Usage: lythoskill-curator [pool-path] [--output <dir>]
       lythoskill-curator query <SQL> [--db <path>]

Commands:
  (no args)             Scan cold pool and build REGISTRY.json + catalog.db
  query <SQL>           Query the catalog SQLite database

Options:
  --output, -o <dir>    Output directory (default: <pool>/.lythoskill-curator/)
  --db, -d <path>       Database path for query subcommand
```

## Skill Documentation

This package is the **Starter** layer (CLI implementation).  
The agent-visible **Skill** layer documentation is here:  
[packages/lythoskill-curator/skill/SKILL.md](../../packages/lythoskill-curator/skill/SKILL.md)

## Architecture

Part of the [lythoskill](https://github.com/lythos-labs/lythoskill) ecosystem — the thin-skill pattern separates heavy logic (this npm package) from lightweight agent instructions (SKILL.md).

```
Starter (this package) → npm publish → bunx @lythos/skill-curator ...
Skill   (packages/<name>/skill/)     → build → SKILL.md + thin scripts
Output  (skills/<name>/)             → git commit → agent-visible skill
```

## License

MIT
