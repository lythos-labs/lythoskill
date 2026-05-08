# lythoskill Curator: Deep Research Report

> Research date: 2026-05-08
> Source: `/Users/chariots/Downloads/lythoskill-main/`

---

## 1. Product Positioning

### What Problem It Solves

As an agent swarm team's skill ecosystem grows (GitHub trending, marketplace downloads, agent recommendations), developers lose track of **what skills they have** and **why they have them**. The Curator solves both discovery and provenance problems:

- **Discovery**: Turns "192 local skills" into structured, queryable data in milliseconds
- **Provenance**: Tracks the full lifecycle — which feed discovered each skill, why it was added, arena evaluation results, fork lineage
- **Governance**: Enables deny-by-default deck management by providing the data layer that deck and arena consume

### Target User: Agent Swarm Teams

The Curator is designed for teams running multiple agent CLIs (Claude Code, Cursor, Codex, Windsurf) in parallel. These teams need:

1. **Consistent skill activation** across all platforms simultaneously (not "switching" between agents)
2. **Agent-agnostic skill governance** (not locked to any single ecosystem)
3. **Heterogeneous tooling support** (different team members use different agents)

The POSSE (Publish on your Own Site, Syndicate Elsewhere) principle from IndieWeb is applied: the cold pool is your "own site," and `deck link --all` syndicates skills to every agent platform.

### Key Design Principle: Separation of Concerns

| Component | Does | Doesn't Do |
|-----------|------|------------|
| **Curator** | Index cold pool, track decision history (additions.jsonl) | Search, recommend, rank, compare |
| **Arena** | Test play with controlled variables, score comparison, L3 metadata | Index, install, govern |
| **Deck** | Declare desired skills, enforce deny-by-default, symlink working set | Discover, evaluate, index |
| **Agent** | LLM reasoning over catalog + additions → tiered recommendations | — (the consumer of all three) |

---

## 2. Architecture: Read-Only Indexer

### Three-Layer Architecture

```
Feeds (LobeHub, GitHub, agentskill.sh)     ← Layer -1: Discovery
        │
        ▼ curator add --pool --reason
Cold Pool (~/.agents/skill-repos/)          ← Layer 0: Local Cache
        │ curator scan
        ▼
Catalog (REGISTRY.json + catalog.db)        ← Layer 1: Index
        │
        ▼
Agent LLM reasoning ←→ Arena test play ←→ Deck governance
```

### Core Components

**`curator-core.ts`** — Pure functions (100% test coverage):
- `scanColdPool(poolPath)` — Synchronous filesystem scan for skill directories
- `parseFrontmatter(text)` — Extracts YAML frontmatter + body from SKILL.md
- `inferSource(path)` — Infers provenance from path (Go module style: `github.com/owner/repo`)
- `buildSkillMeta(frontmatter, path, body)` — Transforms raw frontmatter into structured metadata
- `buildAddPlan(locator, coldPool)` — Pure: computes target path from source (no git clone)
- `buildRefreshPlan(poolPath)` — Pure: finds git repos, checks upstream behind count
- `buildAdditionRecord(...)` — Builds decision history records

**`cli.ts`** — CLI implementation (orchestrates core functions):
- `runCurator()` — Scan cold pool → build REGISTRY.json + catalog.db
- `runAdd()` — Clone skill to cold pool with decision record
- `runQuery()` — SQL query against catalog.db (output: Markdown table)
- `runAudit()` — Predefined checks (missing frontmatter, type anomalies, orphan scripts)
- `runDiscover()` — Query remote feeds (GitHub, LobeHub, agentskill.sh)
- `runRefreshPlan()` / `runRefreshExecute()` — Plan-first refresh with audit heredoc

**`feed-adapters.ts`** — FeedAdapter implementations:
- `createGitHubSearchAdapter()` — GitHub REST API search
- `createLobeHubAdapter()` — Thin wrapper around `@lobehub/market-cli`
- `createAgentSkillShAdapter()` — MCP-native placeholder (agent calls MCP tools directly)
- `createColdPoolFeedAdapter()` — "What you already have" feed

### Cold Pool Layout (Go Module Style)

```
~/.agents/skill-repos/
├── github.com/anthropics/skills/pdf/
├── github.com/lythos-labs/lythoskill/skills/deck/
├── localhost/my-writing-style/
└── .lythoskill-curator/
    ├── REGISTRY.json
    ├── catalog.db
    └── additions.jsonl
```

The cold pool uses Go module path conventions: `github.com/<org>/<repo>/.../<skill>/`.
This enables unambiguous source inference without embedded metadata.

---

## 3. Outputs: REGISTRY.json + catalog.db

### REGISTRY.json

Human-readable, LLM-prompt-friendly JSON index:

```json
{
  "generatedAt": "ISO 8601 timestamp",
  "poolPath": "/absolute/path/to/cold-pool",
  "totalSkills": 42,
  "skills": [ /* full skill metadata array */ ],
  "index": {
    "byType": { "standard": [...], "flow": [...] },
    "byManagedDir": { "cortex/": [...] },
    "byDeckSkillType": { "combo": [...] }
  }
}
```

**Skill entry fields** (from `cli.ts` `SkillMeta` interface):
- `name`, `description`, `type`, `version`, `path`
- `source` — Provenance: `github.com/<org>/<repo>` or `localhost`
- `managedDirs` — Directories the skill manages (conflict detection)
- `niches` — Domain classification
- `triggerPhrases` — Extracted from quoted phrases in description + when_to_use
- `hasScripts`, `hasExamples` — Directory presence flags
- `bodyPreview` — First 500 chars of SKILL.md body
- `whenToUse`, `allowedTools`, `author`, `userInvocable`, `tags`
- `deckDependencies`, `deckSkillType` — lythoskill governance extensions

### catalog.db (SQLite)

Structured, queryable database with two tables:

**`skills` table** — One row per skill:
| Column | Type | Notes |
|--------|------|-------|
| `name` | TEXT PRIMARY KEY | Skill directory name |
| `description` | TEXT | Frontmatter description |
| `type` | TEXT | `standard` or `flow` |
| `path` | TEXT | Absolute path |
| `source` | TEXT | Provenance |
| `trigger_phrases` | TEXT | JSON array string |
| `has_scripts` | INTEGER | 0 or 1 |
| `deck_skill_type` | TEXT | `combo`, `transient`, `fork`, or NULL |
| ... | ... | (20+ columns total) |

**`catalog_meta` table** — Key-value metadata:
- `generated_at`, `last_scan_at`, `total_skills`, `pool_path`

**When to use which**:
| Need | Use |
|------|-----|
| Condition filtering, aggregation, JOIN | catalog.db (SQL) |
| Full scan, LLM prompt injection | REGISTRY.json |
| Programmatic access from scripts | catalog.db |
| Quick human inspection | REGISTRY.json |

---

## 4. Discovery Mechanism

### Local Scanning

The Curator scans the cold pool filesystem recursively:

1. Walk directories up to depth 6
2. Skip: `node_modules`, `.git`, `.claude`, `.cortex`, `.lythoskill-curator`, `tmp`, `dist`, `build`
3. Skip hidden directories (starting with `.`)
4. When a `SKILL.md` file is found, mark the directory as a skill and stop recursing

This is synchronous local IO — fast and deterministic.

### Frontmatter Extraction

For each skill directory:
1. Read `SKILL.md`
2. Parse YAML frontmatter (between `---` delimiters)
3. Extract structured fields: name, description, type, version, author, when_to_use, allowed-tools, tags, niches, etc.
4. Extract trigger phrases from quoted text in description and when_to_use
5. Detect `scripts/` and `examples/` directories
6. Build structured metadata record

### Remote Discovery (Feed Adapters)

Curator can query remote feeds for new skill candidates:
- **GitHub Search**: `"SKILL.md in:readme topic:agent-skills"` via REST API
- **LobeHub**: Spawns `@lobehub/market-cli` (thin-skill pattern)
- **agentskill.sh**: MCP-native — agent calls MCP tools directly, no curator wrapper

The agent reviews candidates, then uses `curator add` to persist selections to the cold pool with a decision record.

---

## 5. Three-Layer Trust Model

The Curator's trust architecture is explicitly three-layered, anchored on the Chinese e-commerce metaphor:

| Layer | Name | What | Source | Stored In |
|-------|------|------|--------|-----------|
| **L1** | 卖家秀 (Seller's Show) | What the skill author claims | SKILL.md frontmatter | catalog.db, REGISTRY.json |
| **L2** | Big V (Influencer) | Where it was discovered, ranking, stars | Feed (LobeHub, GitHub, agentskill.sh) | additions.jsonl → `feed` field |
| **L3** | 买家秀 (Buyer's Review) | Actual performance in your environment | Arena test play results | additions.jsonl → `arenaResult` field |

### L1: Author Description (卖家秀)
- Each skill's `description` field — author self-declared, treated as advertising
- Respected as author's free expression but **not trusted as activation authority**
- desc-SEO arms races at this layer are anticipated and accepted as background noise

### L2: Third-Party Index (Big V 测评)
- Big V / Big Hub indexing, categorization, recommendation
- Third-party reputation signal; cited with attribution
- "Follow but don't blindly trust" — "we respect Big V's work, but fit is personal"

### L3: Private Metadata (买家秀) — **Final Activation Authority**

**L3 is the ground truth for activation decisions.** A skill can claim anything (L1) and be trending everywhere (L2), but if it fails your actual task in Arena, you know.

**Three engineering forms of L3** (don't reduce to just structured metadata):

1. **L3-a: Curator private metadata** — Structured schema fields (trust score, arena tags, provenance chain, personal niche annotations). Best for cross-skill uniform annotation. Low-medium maintenance.

2. **L3-b: Combo skill body as local annotation** — Combo skill prose carries contextual notes like "though X says Y, in our niche Y has issues, we use it like Z." Medium maintenance, contextual.

3. **L3-c: Fork SKILL.md** — Copy skill to `localhost/<my-fork>/` and rewrite source. The shadcn/ui copy-paste pattern applied to skills. High one-time / low ongoing maintenance, fully decoupled from upstream.

The three forms typically **stack** rather than substitute.

### Why This Matters

This is Curator's structural defense against centralized hub (α) failure modes. α fails by promoting L1 (desc) to de-facto trust signal via ranking, triggering SEO arms races. By making L1/L2/L3 explicit and putting authority on L3, the desc-as-ad-slot failure mode is defused without violating author autonomy or erasing curator/Big V's legitimate indexing labor.

**Critical rule**: L2→L3 must be user-mediated. Don't propose "auto-import L2 into L3" — that defeats the "try it on yourself" mechanism.

---

## 6. Read-Only Nature

### Core Principle: Pure Discovery, Zero Mutation

The Curator CLI:
- **Never modifies** the skill directories it scans
- **Never scores, ranks, or recommends** skills algorithmically
- **Never installs** skills into the working set (that's Deck's job)
- **Never searches** the web (agent uses its own web-search skill)

Index outputs are written to a separate `.lythoskill-curator/` directory, not into the cold pool itself.

### Reconciler Pattern

Curator is K8s-controller-style: no matter what state the index is in (stale, corrupted, missing columns), one `curator` run converges it to a clean, current index. Schema migrations are automatic (missing columns get `ALTER TABLE ADD COLUMN`). Old data is backed up before any destructive change.

### Backup Before Rebuild

Every scan automatically backs up `REGISTRY.json` and `catalog.db` with a timestamped `.bak.YYYY-MM-DD-HH-MM-SS` suffix. If a scan produces bad data, run `curator restore` to roll back.

### Deterministic Output

Same cold pool always produces the same REGISTRY.json (sorted, stable). Safe to `diff` across scans for drift detection.

---

## 7. Integration with Deck and Arena Ecosystem

### Curator + Deck + Arena Workflow

```
curator scan → catalog.db          "What do I have?"
    +
curator query → decision history   "Why do I have them?"
    +
arena test   → L3 scores           "Which is better for my task?"
    ↓
agent LLM reasoning → tiered recommendations → deck link
```

### Decision Lifecycle (additions.jsonl)

Each skill in the cold pool has a decision trail:

```
curator add → status: "added"
     │              { locator, feed, reason, addedAt }
     ▼
arena test → status: "evaluated"
     │              { ..., arenaResult: { score, verdict, evaluatedAt } }
     │
     ├── PASS ──► deck link → status: "activated"
     │
     └── FAIL ──► fork → curator add --forked-from → status: "forked"
                          { locator: "localhost/my-fix", forkedFrom, reason }
```

### Multi-Agent POSSE Syndication

```
Cold Pool (your "own site")
~/.agents/skill-repos/
         │
         │  deck link --all (syndicate)
         │
    ┌────┼────────┬─────────┐
    ▼    ▼        ▼         ▼
 Claude Cursor  Codex   Windsurf
 .claude .cursor .codex .windsurf
```

**Not switching — syndicating.** You don't "use Claude mode" or "use Cursor mode." Your skills are published to all platforms. Each agent sees the same deck, governed by the same deny-by-default logic.

### K8s Analogy

| POSSE | K8s | What |
|-------|-----|------|
| Cold pool | PersistentVolume | Canonical storage, one copy |
| `deck link --all` | `kubectl apply -f` across namespaces | Declarative sync to all targets |
| Agent working set | Namespace | Isolated view per agent |

---

## 8. Comparison with Hermes Curator's Approach

### Hermes Curator (Reference Point)

Hermes (the AI agent framework) also has a Curator concept, but the lythoskill Curator differs in fundamental architectural choices:

| Dimension | lythoskill Curator | Hermes Curator (typical) |
|-----------|-------------------|-------------------------|
| **Scope** | Personal environment scan | Often project-embedded or team-shared |
| **Trust model** | Explicit L1/L2/L3 with L3 as authority | Typically L1/L2 only (author desc + hub ranking) |
| **Recommendation** | Agent-side LLM reasoning (zero algorithmic) | May include built-in scoring/ranking |
| **Output location** | Cold pool adjacent (`~/.agents/...`) | Often committed to project repo |
| **Read-only** | Strictly read-only on scanned skills | May modify or install skills |
| **Cold pool concept** | Central: `~/.agents/skill-repos/` | May not have a separate cold pool layer |
| **Multi-agent** | POSSE syndication to all agents | Typically single-agent focused |
| **Arena integration** | First-class L3 metadata pipeline | May not have controlled-variable testing |
| **Decision history** | additions.jsonl with full lifecycle | Typically no provenance tracking |

### Key Differentiators

1. **Personal vs Project**: lythoskill Curator output is explicitly a personal environment scan (ADR-20260424000744041), not a project artifact. This prevents the "pseudo-authority" problem where a committed CATALOG.md makes readers think "lythoskill ecosystem = these 55 skills."

2. **L3 Ground Truth**: The three-layer trust model with L3 (personal arena results) as final authority is unique. Most curators stop at L2 (hub ranking).

3. **Separation of Indexing and Recommendation**: Curator produces facts; the agent does reasoning. No hard-coded TF-IDF, domain boost, or keyword matching. The agent discovers causal chains like "project-cortex produces ADRs; repomix-handoff consumes them" that algorithms miss.

4. **Combo/Transient/Fork Types**: lythoskill has explicit skill types (`combo`, `transient`, `fork`) that are localhost-first and update-skipped by design. These emerge from project-specific实战经验 and cannot be proven upstream.

5. **Plan-First Operations**: Both `refresh` and `prune` default to discover-only / audit-heredoc. No `--yes`, no auto-rm. User audits the plan before executing. This is a deliberate safety design learned from E2E timeout incidents.

---

## 9. Future Work

From memory and ADRs, the Curator's priority extension areas:

1. **L3 Private Metadata Schema** — Design minimal, orthogonal structured fields for trust scores, arena tags, provenance chains. Don't over-design at the expense of L3-b (combo skills) and L3-c (forks).

2. **Cold Pool Metadata Layer** — Per-repo HEAD ref tracking, per-skill content hash, cross-deck reference index. SQLite-backed, local-only trust (no Merkle tree). Foundation for refresh-discover, prune-ref-counting, cold-pool reconcile. (Go sumdb / Maven SHA1 as design references, but simplified for per-user scale.)

3. **--watch Mode** — Auto-reindex on skill directory changes

4. **Registry Version Diffing** — Detect ecosystem drift across scans

5. **Active vs Cold Analysis** — Scan `.claude/skills/` working set alongside cold pool

---

## 10. File References

| File | Purpose |
|------|---------|
| `packages/lythoskill-curator/src/cli.ts` | CLI implementation (orchestration) |
| `packages/lythoskill-curator/src/curator-core.ts` | Pure functions (100% coverage) |
| `packages/lythoskill-curator/src/feed-adapters.ts` | Remote feed adapters |
| `packages/lythoskill-curator/skill/SKILL.md` | Agent-visible skill documentation |
| `packages/lythoskill-curator/skill/references/architecture.md` | Full data flow and trust model |
| `packages/lythoskill-curator/skill/references/design-principles.md` | Core design principles |
| `packages/lythoskill-curator/skill/references/registry-schema.md` | REGISTRY.json schema |
| `packages/lythoskill-curator/skill/references/catalog-db.md` | SQLite schema and queries |
| `packages/lythoskill-curator/skill/references/recommendation-workflow.md` | Agent recommendation workflow |
| `packages/lythoskill-curator/skill/references/combination-patterns.md` | Skill synergy patterns |
| `packages/lythoskill-curator/skill/references/mcp-discovery.md` | MCP-based discovery |
| `cortex/adr/02-accepted/ADR-20260424000744041-curator-output-is-personal-environment-scan-not-project-artifact.md` | Curator output location decision |
| `cortex/adr/02-accepted/ADR-20260503180000000-unit-test-framework-selection-curator-mind.md` | Curator mind applied to testing |
| `cortex/wiki/01-patterns/2026-05-05-multi-agent-posse-syndication.md` | Multi-agent syndication pattern |
| `cortex/wiki/01-patterns/2026-05-02-desc-preference-arena.md` | Description preference testing |
| `memory/project_curator_three_layer_trust.md` | Three-layer trust architecture |
| `memory/project_cold_pool_metadata_layer_research.md` | Go sumdb / Maven SHA1 design reference |
