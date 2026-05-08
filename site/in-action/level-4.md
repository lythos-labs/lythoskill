# Level 4: Scientific Evaluation

> **2 hours · Prerequisites: Level 3 · ★★★★☆**

## What You'll Learn

"Squads argue over whether to add skill X to the standard deck." Stop arguing. Test it.

Arena is A/B testing for agent skills: same task, different decks, subagent scoring. Output is data, not opinions.

## Run It

```bash
# Compare: with design skill vs without
bunx @lythos/skill-arena@latest run \
  --decks "baseline.toml,baseline+design.toml" \
  --task "Write a login page with form validation and error messages" \
  --criteria "visual-quality,code-maintainability,token-efficiency"
```

## What You Get

- **Per-cell verdicts**: PASS/FAIL on each criterion for each (player, deck) combination
- **Pareto frontier**: which combinations are on the frontier, which are dominated
- **Comparative judge report**: LLM-based scoring across all criteria

## Core Concept: L3 Trust

Arena results = your own data. Higher weight than author descriptions (L1) or community stars (L2). Only arena-tested results are activation authority.

```
curator scan → arena compare → deck add the winner
```

## What's Next

Ready to scale this across a team or organization? [Go to Level 5](/in-action/level-5).
