---
name: lythoskill-curator
version: 0.15.2
type: standard
description: |
  Skill 策展者/买家秀 (curator's perspective). Scans your local cold pool,
  indexes SKILL.md frontmatter into REGISTRY.json + catalog.db. CLI is mechanical
  glue (scan/query/tag/audit/find) — YOU are the agent who combines curator's local cache
  with WebSearch, deep research, and arena testing to discover, annotate, fact-check,
  and recommend. Curator = 查卡器 + 备注 + 组卡审美. Reconciler-style: any filesystem
  state → scan → converges to clean index. Auto-backup; rollback via `restore`.
when_to_use: |
  Find a skill for X, search skills, what skills do I have, list all skills,
  catalog skills, explore cold pool, scan skill pool, skill index, update index,
  recommend a deck, is there a skill for Y, discover skills, cold pool query,
  skill lookup, what's available, curator query, curator scan, curator audit,
  curator tag, annotate skill, fact-check skill, cross-reference skill quality,
  find path for <name>, how to add <name>, what's the path for,
  bare name to full path, where is skill <name>, how do I install <name>,
  curator find, lookup skill path, skill locator for.
  ALSO trigger when user wants to do a task and you need to find the right skill:
  curator query local cache → WebSearch for new candidates →
  curator add + curator tag → arena test → curator tag --qa → recommend with confidence.
allowed-tools:
  - Bash(bunx @lythos/skill-curator@0.15.2 *)
  - WebSearch
  - WebFetch
# ── deck governance metadata (consumed by lythoskill tooling only) ──
deck_managed_dirs:
  - ~/.agents/skill-repos/.lythoskill-curator/
---

# Skill Curator
> 策展者/买家秀 = 查卡器 + 备注 + 组卡审美
> CLI is mechanical glue (scan, query, tag, audit). Agent does the thinking.

## Mental Model: Curator = 策展者 (Curator's Perspective)

Curator is NOT a discovery engine. It's the **curator's personal knowledge base** —
a card searcher + personal notes system for the skill ecosystem.

**Two complementary modes**:

| Mode | Metaphor | What it does |
|------|----------|-------------|
| 记者 (Journalist) | Investigation + narrative + expression | Fact-check claims, cross-reference sources, detect bias, assign confidence |
| 架构师 (Architect) | Composition aesthetics | Understand synergies, deduce combos, judge structural fit, design archetypes |

**组卡审美 (composition taste) has three inputs**:
1. **Arena 实战数值** — quantitative: scores, pass/fail, performance data
2. **审美评析** — qualitative: your own judgment of a skill's design, clarity, fit
3. **Combo 推演** — systemic: how skills compose, what synergies emerge, what archetype they form

A curator doesn't just verify facts (记者). A curator understands **how skills combine
to be beautiful** (架构师). This is what separates a card database from a deck builder.

**Curator 依赖 deck + arena 的能力**：curator 不评估孤立技能——它评估"这张牌在这个卡组里完成这个任务"的表现。Arena 测试的是 deck 级别能力，curator 记录的是 deck-task 级别的 QA。一张牌在一副卡组里表现出色，在另一副里可能无用。架构师理解这种上下文依赖性。

## Discovery SOP (Agent-Driven)

The explore slot is dominated by **agent + search** (gh CLI first, WebSearch as fallback).
Curator's job is NOT to be the discovery engine — it's the **local cache** that makes
discovery faster, and the **enrichment layer** that remembers what was found.

```
1. curator find <bare-name>                                   ← local cold pool: "already have it?"
2. curator query "SELECT name, description FROM skills        ← local cache: "anything similar?"
   WHERE description LIKE '%<keyword>%'"
3. gh search code "<bare-name>" --filename "SKILL.md"         ← GitHub code search: precise, hits exact name
4. gh search repos "<keyword>" --topic "agent-skills"         ← GitHub topic search: discover skill repos
5. WebSearch for "<name> skill site:github.com"               ← web fallback (site: prefix when supported)
6. WebFetch / gh CLI to inspect candidates                   ← deep dive
7. curator add <locator> --pool ...                           ← seed cold pool
8. curator scan                                               ← re-index
9. curator tag <name> --niche "<classification>"              ← agent-enriched metadata (L3)
   [--qa '{"source_type":"self/arena","signal_value":8,...}']
10. arena single/vs                                            ← test before adopting
11. curator tag <name> --qa '{"source_type":"self/arena"...}'  ← record test results
12. Recommend with confidence: "skill X fits because...        ← agent reasoning
    (3 arena PASS + hub A confirms + curator scan clean)"
```

**Curator is NOT the discovery engine.** It's the agent's local data source.
The agent combines curator query + gh search + WebSearch + its own reasoning for
discover → rank → recommend.

### Three Discovery Scenarios

| Scenario | What you know | Start here |
|----------|--------------|------------|
| "I know the skill name" | bare name (e.g., "fullstack-dev") | `curator find` → gh search code |
| "I know the person/org" | fuzzy name (e.g., "归藏师傅") | WebSearch → gh search code for precise path |
| "I know the repo URL" | repo URL (e.g., `github.com/lijigang/ljg-skills`) | gh api peek → curator add |

### Search Precision Ladder

When `curator find` misses, use these in order — fastest to broadest:

| Priority | Method | Speed | Precision | Example |
|----------|--------|-------|-----------|---------|
| 1 | `gh search code "<name>" --filename "SKILL.md"` | ~2s | Highest | `gh search code "fullstack-dev" --filename "SKILL.md"` |
| 2 | `gh search code "<name> skill" --filename "SKILL.md"` | ~3s | High | broader match |
| 3 | `gh search repos "<topic>" --topic "agent-skills"` | ~3s | Medium | `gh search repos "writer" --topic "agent-skills"` |
| 4 | WebSearch `"<name> skill site:github.com"` | ~5s | Medium | site: prefix for domain filtering |
| 5 | WebSearch `"skill <name>"` | ~5s | Broad | without site: prefix |

`gh search code` is the most effective because it searches file CONTENTS — a skill named
"fullstack-dev" always has `name: fullstack-dev` in its SKILL.md frontmatter. This is
more precise than repo search or web search.

### Repo Exploration — "I know the repo, what's inside?"

Common social-media discovery pattern: someone shares a GitHub repo URL, but you don't
know what skills it contains. Common for monorepos (e.g., `JimLiu/baoyu-skills` has 22,
`lijigang/ljg-skills` has 21). Use `gh api` to peek without cloning:

```bash
# 1. List top-level files/dirs in the repo
gh api repos/<owner>/<repo>/contents --jq '.[].name'

# 2. If there's a skills/ dir, list it
gh api repos/<owner>/<repo>/contents/skills --jq '.[].name'

# 3. Optionally peek at specific SKILL.md frontmatter
gh api repos/<owner>/<repo>/contents/skills/<name>/SKILL.md --jq '.content' | base64 -d | head -10
```

**Real example** — discovering what's in `lijigang/ljg-skills`:
```
$ gh api repos/lijigang/ljg-skills/contents/skills --jq '.[].name'
ljg-book  ljg-card  ljg-invest  ljg-learn  ljg-paper  ljg-plain
ljg-present  ljg-push  ljg-qa  ljg-rank  ljg-read  ljg-think
ljg-travel  ljg-word  ljg-writes  ...  (21 skills total)

$ gh api repos/lijigang/ljg-skills/contents/skills/ljg-think/SKILL.md \
    --jq '.content' | base64 -d | head -5
---
name: ljg-think
description: 追本之箭——纵向深钻思维工具...
```

Once you've identified the skills you want, `curator add` the repo normally.

### gh CLI Auth Bootstrap

**`gh` is the backbone of skill discovery.** Without it, you lose the top 3 most precise
search methods (code search, repo topic search). WebSearch alone is 5x slower and 10x
less precise. Strongly recommend the user install and auth `gh` before using curator.

If `gh` commands fail with authentication errors, do NOT silently skip:

1. **Check for existing token**: look for `.github-token` in the project root, or
   `GITHUB_TOKEN` / `GH_TOKEN` env vars. If found, export it:
   ```bash
   export GH_TOKEN=$(cat .github-token)
   ```
2. **Ask the user to install gh**: if `gh` CLI is missing entirely, tell the user:
   > `gh` CLI is required for precise skill discovery. Install it:
   > - macOS: `brew install gh`
   > - Linux: `curl -fsSL https://cli.github.com/install.sh | bash`
   > - Then: `gh auth login`
   > Or if you have a token: `echo "ghp_xxx" > .github-token && export GH_TOKEN=$(cat .github-token)`
3. **Ask for a token**: if gh is installed but not authed:
   > `gh` needs a GitHub token. You can:
   > - Create one at https://github.com/settings/tokens (no scopes needed for public repos)
   > - Run: `echo "ghp_xxx" > .github-token`
   > - Or: `export GH_TOKEN=ghp_xxx`
4. **Fall back to WebSearch ONLY if user declines**: slower, less precise, but works
   without auth. Remind the user what they're giving up.

## Commands

### Index the cold pool (scan)
```bash
bunx @lythos/skill-curator@0.15.2 [POOL_PATH]
# Defaults: POOL_PATH = ~/.agents/skill-repos
#           Output    = <pool>/.lythoskill-curator/
bunx @lythos/skill-curator@0.15.2 ~/.agents/skill-repos --output /tmp/my-index/
```
Reconciler-style: converges any state to a clean index. Auto-backup before rebuild.

### Tag — agent-enriched metadata (L3 买家秀)
```bash
# Write niche tags (curator's personal classification)
bunx @lythos/skill-curator@0.15.2 tag <skill-name> --niche "meta.governance.deck"
bunx @lythos/skill-curator@0.15.2 tag <skill-name> --niche "code-review" --niche "security"

# Write QA signal with provenance (REQUIRED)
bunx @lythos/skill-curator@0.15.2 tag <skill-name> \
  --qa '{"source_type":"self/arena","source_name":"arena-single-2026-05-18","signal_type":"score","signal_value":8}'

# Reference external hub assessment (L2, with provenance)
bunx @lythos/skill-curator@0.15.2 tag <skill-name> \
  --qa '{"source_type":"hub/agentskill.sh","source_url":"https://...","signal_type":"securityScore","signal_value":95}'
```

**Tag is agent-enriched, NOT extracted from SKILL.md frontmatter.** Skill authors write L1 卖家秀
(description). The curator writes L3 买家秀 (niche + QA). These are separate data layers.
Re-scan preserves agent-written tags (merge strategy: scan updates name/description/path,
preserves niches column).

**QA provenance schema**: every signal must carry `source_type`, `source_name`, and `signal_value`.
No-provenance signals are rejected. See ADR-20260518123403810.

### Niche Taxonomy — naming conventions for agent-written tags

Niche tags follow a hierarchical prefix convention. When tagging, use these patterns:

| Prefix | Pattern | Example | Meaning |
|--------|---------|---------|---------|
| `hub/` | `hub/<source>/trending/<date>` | `hub/skills-sh/trending/2026-05-20` | External hub trending reference |
| `domain/` | `domain/<classification>` | `domain/data-engineering`, `domain/general` | Domain specialization level |
| freeform | any string without prefix | `code-review`, `security` | Curator's personal classification |

**To discover existing niches** (before tagging, know what's already there):
```bash
curator query "SELECT DISTINCT json_each.value FROM skills, json_each(niches) WHERE json_each.value NOT LIKE 'qa:%' ORDER BY 1"
```

### External Hub Cross-Reference Workflow

Skills.sh, LobeHub, and other registries track install counts and trending metrics. Cross-reference their data into curator:

```
1. WebFetch <hub-url> → extract top N skill names + ranks + install counts
2. For each name: curator find <name> → HIT or MISS?
3. For HIT: curator tag <name> --niche "hub/<source>/trending/<date>" \
     --qa '{"source_type":"hub/<source>","source_name":"<source>-<date>","source_url":"...","signal_type":"installs_alltime","signal_value":<n>,"rank":<r>}'
4. Batch: use SQLite directly for bulk operations (see Gotchas)
```

**Real example** — skills.sh top 17 cross-referenced against 871-skill cold pool (2026-05-20):
- 4 HITs: find-skills (#1, 1.6M), frontend-design (#2, 433K), web-design-guidelines (#5, 331K, antfu not vercel), skill-creator (#26, 219K)
- 13 MISS: mostly Vercel/Microsoft/Azure skills not yet in cold pool
- `web-design-guidelines` name collision: skills.sh tracks vercel-labs version, cold pool has antfu version — same capability slot, different ecosystems

### Domain Tagging from Path Structure

Some skill repos organize skills by domain (e.g., `plugins/<domain>/skills/<name>/`). Extract this:

```bash
# Discover domains embedded in path structure
curator query "SELECT DISTINCT SUBSTR(path, INSTR(path, 'plugins/')+8, INSTR(SUBSTR(path, INSTR(path, 'plugins/')+8), '/')-1) as domain FROM skills WHERE path LIKE '%plugins/%/skills/%'"

# Tag each skill with its domain
# For wshobson-style repos (plugins/<domain>/skills/...): tag with "domain/<domain>"
# For flat repos (skills/<name>/): tag with "domain/general"
```

This is how the 155 wshobson skills got `domain/data-engineering`, `domain/python-development`, etc., and 305 antigravity skills got `domain/general`.

### Query the index
```bash
bunx @lythos/skill-curator@0.15.2 query "SELECT name, type FROM skills WHERE description LIKE '%diagram%'"
bunx @lythos/skill-curator@0.15.2 query --db ./catalog.db "SELECT * FROM catalog_meta"
bunx @lythos/skill-curator@0.15.2 query "PRAGMA table_info(skills)"
bunx @lythos/skill-curator@0.15.2 query   # show schema overview
```
Output is Markdown table. SQL is a good DSL for showing intent — declarative, readable.

### Find — bare name to full path lookup
```bash
bunx @lythos/skill-curator@0.15.2 find <bare-name>
bunx @lythos/skill-curator@0.15.2 find fullstack-dev
bunx @lythos/skill-curator@0.15.2 find fullstack-dev --db ./catalog.db
```
Output: full locator path + ready-to-use `deck add` command + `skill-deck.toml` snippet.
Looks up `name` field in catalog.db. Local-only — searches skills already in your cold pool.

**Example — user discovers "fullstack-dev" on social media, wants to add it:**

HIT (skill already in cold pool):
```
$ curator find fullstack-dev

  name: fullstack-dev
  path: github.com/MiniMax-AI/skills/skills/fullstack-dev
  type: standard

  # deck add:
  bunx @lythos/skill-deck add fullstack-dev \
    --path github.com/MiniMax-AI/skills/skills/fullstack-dev

  # or add to skill-deck.toml:
  [tool.skills.fullstack-dev]
  path = "github.com/MiniMax-AI/skills/skills/fullstack-dev"
```

MISS — not in cold pool yet:
```
$ curator find fullstack-dev
🔍 "fullstack-dev" not found in local cold pool.

To add it:
  1. gh search code "fullstack-dev" --filename "SKILL.md"  ← find the repo
  2. curator add github.com/<owner>/<repo> --pool ~/.agents/skill-repos
  3. curator find fullstack-dev  # then it will hit

Or ask your agent — it can gh search code → curator add → deck add in one flow.
See Discovery SOP → Search Precision Ladder for fallback methods.
```

**Ambiguity**: bare names are not unique — `fullstack-dev` exists in both MiniMax-AI/skills and
ChatGLM/skills. When multiple matches exist, `find` lists all options with their full paths
and any niche tags (hub references, domain classification) to help disambiguate:

```
⚠️  2 skills share the name "airflow-dag-patterns":

  airflow-dag-patterns  →  ...antigravity-skills/...  (standard)  🏷️  domain/general
  airflow-dag-patterns  →  ...wshobson/.../data-engineering/... (standard)  🏷️  domain/data-engineering

Pick ONE and specify its full path with deck add:
  bunx @lythos/skill-deck add airflow-dag-patterns --path ...antigravity-skills/...

⚠️  deck link will fail if two skills have the same name. Choose one.
```

**Disambiguation heuristic**: prefer domain-specialized over `domain/general`, prefer hub-validated
(skills.sh trending) over unvalidated. Name collision is a strong signal that multiple ecosystems
implement the same capability slot — pick the one matching your context.

### Audit the index
```bash
bunx @lythos/skill-curator@0.15.2 audit
bunx @lythos/skill-curator@0.15.2 audit --db ./catalog.db
```

Checks: missing frontmatter, type anomalies, orphan scripts, deck_skill_type coverage,
**legacy pattern detection** (deprecated references like `skills.sh`, `deck status sh`,
`HANDOFF.md` in SKILL.md body). Empty niches are NOT violations — niches are agent-enriched,
not author-declared.

### Add a skill to the cold pool
```bash
bunx @lythos/skill-curator@0.15.2 add github.com/owner/repo --pool ~/.agents/skill-repos
bunx @lythos/skill-curator@0.15.2 add github.com/owner/repo --pool ~/.agents/skill-repos --dry-run
bunx @lythos/skill-curator@0.15.2 add github.com/owner/repo --pool ~/.agents/skill-repos \
  --output /tmp/my-index/
bunx @lythos/skill-curator@0.15.2 add github.com/owner/repo --pool ~/.agents/skill-repos \
  --reason "Found via WebSearch for code review skills" --branch main
```

`--output` controls where `additions.jsonl` and the write-through cache land. Default: `<pool>/.lythoskill-curator/`. Use it to point to a different location.

### Refresh upstreams (plan-first)
```bash
bunx @lythos/skill-curator@0.15.2 refresh-plan
bunx @lythos/skill-curator@0.15.2 refresh-execute
```

### Rollback
```bash
bunx @lythos/skill-curator@0.15.2 restore
```

## Fact-Check + Confidence Evaluation (记者)

The curator's verification layer — not just collecting QA signals, but verifying
claims and assigning structured confidence. The agent is a **journalist** (记者):
investigation + narrative synthesis + expression.

### Fact-Check Workflow
```
1. curator query → get skill's current QA signals
2. Agent cross-references:
   - Author claim (L1): "fast and reliable"
   - Arena self-test (L3): 30s timeout? → contradiction → flag
   - Hub A (L2): score 9/10 vs Hub B (L2): score 4/10 → signal divergence → needs self-test
   - 3 independent arena runs agree → evidence convergence → HIGH confidence
3. curator tag --qa → write structured confidence assessment
```

### Confidence Dimensions
- **Evidence quantity**: how many independent sources
- **Evidence quality**: self-test > shared arena > hub > author claim
- **Evidence consistency**: convergent or contradictory?
- **Freshness**: recent test > 6-month-old data

### Source-Filtered Bias Detection
Toggle sources to see different composite pictures:
- All sources: 8/10
- Exclude Hub A: 6/10 (Hub A systematically rates +2 on TypeScript skills)
- Self-test only: 7/10 (smaller sample, higher confidence per sample)

This difference IS the signal. Curator doesn't decide which source to trust —
it shows the multi-source picture and lets the agent/user judge.

### Confidence Output Format
```
Claim X: HIGH confidence (3 self-tests PASS + 1 hub confirms, 0 contradictions)
Claim Y: LOW confidence (author-only claim, no independent verification)
Claim Z: CONTRADICTED (author says "fast", arena shows 30s timeout)
```

## Typical Queries
```bash
# Skills by agent-enriched niche
bunx @lythos/skill-curator@0.15.2 query "SELECT name, niches FROM skills WHERE niches LIKE '%agent-tagged%'"
# Duplicate detection
bunx @lythos/skill-curator@0.15.2 query \
  "SELECT name, path FROM skills WHERE name IN (SELECT name FROM skills GROUP BY name HAVING COUNT(*) > 1)"
# Combo / transient / fork skills
bunx @lythos/skill-curator@0.15.2 query "SELECT name, deck_skill_type, source FROM skills WHERE deck_skill_type IS NOT NULL"
# Managed directory overlaps
bunx @lythos/skill-curator@0.15.2 query "SELECT name, managed_dirs FROM skills WHERE managed_dirs LIKE '%cortex/%'"
```

## Curator + Deck + Arena Workflow
```
curator scan → catalog.db              "What's in my collection?"
    ↓
agent: curator query + WebSearch       "Find me a skill for X"     (discovery)
    ↓
curator find <bare-name>               "What's the full path?"     (lookup, ADR-20260519225831495)
    ↓
curator add + curator scan             "Add to cold pool"         (collection)
    ↓
curator tag --niche ... [--qa ...]     "Write my notes"           (enrichment)
    ↓
deck add + deck link                   "Activate in working set"  (use)
    ↓
arena single/vs                        "Test it myself"            (verify)
    ↓
curator tag --qa '{"source_type":"self/arena"...}'  "Record result" (remember)
    ↓
Next discovery: richer cache + QA → better recommendations        (compound)
```

**Data flywheel**: more usage → more QA data → better curator → better recommendations →
more targeted testing → even more QA data. Curator's value compounds over time
while deck/arena deliver steady-state value.

## Gotchas
**Agent-enriched niches, not frontmatter-extracted**: niches come from `curator tag`,
not from SKILL.md frontmatter. Scan preserves existing niches on re-scan (merge strategy).

**Empty niche is NOT a violation**: audit no longer flags empty niches. Skills without
agent-enriched metadata are normal — especially newly indexed skills.

**Legacy pattern detection**: audit checks SKILL.md bodies for deprecated references
(`skills.sh`, `deck status sh`, `HANDOFF.md`, `deck update`). Mechanical detection,
agent judges severity.

**Reconciler mental model**: K8s-controller-style. One `curator` run converges any state
to clean. Auto-backup before rebuild. Use `curator restore` to roll back.

**Index freshness**: query stderr shows generation time. >7 days → warning.

**catalog.db not found**: run `curator` first to scan and build the index.

**JSON array fields**: `niches`, `managed_dirs`, `trigger_phrases` stored as JSON strings
in SQLite. Use `json_extract()` for element access.

**QA provenance required**: every QA signal via `--qa` must include `source_type` and
`source_name`. No-provenance signals are rejected.

**Feed concept survives as schema, not adapter code**: curator does NOT implement HTTP
API adapters. Agent uses WebSearch/WebFetch/gh CLI for external discovery. Curator
can maintain feed schemas (URL patterns, data shapes) as metadata — but the execution
is agent-side. See ADR-20260508230803515.

**Shell batch gotcha**: `$(bun ... 2>/dev/null)` in a loop corrupts PATH on subsequent
iterations. For batch operations (bulk find, bulk tag), use SQLite directly via
`curator query` or a Bun/Node script reading catalog.db. Single commands are safe.

**Same-name deck link conflict**: `deck link` fails if two skills share a bare name.
Use `curator find` first to detect collisions. Pick ONE — the path is what matters
to deck, not the name. `deck add <name> --path <full-locator>` is explicit.

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
| Understand WHY curator is this shape (ecosystem structural constraints, steel-man analysis) | [references/why-this-shape.md](./references/why-this-shape.md) |
