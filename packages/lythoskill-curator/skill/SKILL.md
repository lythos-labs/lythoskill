---
name: lythoskill-curator
version: {{PACKAGE_VERSION}}
type: standard
description: |
  Skill discovery engine. Scans your local cold pool (~/.agents/skill-repos),
  indexes all SKILL.md frontmatter into REGISTRY.json + catalog.db, and lets you
  query by type, niche, source, or keyword. The CLI is a dumb indexer — YOU are
  the smart agent who combines curator data with web search, deep research, and
  project context to make recommendations. Reconciler-style: any filesystem state
  → scan → converges to clean index. Auto-backs up old index; rollback via `restore`.
when_to_use: |
  Find a skill for X, search skills, what skills do I have, list all skills,
  catalog skills, explore cold pool, scan skill pool, skill index, update index,
  recommend a deck, is there a skill for Y, discover skills, cold pool query,
  skill lookup, what's available, curator query, curator scan, curator audit.
  ALSO trigger when user wants to do a task and you need to find the right skill:
  web-search for candidates → curator check if already in cold pool →
  curator query for similar skills by niche → recommend with confidence.
allowed-tools:
  - Bash(bunx @lythos/skill-curator@{{PACKAGE_VERSION}} *)
  - WebSearch
  - WebFetch
# ── deck governance metadata (consumed by lythoskill tooling only) ──
deck_niche: meta.curation
deck_managed_dirs:
  - ~/.agents/lythoskill/curator/
---

# Skill Curator
> Smart agent, dumb tool. Curator indexes what exists — YOU decide what's good.
> The CLI catalogs every skill on the shelf. The agent (that's you) does the thinking.

## How Recommendation Actually Works

Curator CLI is intentionally dumb — it produces **facts** (what skills exist, their
metadata, their niches). The **agent** combines these facts with project context,
web search, and deep research to make real recommendations.

**The full discovery workflow (agent does all of this):**
```
1. WebSearch for skill candidates            ← agent superpower
2. curator query "SELECT * FROM skills       ← check what's already in cold pool
   WHERE name LIKE '%security%'"
3. curator query "SELECT * FROM skills       ← find similar skills by niche
   WHERE niches LIKE '%audit%'"
4. Arena single --deck qa-sweep.toml         ← test before adopting
5. Deck add <locator>                        ← add to project deck
```

**Why not hardcode recommendations in the CLI?** Keyword-matching (TF-IDF, domain boost)
captures surface similarity but misses causal chains: "project-cortex produces structured
ADRs; repomix-handoff consumes them — they form a producer-consumer pair." Only LLM
reasoning discovers these patterns. The CLI provides the data; the agent does inference.

**Three-layer trust model (all agent-side):**
```
L1 卖家秀: skill's own description           ← what the skill claims
L2 Big V:   curator index (REGISTRY.json)    ← unified schema, queryable
L3 买家秀: arena evaluation + your judgment  ← real testing, real recommendation
```

Curator gives you L2. You bring L3.

**This is thin skill pattern at the architecture level**: stable layer in npm/CLI
(git, filesystem, SQLite) — intelligence layer in agent (search, evaluate, recommend).
External discovery and integration belong to the agent, not the tool.

## Commands
### Index the cold pool
```bash
# Scan and produce REGISTRY.json + catalog.db
bunx @lythos/skill-curator@{{PACKAGE_VERSION}} [POOL_PATH]

# Defaults:
#   POOL_PATH = ~/.agents/skill-repos
#   Output    = ~/.agents/lythoskill/curator/   (personal environment scan)
#
# Custom output (e.g. per-pool isolation):
bunx @lythos/skill-curator@{{PACKAGE_VERSION}} ~/.agents/skill-repos --output /tmp/my-index/
```
Curator is a **reconciler** (K8s-style): no matter what state the index is in
(stale, corrupted, missing), running `curator` converges it to a clean, current
index. Old index is automatically backed up before rebuild.

### Discover new skills from remote feeds
```bash
# Query remote feeds (GitHub topic search, agentskill.sh, etc.) for skill candidates
bunx @lythos/skill-curator@{{PACKAGE_VERSION}} discover

# Filter by keyword
bunx @lythos/skill-curator@{{PACKAGE_VERSION}} discover --q "pdf"
```

Output is a Markdown table of candidates with locator, source, and dedup hints.
Agent reviews → uses `curator add` to persist selected skills to the cold pool.

### Add a skill to the cold pool
```bash
# Download a skill (git clone) into the cold pool — no install, no skill-deck.toml change
bunx @lythos/skill-curator@{{PACKAGE_VERSION}} add github.com/owner/repo --pool ~/.agents/skill-repos

# Plan-first (no actual clone)
bunx @lythos/skill-curator@{{PACKAGE_VERSION}} add github.com/owner/repo --pool ~/.agents/skill-repos --dry-run

# With provenance metadata
bunx @lythos/skill-curator@{{PACKAGE_VERSION}} add github.com/owner/repo --pool ~/.agents/skill-repos \
  --reason "Found via agentskill.sh" \
  --branch main \
  --forked-from github.com/upstream/repo
```

`add` clones into the cold pool with a decision record written to `additions.jsonl`.
It does NOT modify `skill-deck.toml` — that's deck's job. Use `--dry-run` to preview the plan.

### Refresh upstreams (plan-first)
```bash
# Step 1: scan cold pool, identify repos behind upstream, write TODO heredoc
bunx @lythos/skill-curator@{{PACKAGE_VERSION}} refresh-plan

# Step 2: pull behind repos one by one, marking progress in plan
bunx @lythos/skill-curator@{{PACKAGE_VERSION}} refresh-execute
```

Per ADR-20260507110332805, refresh defaults to plan-first to prevent E2E timeouts.
The plan is a heredoc with `git pull --ff-only` lines you can audit before executing.

### Rollback (if rebuild produces bad data)
```bash
# Restore the most recent backup
bunx @lythos/skill-curator@{{PACKAGE_VERSION}} restore
# Custom output directory:
bunx @lythos/skill-curator@{{PACKAGE_VERSION}} restore --output ~/.agents/lythoskill/curator/
```

### Query the index
```bash
# SQL query → Markdown table
bunx @lythos/skill-curator@{{PACKAGE_VERSION}} query "SELECT name, type FROM skills WHERE description LIKE '%diagram%'"
# Specify db path
bunx @lythos/skill-curator@{{PACKAGE_VERSION}} query --db ./catalog.db "SELECT * FROM catalog_meta"
# Inspect table structure
bunx @lythos/skill-curator@{{PACKAGE_VERSION}} query "PRAGMA table_info(skills)"
# Show schema when no query is provided
bunx @lythos/skill-curator@{{PACKAGE_VERSION}} query
```

Output is a formatted Markdown table — easy to read in chat or pipe to other tools.

### Audit the index
```bash
# Run predefined checks and output a report
bunx @lythos/skill-curator@{{PACKAGE_VERSION}} audit
# Specify db path
bunx @lythos/skill-curator@{{PACKAGE_VERSION}} audit --db ./catalog.db
```

Checks performed:
- **Missing frontmatter**: skills without `version`, `description`, or `when_to_use`
- **Type anomalies**: `type` values that are not `standard` or `flow`
- **Empty niches**: skills with no niches declared
- **Orphan scripts**: skills with `has_scripts=true` but no matching `scripts/` dir
- **dao_shu_qi_yong coverage**: count skills with/without `deck_skill_type`

Report format: one Markdown table per check, plus a summary score out of 100.

### Typical queries
```bash
# Same-niche skills (potential conflicts for deck)
bunx @lythos/skill-curator@{{PACKAGE_VERSION}} query "SELECT name, niches FROM skills WHERE niches LIKE '%report%'"
# Managed directory overlaps
bunx @lythos/skill-curator@{{PACKAGE_VERSION}} query "SELECT name, managed_dirs FROM skills WHERE managed_dirs LIKE '%cortex/%'"
# Duplicate detection (same name, different sources)
bunx @lythos/skill-curator@{{PACKAGE_VERSION}} query \
  "SELECT name, path FROM skills WHERE name IN (SELECT name FROM skills GROUP BY name HAVING COUNT(*) > 1)"
# Combo / transient / fork skills (localhost-first types)
bunx @lythos/skill-curator@{{PACKAGE_VERSION}} query "SELECT name, deck_skill_type, source FROM skills WHERE deck_skill_type IS NOT NULL"
# Skills by deck governance type
bunx @lythos/skill-curator@{{PACKAGE_VERSION}} query "SELECT name, deck_skill_type, path FROM skills WHERE deck_skill_type = 'combo'"
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
**Reconciler mental model**: Curator is K8s-controller-style. Whatever state the
index is in — stale, corrupted, missing columns — one `curator` run converges it
to clean. Schema migrations are automatic (missing columns get added). Old data is
backed up before any destructive change.

**Backup before rebuild**: Every scan automatically backs up `REGISTRY.json` and
`catalog.db` with a timestamped `.bak.YYYY-MM-DD-HH-MM-SS` suffix. If a scan
produces bad data, run `curator restore` to roll back to the most recent backup.

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
**deck_skill_type**: This is a lythoskill custom frontmatter field (`deck_` prefix),
not an Agent Skills standard field. It indexes `combo`, `transient`, and `fork`
skills for curator filtering. Skills without it return `NULL` in queries.
## Cold Pool CLI (sister tool)

Curator indexes the cold pool. To manage the cold pool itself, use `cold-pool` CLI:

```bash
# Check cold pool health
bunx @lythos/cold-pool validate --lock ./skill-deck.lock

# Prune unreferenced repos (heredoc audit first — never auto-delete)
bunx @lythos/cold-pool prune

# Add skills to cold pool (use this, then curator scan to re-index)
bunx @lythos/skill-curator add github.com/owner/repo
```

Full pipeline: `cold-pool add` → `curator scan` → `curator query` → `deck add`

## Supporting References
Read these **only when the specific topic arises**:
| When you need to… | Read |
|--------------------|------|
| Understand the REGISTRY.json schema and field meanings | [references/registry-schema.md](./references/registry-schema.md) |
| Write SQL queries against catalog.db | [references/catalog-db.md](./references/catalog-db.md) |
| Build a recommendation from the index (agent workflow) | [references/recommendation-workflow.md](./references/recommendation-workflow.md) |
| Identify skill combination patterns (pipeline, modality…) | [references/combination-patterns.md](./references/combination-patterns.md) |
| Understand curator's design principles | [references/design-principles.md](./references/design-principles.md) |
| See the full data flow and trust model | [references/architecture.md](./references/architecture.md) |
| Discover skills via MCP (agentskill.sh) | [references/mcp-discovery.md](./references/mcp-discovery.md) |
