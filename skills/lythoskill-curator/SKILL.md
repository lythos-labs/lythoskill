---
name: lythoskill-curator
version: 0.3.0
description: |
  Read-only indexer for skill cold pools. Scans all local skill  directories, extracts SKILL.md frontmatter, and produces
  REGISTRY.json + catalog.db for structured querying. Does not  install, modify, or recommend skills — only surfaces what exists.
when_to_use: |
  List all skills, what skills do I have, scan skill pool, skill index,  discover skills, update skill index, search skills, find a skill for X,  recommend a deck, catalog skills, explore cold pool.
allowed-tools:
  - Bash(bunx @lythos/skill-curator *)
# ── deck governance metadata (consumed by lythoskill tooling only) ──
deck_niche: meta.curation.deck-discovery
deck_managed_dirs:
  - ~/.agents/lythos/skill-curator/
---

# Skill Curator
> Read-only observer. Scans cold pools, indexes frontmatter, outputs structured data.
> Think of it as a librarian — catalogs every book on the shelf but never decides what you should read.
## Why Separate Indexing from Recommendation
Curator CLI produces **facts** (what skills exist, their metadata, their niches).
Recommendation requires **project context** (tech stack, team habits, current phase)
that only the agent + conversation can provide.

Hardcoding recommendations as keyword-matching (TF-IDF, domain boost) captures surface
similarity but misses causal chains: "project-cortex produces structured ADRs;
repomix-handoff consumes them — they form a producer-consumer pair." Only LLM reasoning
discovers these patterns. So curator stays pure data, agent does inference.

## Commands
### Index the cold pool
```bash
# Scan and produce REGISTRY.json + catalog.db
bunx @lythos/skill-curator [POOL_PATH]

# Defaults:
#   POOL_PATH = ~/.agents/skill-repos
#   Output    = {POOL_PATH}/.lythoskill-curator/
#
# Custom output:
bunx @lythos/skill-curator ~/.agents/skill-repos --output ~/.agents/lythos/skill-curator/
```

### Query the index
```bash
# SQL query → JSON array (LLM-consumable)
bunx @lythos/skill-curator query "SELECT name, type FROM skills WHERE description LIKE '%diagram%'"
# Specify db path
bunx @lythos/skill-curator query --db ./catalog.db "SELECT * FROM catalog_meta"
# Inspect table structure
bunx @lythos/skill-curator query "PRAGMA table_info(skills)"
```

Output is always a JSON array — agent can parse directly.

### Typical queries
```bash
# Same-niche skills (potential conflicts for deck)
bunx @lythos/skill-curator query "SELECT name, niches FROM skills WHERE niches LIKE '%report%'"
# Managed directory overlaps
bunx @lythos/skill-curator query "SELECT name, managed_dirs FROM skills WHERE managed_dirs LIKE '%cortex/%'"
# Duplicate detection (same name, different sources)
bunx @lythos/skill-curator query \
  "SELECT name, path FROM skills WHERE name IN (SELECT name FROM skills GROUP BY name HAVING COUNT(*) > 1)"
```

## Curator + Deck Workflow
```
curator scan → catalog.db          "What do I have?"
    ↓
agent queries + project context    "What should I use?"       (LLM reasoning)    ↓
agent edits skill-deck.toml        "Declare desired state"
    ↓
deck link                          "Enforce it"
    ↓
arena (optional)                   "Verify it"
```

Curator does **not**: score, rank, recommend, modify toml, or download skills.
Curator does: turn "192 local skills" into structured, queryable data in milliseconds.
## Gotchas
**Index freshness**: Query stderr shows when the index was generated. If older than
7 days, curator warns you to re-scan. Stale indexes miss newly cloned skills.

**catalog.db not found**: If querying before scanning, CLI prints which paths it
searched and suggests the scan command. Don't create the db manually.
**JSON array fields**: `niches`, `managed_dirs`, `trigger_phrases` are stored as
JSON strings in SQLite. Use `json_extract()` for element access:
```sql
SELECT name, json_extract(niches, '$[0]') AS primary_niche FROM skills;
```
**Deterministic output**: Same cold pool always produces the same REGISTRY.json
(sorted, stable). Safe to diff across scans for drift detection.
## Supporting References
Read these **only when the specific topic arises**:
| When you need to… | Read |
|--------------------|------|
| Understand the REGISTRY.json schema and field meanings | [references/registry-schema.md](./references/registry-schema.md) |
| Write SQL queries against catalog.db | [references/catalog-db.md](./references/catalog-db.md) |
| Build a recommendation from the index (agent workflow) | [references/recommendation-workflow.md](./references/recommendation-workflow.md) |
| Identify skill combination patterns (pipeline, modality…) | [references/combination-patterns.md](./references/combination-patterns.md) |
| Understand curator's design principles | [references/design-principles.md](./references/design-principles.md) |
