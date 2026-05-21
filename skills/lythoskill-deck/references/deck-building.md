# Deck Building Techniques
Four phases: Discovery → Evaluation → Organization → Maintenance.
## 1. Discovery
- **Awesome lists**: awesome-agent-skills, Vercel skills showcase
- **GitHub search**: `filename:SKILL.md your-keyword`
- **Social discovery**: Check `cooperative_skills` in popular skills for ecosystem links
- **Curator**: `lythoskill-curator query "SELECT name FROM skills WHERE ..."`
## 2. Evaluation
- **Cold pool trial**: Clone to cold pool, add to deck temporarily, test in real tasks
- **Arena comparison**: Same-niche skills → controlled-variable benchmark
  - Not winner-takes-all — find the **Pareto frontier**  - Radar chart: quality, token efficiency, maintainability, context-fit
- **Retention**: Keep if on Pareto frontier (no clear weakness + at least one leading dimension)
- **Deck synergy**: Arena `--decks` tests full-deck marginal effect, not single-card strength
- **Silent blend check**: Same-niche innate skills must not coexist
## 3. Organization
- **One niche, one skill** in innate. Exception: combo.prompt routing
- **Thickness layers**: heavy assets → npm/pip; dispatchers → Flow/combo.prompt; glue → SKILL.md + scripts
- **Transient hardening**: repeated workaround → extract to package → skill keeps only the call
## POSSE Fan-Out (`also_link_to`)

`also_link_to` syncs the working set to multiple directories in one `deck link` run — one deck.toml as single source of truth, multiple consumers. This is the POSSE pattern (Publish On your Site, Syndicate Elsewhere): define your skill deck once, fan it out everywhere your agents look.

```toml
[deck]
working_set = ".claude/skills"
also_link_to = [".cursor/skills", ".kimi/skills", ".codex/skills"]
```

Common use case: multi-CLI support. Different coding agents (Claude Code, Cursor, Kimi, Codex) each expect skills in their own directory. With `also_link_to`, a single `deck link` populates all of them from the same deck definition.

The field accepts a TOML array of directory paths (relative to the project root, or absolute). An old comma-separated string format is still parsed but emits a deprecation warning — always use the array form.

## 4. Maintenance
- **Curator scan**: `lythoskill-curator` (default scan rebuilds index) after new downloads
- **Audit**: `link` reports expired transients, directory overlaps
- **Lock**: `skill-deck.lock` enables recovery on agent/machine switch
- **max_cards tuning**: quality degrades? check for context dilution from too many skills
## Agent-Assisted Workflow
When you say "build me a deck for X", the agent can:
1. Analyze the task domain
2. Search for candidate skills (web search, awesome lists)
3. Download to cold pool (git clone)
4. Run curator scan
5. Edit toml and run `deck link`
6. Flag same-niche conflicts and suggest arena comparison
Agent should: inform before downloading, only append to deck (not modify existing),
flag when same-niche skills already exist.
## TCG Analogy (SOP)
```
Discover → Acquire → Index → Build Deck → Test Play
awesome    git clone  curator   deck edit    arena
lists      deck add   scan      + link       benchmark
```
