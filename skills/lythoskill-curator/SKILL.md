---
name: lythoskill-curator
version: 0.14.4
type: standard
description: |
  Skill 策展者/买家秀 (curator's perspective). Scans your local cold pool,
  indexes SKILL.md frontmatter into REGISTRY.json + catalog.db. CLI is mechanical
  glue (scan/query/tag/audit) — YOU are the agent who combines curator's local cache
  with WebSearch, deep research, and arena testing to discover, annotate, fact-check,
  and recommend. Curator = 查卡器 + 备注 + 组卡审美. Reconciler-style: any filesystem
  state → scan → converges to clean index. Auto-backup; rollback via `restore`.
when_to_use: |
  Find a skill for X, search skills, what skills do I have, list all skills,
  catalog skills, explore cold pool, scan skill pool, skill index, update index,
  recommend a deck, is there a skill for Y, discover skills, cold pool query,
  skill lookup, what's available, curator query, curator scan, curator audit,
  curator tag, annotate skill, fact-check skill, cross-reference skill quality.
  ALSO trigger when user wants to do a task and you need to find the right skill:
  curator query local cache → WebSearch for new candidates →
  curator add + curator tag → arena test → curator tag --qa → recommend with confidence.
allowed-tools:
  - Bash(bunx @lythos/skill-curator@0.14.4 *)
  - WebSearch
  - WebFetch
# ── deck governance metadata (consumed by lythoskill tooling only) ──
deck_managed_dirs:
  - ~/.agents/lythoskill/curator/
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

The explore slot is dominated by **agent + search** (WebSearch, gh CLI, WebFetch).
Curator's job is NOT to be the discovery engine — it's the **local cache** that makes
discovery faster, and the **enrichment layer** that remembers what was found.

```
1. curator query "SELECT name, description FROM skills       ← local cache: "in cold pool?"
   WHERE description LIKE '%<keyword>%'"
2. WebSearch for "<task> skill agent"                        ← remote discovery
3. WebFetch / gh CLI to inspect candidates                  ← deep dive
4. curator add <locator> --pool ...                          ← seed cold pool
5. curator scan                                              ← re-index
6. curator tag <name> --niche "<classification>"             ← agent-enriched metadata (L3)
   [--qa '{"source_type":"self/arena","signal_value":8,...}']
7. arena single/vs                                           ← test before adopting
8. curator tag <name> --qa '{"source_type":"self/arena"...}' ← record test results
9. Recommend with confidence: "skill X fits because...       ← agent reasoning
   (3 arena PASS + hub A confirms + curator scan clean)"
```

**Curator is NOT the discovery engine.** It's the agent's local data source.
The agent combines curator query + WebSearch + its own reasoning for
discover → rank → recommend.

## Commands

### Index the cold pool (scan)
```bash
bunx @lythos/skill-curator@0.14.4 [POOL_PATH]
# Defaults: POOL_PATH = ~/.agents/skill-repos
#           Output    = ~/.agents/lythoskill/curator/
bunx @lythos/skill-curator@0.14.4 ~/.agents/skill-repos --output /tmp/my-index/
```
Reconciler-style: converges any state to a clean index. Auto-backup before rebuild.

### Tag — agent-enriched metadata (L3 买家秀)
```bash
# Write niche tags (curator's personal classification)
bunx @lythos/skill-curator@0.14.4 tag <skill-name> --niche "meta.governance.deck"
bunx @lythos/skill-curator@0.14.4 tag <skill-name> --niche "code-review" --niche "security"

# Write QA signal with provenance (REQUIRED)
bunx @lythos/skill-curator@0.14.4 tag <skill-name> \
  --qa '{"source_type":"self/arena","source_name":"arena-single-2026-05-18","signal_type":"score","signal_value":8}'

# Reference external hub assessment (L2, with provenance)
bunx @lythos/skill-curator@0.14.4 tag <skill-name> \
  --qa '{"source_type":"hub/agentskill.sh","source_url":"https://...","signal_type":"securityScore","signal_value":95}'
```

**Tag is agent-enriched, NOT extracted from SKILL.md frontmatter.** Skill authors write L1 卖家秀
(description). The curator writes L3 买家秀 (niche + QA). These are separate data layers.
Re-scan preserves agent-written tags (merge strategy: scan updates name/description/path,
preserves niches column).

**QA provenance schema**: every signal must carry `source_type`, `source_name`, and `signal_value`.
No-provenance signals are rejected. See ADR-20260518123403810.

### Query the index
```bash
bunx @lythos/skill-curator@0.14.4 query "SELECT name, type FROM skills WHERE description LIKE '%diagram%'"
bunx @lythos/skill-curator@0.14.4 query --db ./catalog.db "SELECT * FROM catalog_meta"
bunx @lythos/skill-curator@0.14.4 query "PRAGMA table_info(skills)"
bunx @lythos/skill-curator@0.14.4 query   # show schema overview
```
Output is Markdown table. SQL is a good DSL for showing intent — declarative, readable.

### Audit the index
```bash
bunx @lythos/skill-curator@0.14.4 audit
bunx @lythos/skill-curator@0.14.4 audit --db ./catalog.db
```

Checks: missing frontmatter, type anomalies, orphan scripts, deck_skill_type coverage,
**legacy pattern detection** (deprecated references like `skills.sh`, `deck status sh`,
`HANDOFF.md` in SKILL.md body). Empty niches are NOT violations — niches are agent-enriched,
not author-declared.

### Add a skill to the cold pool
```bash
bunx @lythos/skill-curator@0.14.4 add github.com/owner/repo --pool ~/.agents/skill-repos
bunx @lythos/skill-curator@0.14.4 add github.com/owner/repo --pool ~/.agents/skill-repos --dry-run
bunx @lythos/skill-curator@0.14.4 add github.com/owner/repo --pool ~/.agents/skill-repos \
  --reason "Found via WebSearch for code review skills" --branch main
```

### Refresh upstreams (plan-first)
```bash
bunx @lythos/skill-curator@0.14.4 refresh-plan
bunx @lythos/skill-curator@0.14.4 refresh-execute
```

### Rollback
```bash
bunx @lythos/skill-curator@0.14.4 restore
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
bunx @lythos/skill-curator@0.14.4 query "SELECT name, niches FROM skills WHERE niches LIKE '%agent-tagged%'"
# Duplicate detection
bunx @lythos/skill-curator@0.14.4 query \
  "SELECT name, path FROM skills WHERE name IN (SELECT name FROM skills GROUP BY name HAVING COUNT(*) > 1)"
# Combo / transient / fork skills
bunx @lythos/skill-curator@0.14.4 query "SELECT name, deck_skill_type, source FROM skills WHERE deck_skill_type IS NOT NULL"
# Managed directory overlaps
bunx @lythos/skill-curator@0.14.4 query "SELECT name, managed_dirs FROM skills WHERE managed_dirs LIKE '%cortex/%'"
```

## Curator + Deck + Arena Workflow
```
curator scan → catalog.db              "What's in my collection?"
    ↓
agent: curator query + WebSearch       "Find me a skill for X"     (discovery)
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
