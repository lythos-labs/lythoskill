# Zero-Knowledge Subagent: Curator Patterns Verification

> Real case: haiku subagent with only SKILL.md, 2026-05-20.

## Setup

- **Agent**: haiku, zero prior knowledge of lythoskill
- **Knowledge source**: only curator SKILL.md (this skill's own docs)
- **Cold pool**: 871 skills indexed at `~/.agents/skill-repos/.lythoskill-curator/catalog.db`
- **CLI**: `bun packages/lythoskill-curator/src/cli.ts`

## Task

Follow four documented patterns from SKILL.md:

| Step | Pattern | Source section |
|------|---------|---------------|
| A | Discover existing niches | Niche Taxonomy |
| B | Multi-candidate disambiguation | Find — Ambiguity |
| C | Domain-specific selection | Domain Tagging from Path Structure |
| D | MISS path with search guidance | Find — Example |

## Results

### A. Niche Discovery (json_each)

```
domain/general              305
domain/python-development    16
domain/developer-essentials  11
domain/ui-design              9
domain/backend-development    9
hub/skills-sh/trending/...    5
```

Agent correctly ran the niche discovery SQL and understood the taxonomy landscape.

### B. skill-creator Disambiguation (2 candidates)

```
⚠️  2 skills share the name "skill-creator":

  skill-creator → anthropics/skills  🏷️ hub/skills-sh/trending/2026-05-20
  skill-creator → daymade/...        🏷️ hub/skills-sh/trending/2026-05-20
```

Both hub-validated (tied). Agent applied tiebreaker: **prefer upstream (anthropics) over fork (daymade)**.

### C. airflow-dag-patterns Domain Selection (2 candidates)

```
⚠️  2 skills share the name "airflow-dag-patterns":

  airflow-dag-patterns → antigravity-skills  🏷️ domain/general
  airflow-dag-patterns → wshobson/.../data-engineering/  🏷️ domain/data-engineering
```

Agent applied heuristic: **prefer `domain/data-engineering` over `domain/general`** for a data engineering task.

### D. MISS Path

```
🔍 "vercel-react-best-practices" not found in local cold pool.

To add it:
  1. gh search code "vercel-react-best-practices" --filename "SKILL.md"
  2. curator add github.com/<owner>/<repo> --pool ~/.agents/skill-repos
  3. curator find vercel-react-best-practices
```

Standard MISS output with three-step discovery flow.

## Key Takeaways

1. **SKILL.md alone suffices** — ZK agent successfully discovered niches, applied heuristics, and made correct disambiguation choices without any project-specific brief
2. **Niche taxonomy enables reasoning** — `domain/general` vs `domain/data-engineering` gives agent a basis for selection; `hub/skills-sh/trending` provides external validation signal
3. **Disambiguation heuristic works**: prefer domain-specialized over general, prefer hub-validated over unvalidated, prefer upstream over fork
4. **Shell batch needs sqlite3** — batch cross-reference (17 names × find) hits shell PATH corruption with `$(bun ... 2>/dev/null)` in loops; use SQLite directly for bulk operations
5. **Query validator must allow SQLite extensions** — `json_each()` was rejected by AST whitelist until guard.ts switched to blacklist approach

## Replay

```bash
# Reproduce this verification with any zero-knowledge agent:
# 1. Give the agent only this skill's SKILL.md
# 2. Point it at a populated catalog.db
# 3. Ask it to: discover niches, disambiguate a collision, pick domain, handle MISS
```
