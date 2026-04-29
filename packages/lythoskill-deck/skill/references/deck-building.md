# Deck Building Techniques
Four phases: Discovery → Evaluation → Organization → Maintenance.
## 1. Discovery
- **Awesome lists**: awesome-agent-skills, Vercel skills showcase
- **GitHub search**: `filename:SKILL.md your-keyword`
- **Social discovery**: Check `cooperative_skills` in popular skills for ecosystem links
- **Curator**: `bunx @lythos/skill-curator query "SELECT name FROM skills WHERE ..."`
## 2. Evaluation
- **Cold pool trial**: Clone to cold pool, add to deck temporarily, test in real tasks
- **Arena comparison**: Same-niche skills → controlled-variable benchmark
  - Not winner-takes-all — find the **Pareto frontier**  - Radar chart: quality, token efficiency, maintainability, context-fit
- **Retention**: Keep if on Pareto frontier (no clear weakness + at least one leading dimension)
- **Deck synergy**: Arena `--decks` tests full-deck marginal effect, not single-card strength
- **Silent blend check**: Same-niche innate skills must not coexist
## 3. Organization
- **One niche, one skill** in innate. Exception: combo routing
- **Thickness layers**: heavy assets → npm/pip; dispatchers → Flow/Combo; glue → SKILL.md + scripts
- **Transient hardening**: repeated workaround → extract to package → skill keeps only the call
## 4. Maintenance
- **Curator scan**: `bunx @lythos/skill-curator rebuild index` after new downloads
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
lists      Vercel CLI scan      + link       benchmark
```
