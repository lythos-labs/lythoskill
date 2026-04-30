# Agent-Initiated Arena Workflow
When the user asks "help me do X" and the agent discovers multiple viable
skill/deck configurations, the agent can **proactively initiate an arena**
to make a data-driven decision instead of guessing.

## Scenario Example
User: "Help me write architecture design docs for this project."
Agent finds 3 architecture skills in cold pool:
- `design-doc-mermaid` (flowchart-oriented)
- `design-doc-d2` (modern diagram syntax)
- `design-doc-excalidraw` (hand-drawn style)

## Agent's Self-Initiated Flow
1. Create arena: `bunx @lythos/skill-arena --task "..." --skills "mermaid,d2,excalidraw"`
2. Read TASK-arena.md, dispatch subagents per deck
3. Collect outputs to `runs/`
4. Judge (agent itself) scores across criteria
5. Generate `report.md` with Pareto frontier
6. Recommend best-fit configuration to user
7. Archive decision:
   - ADR: "Why mermaid over d2" with data   - Task: "Revisit in one month"
8. Update skill-deck.toml, run `deck link`

## Why Proactive Arena
**Avoids intuition bias.** An LLM choosing a skill without evaluation data
is no better than a human saying "I think A is better." Arena provides
reproducible, data-backed evidence.

**Cortex archival value:**
- ADR records "we tested design-doc skills on 2026-04-24, mermaid won on context-fit"
- New agent reads ADR → knows the history → doesn't re-evaluate unnecessarily
- Task tracks "revisit in one month" → continuous evaluation loop
## Minimal A/B (Two Candidates Only)
For just 2 candidates, skip the full arena scaffold:
```bash
# Quick inline A/B
bunx @lythos/skill-deck link --deck /tmp/deck-A.toml
# → complete task → save output A
bunx @lythos/skill-deck link --deck /tmp/deck-B.toml
# → complete same task → save output B
# Compare, recommend, restore parent deck
bunx @lythos/skill-deck link --deck ./skill-deck.toml
```
## Judge = Agent, Agent = Judge
The executing agent and judge can be the same agent in different modes:
- **Execute**: complete task with deck A → `run-A.md`
- **Execute**: complete task with deck B → `run-B.md`
- **Judge**: read both, compare, score, produce conclusion
No separate "judge agent" required. Same agent, different context.
## Decision Boundaries
- Agent **can**: search for skills, download to cold pool, scaffold arena, execute, judge
- Agent **should**: inform user before downloading, show candidates before arena
- Agent **must not**: remove existing deck entries without user confirmation
- Agent **should**: flag same-niche conflicts and suggest arena when discovered
