# @lythos/skill-curator

> Read-only indexer for skill cold pools. Scans, extracts metadata, builds REGISTRY.json + catalog.db. Tracks decision history (additions.jsonl). Zero algorithmic recommendation — facts only.

## Why

As your skill ecosystem grows (GitHub trending, marketplace downloads, agent recommendations), you lose track of what you have and **why** you have it. `skill-curator` solves both:

- **REGISTRY.json + catalog.db**: Structured index of every skill in your cold pool
- **additions.jsonl**: Decision history — which feed discovered each skill, why you added it, arena results, fork lineage

**Need recommendation or ranking?** Use [Arena](https://github.com/lythos-labs/lythoskill/tree/main/packages/lythoskill-arena). Curator provides the data; Arena provides the comparison. Together they feed the agent's recommendation workflow.

## Install

```bash
bun add -d @lythos/skill-curator
# or use directly
bunx @lythos/skill-curator@0.9.21 <command>
```

## Quick Start

```bash
# Index your cold pool
bunx @lythos/skill-curator@0.9.21 ~/.agents/skill-repos

# Add a skill (with decision record)
bunx @lythos/skill-curator@0.9.21 add github.com/foo/bar-skill \
  --pool ~/.agents/skill-repos \
  --reason "LobeHub trending, claims web scraping"

# Fork an existing skill
bunx @lythos/skill-curator@0.9.21 add github.com/you/better-scraper \
  --pool ~/.agents/skill-repos \
  --forked-from github.com/foo/bar-skill \
  --reason "fork: fixed PDF extraction bug"

# Query the catalog
bunx @lythos/skill-curator@0.9.21 query "SELECT name, description FROM skills WHERE niches LIKE '%testing%'"
```

## Commands

```
Usage: lythoskill-curator [pool-path] [--output <dir>]
       lythoskill-curator add <github.com/owner/repo> --pool <dir> [--reason <text>] [--forked-from <locator>]
       lythoskill-curator query <SQL> [--db <path>]
       lythoskill-curator audit [--db <path>]
       lythoskill-curator restore [--output <dir>]

Commands:
  (no args)             Scan cold pool and build REGISTRY.json + catalog.db
  add <locator>         Download a skill to cold pool (no install, no deck.toml)
                          --pool <dir>         Cold pool path (required)
                          --reason <text>      Why this skill was added
                          --forked-from <loc>  Original skill if this is a fork
  query <SQL>           Query the catalog SQLite database (output: Markdown table)
  audit                 Run predefined checks and output an audit report
  restore               Roll back to the most recent backup

Options:
  --output, -o <dir>    Output directory (default: <pool>/.lythoskill-curator/)
  --pool <dir>          Cold pool path for add (required)
  --db, -d <path>       Database path for query/audit
```

## Architecture

Part of the [lythoskill](https://github.com/lythos-labs/lythoskill) ecosystem.

```
Feeds (LobeHub, GitHub, agentskill.sh)
        │
        ▼ curator add --pool --reason
Cold Pool (~/.agents/skill-repos/)
        │ curator scan
        ▼
Catalog (REGISTRY.json + catalog.db)  +  Decision History (additions.jsonl)
        │                                          │
        ▼                                          ▼
Agent LLM reasoning ──── Arena test play ──── Deck governance
(tiered recommendations)  (L3 buyer's review)  (deny-by-default)
```

See [references/architecture.md](./skill/references/architecture.md) for the full data flow and three-layer trust model.

## Skill Documentation

This package is the **Starter** layer (CLI implementation).
The agent-visible **Skill** layer documentation is here:
[packages/lythoskill-curator/skill/SKILL.md](../../packages/lythoskill-curator/skill/SKILL.md)

## License

MIT

<!-- test-stats -->
![pass](https://img.shields.io/badge/60_pass-0_fail-brightgreen) ![coverage](https://img.shields.io/badge/coverage-64%25-red)

```
File | % Funcs | % Lines | Uncovered Line #s
| --- | --- | --- |
All files | 69.44 | 63.61 |
 src/cli.ts | 25.00 | 14.14 | 42-44,48-55,133-208,214-232,240-261,265-289,295-318,322-360,366-381,387-409,413-446,450-541,554-642,656-659,663-716,722,726-754,758-807,856-857,868-869,871-903,905-921
 src/curator-core.ts | 100.00 | 98.24 | 201-202
 src/feed-adapters.ts | 83.33 | 78.46 | 61-66,99-106
```
<!-- /test-stats -->
