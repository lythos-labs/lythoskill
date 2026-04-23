# @lythos/skill-curator

> Read-only observer for skill cold pools. Discover combos, recommend decks, audit your skill ecosystem.

Part of the [lythoskill](https://github.com/lythos-labs/lythoskill) meta-skill ecosystem.

## What it does

Scans a directory of skill repositories, extracts metadata from `SKILL.md` frontmatter, builds indices, and produces tiered recommendations (Core / Force Multiplier / Optional). Also discovers synergy patterns: Pipeline, Modality Stack, Orchestrator-Engine, Directory Synergy.

**Never modifies any skill.** Read-only forever.

## Install

```bash
bun add -d @lythos/skill-curator
# or
bunx @lythos/skill-curator <args>
```

## Commands

```bash
# Index your cold pool (default: ~/.agents/skill-repos)
bunx @lythos/skill-curator [POOL_PATH]

# Get recommendations for a task
bunx @lythos/skill-curator [POOL_PATH] --recommend "Plan a feature with ADR and diagrams"

# Verbose audit mode: full scoring trail
bunx @lythos/skill-curator [POOL_PATH] --recommend "..." --verbose
```

## Output

- `POOL_PATH/.cortex/skill-curator/REGISTRY.json` — full skill index
- `POOL_PATH/.cortex/skill-curator/RECOMMENDATIONS.json` — scored results + combos

## Architecture

This is the **Starter** layer of the thin-skill pattern. The agent-visible **Skill** layer is in `packages/lythoskill-curator/skill/`.

## License

MIT
