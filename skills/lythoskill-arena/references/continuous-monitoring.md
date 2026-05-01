# Continuous Skill Monitoring Pipeline
Arena is not just a one-off comparison tool. It can be the evaluation core
of an automated skill monitoring pipeline.

## Why Continuous Monitoring
The skill ecosystem is growing rapidly — new skills publish daily across
GitHub, awesome-agent-skills, Vercel marketplace. Manual tracking is
impossible at scale.

## Pipeline Architecture
```
Subscribe (RSS / awesome-list watch)
    ↓
Discover new skill (curator / web-search)
    ↓
Download to cold pool (git clone)
    ↓
Curator scan → identify "same-niche" overlap    ↓
Arena A/B test (new skill vs existing same-niche)    ↓
Judge generates report.md
    ↓
Viz renders comparison charts
    ↓
Scribe records evaluation history (HANDOFF.md)    ↓
Cortex ADR records selection decision
    ↓
Human final review (5 minutes reading report)
    ↓
Update skill-deck.toml + deck link
```

## Component Roles in the Pipeline
| Component | Pipeline role |
|-----------|-------------|
| web-search / RSS | Discover newly published skills |
| curator | Scan cold pool, identify niche overlaps with existing skills |
| deck | Generate controlled-variable decks for arena |
| **arena** | **Evaluation core**: new vs existing, controlled comparison |
| viz | Render judge scores as visual reports |
| scribe | Record evaluation history, build cumulative knowledge |
| cortex | ADR for formal selection decisions |
## Public Skill Evaluation Blog
Arena reports can be published as a personal/team evaluation database:

- "Deep Research Skill Comparison: Weizhena vs OpenClaw"
- "PDF Analysis Skills: 3 tools on the same arxiv paper"
- "Web Search Skill Evolution: v1.2 vs v2.0"
This is user-perspective evaluation — real data from real tasks, not
skill author self-promotion.
