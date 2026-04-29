# Curator Design Principles
1. **Read-only on scanned skills** — Never modifies the skill directories it scans.
   Index outputs (REGISTRY.json, catalog.db) are written to a separate
   `.lythoskill-curator/` directory, not into the cold pool.

2. **Frontmatter first** — Extracts structured metadata from YAML frontmatter.
   Body is only previewed (first 500 chars), never parsed for semantics.
3. **Deterministic output** — Same cold pool always produces identical
   REGISTRY.json (sorted keys, stable ordering). Safe to `diff` across scans.

4. **Separation of concerns** — CLI produces raw data. Agent does reasoning.
   No hard-coded scoring algorithms, no ranking heuristics in the npm package.
   The SKILL.md guides the agent on *how* to reason over the data.

5. **LLM-native formats** — JSON arrays for direct prompt injection.   SQLite for structured querying. Both are first-class outputs.
6. **Zero algorithmic recommendation** — The CLI never says "use A instead of B."
   It says "A and B both exist, here are their attributes." The *agent*
   (reading this SKILL.md + project context + CLAUDE.md) combines index data
   with situational awareness to make informed recommendations.
   See [recommendation-workflow.md](./recommendation-workflow.md) for the agent-side workflow.

## Future Enhancements
- `--watch` mode: auto-reindex on skill directory changes
- Registry version diffing for ecosystem drift detection
- Export to skill-deck.toml format (structure, not recommendations)
- Active vs cold analysis (scan `.claude/skills/` alongside cold pool)
- `superseded_by` metadata propagation to prevent selecting deprecated skills
