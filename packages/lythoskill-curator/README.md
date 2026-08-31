# @lythos/skill-curator

> Read-only indexer for skill cold pools. Scans, extracts metadata, builds REGISTRY.json + catalog.db. Tracks decision history (additions.jsonl). Zero algorithmic recommendation — facts only.

## Why

As your skill ecosystem grows (GitHub trending, marketplace downloads, agent recommendations), you lose track of what you have and **why** you have it. `skill-curator` solves both:

- **REGISTRY.json + catalog.db**: Structured index of every skill in your cold pool
- **additions.jsonl**: Decision history — why you added each skill, arena results, fork lineage

**Need recommendation or ranking?** Use [Arena](https://github.com/lythos-labs/lythoskill/tree/main/packages/lythoskill-arena). Curator provides the data; Arena provides the comparison. Together they feed the agent's recommendation workflow.

## Install

```bash
bun add -d @lythos/skill-curator
# or use directly
bunx @lythos/skill-curator@0.19.0 <command>
```

## Quick Start

```bash
# Scan cold pool and build index
bunx @lythos/skill-curator@0.19.0

# Add a skill (with decision record)
bunx @lythos/skill-curator@0.19.0 add github.com/foo/bar-skill \
  --pool ~/.agents/skill-repos \
  --reason "LobeHub trending, claims web scraping"

# Fork an existing skill
bunx @lythos/skill-curator@0.19.0 add github.com/you/better-scraper \
  --pool ~/.agents/skill-repos \
  --forked-from github.com/foo/bar-skill \
  --reason "fork: fixed PDF extraction bug"

# Query the catalog
bunx @lythos/skill-curator@0.19.0 query "SELECT name, description FROM skills WHERE niches LIKE '%testing%'"
```

## Commands

```
Usage: lythoskill-curator [pool-path] [--output <dir>]
       lythoskill-curator add <github.com/owner/repo> --pool <dir> [--reason <text>] [--forked-from <locator>] [--branch <name>] [--full]
       lythoskill-curator query <SQL> [--db <path>]
       lythoskill-curator audit [--db <path>]
       lythoskill-curator restore [--output <dir>]
       lythoskill-curator tag <skill-name> --niche <value> [--qa <json>] [--db <path>]
       lythoskill-curator refresh-plan [--pool <dir>]
       lythoskill-curator refresh-execute [--pool <dir>]

Commands:
  (no args)             Scan cold pool and build REGISTRY.json + catalog.db
  add <locator>         Download a skill to cold pool (no install, no deck.toml)
                          --pool <dir>         Cold pool path (required)
                          --reason <text>      Why this skill was added
                          --forked-from <loc>  Original skill if this is a fork
                          --branch <name>      Specific branch (default: default branch)
                          --full               Full clone (default: --depth 1 shallow)
  find <bare-name>      Look up a skill by bare name (HIT: path + deck add; MISS: search guidance)
  query <SQL>           Query the catalog SQLite database (output: Markdown table)
  audit                 Run predefined checks and output an audit report
  restore               Roll back to the most recent backup
  tag <skill-name>      Write agent-enriched metadata to indexed skill
                          --niche <value>      Niche tag (repeatable)
                          --qa <json>          QA signal: {"source_type":"self/arena","signal_value":8,...}
                          --db, -d <path>      Database path
  refresh-plan          Scan cold pool for upstream updates, write TODO plan
                          --pool <dir>         Cold pool path (default: ~/.agents/skill-repos)
  refresh-execute       Pull behind repos one by one
                          --pool <dir>         Cold pool path (default: ~/.agents/skill-repos)

Options:
  --output, -o <dir>    Output directory (default: <pool>/.lythoskill-curator/)
  --pool <dir>          Cold pool path (default: ~/.agents/skill-repos)
  --db, -d <path>       Database path for find/query/audit
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
[packages/lythoskill-curator/skill/SKILL.md](https://github.com/lythos-labs/lythoskill/blob/main/packages/lythoskill-curator/skill/SKILL.md)

## License

MIT


