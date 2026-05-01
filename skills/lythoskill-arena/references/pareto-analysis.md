# Pareto Frontier Analysis
## Why Not Pick a Winner
Single-objective evaluation compresses multiple dimensions into one scalar.
This is inappropriate for skill ecosystems where trade-offs are real:
- A token-efficient but medium-quality deck
- A high-quality but token-expensive deck
Both can be on the Pareto frontier — neither dominates the other across all
dimensions. The choice depends on what the user values most.
## MOO (Multi-Objective Optimization) Scoring
```
            token efficiency ↑                │                │    ★ Deck C (high quality, moderate tokens)                │         ← Pareto frontier                │  ★ Deck B (moderate quality, low tokens)                │                │              ★ Deck A (high quality, high tokens)                │                   ← dominated by C (same quality, more expensive)                └──────────────────────── output quality →
```
## Judge Output Format (Mode 2)
The judge produces four deliverables:
1. **Score vector per deck**: Each evaluation criterion scored 1–5
2. **Pareto non-dominated set**: Decks where no other deck is strictly better
   across all dimensions
3. **Dominated solution analysis**: For each dominated deck, identify which
   deck dominates it and on which dimensions
4. **Emergent combo annotations**: If multiple skills in a deck produce 1+1>2
   synergy effects, flag them separately
## Example Judge Output
```markdown
| Deck | quality | token | maintainability | Dominated by |
|------|---------|-------|-----------------|-------------|
| minimal | 3 | 5 | 4 | — (frontier) |
| rich | 5 | 2 | 5 | — (frontier) |
| superpowers | 4 | 2 | 3 | rich (same token, lower quality+maint) |
Pareto frontier: {minimal, rich}
Emergent combo: rich deck's project-cortex + repomix-handoff produce
structured-then-packaged workflow not achievable by either alone.
```

## When to Use Pareto vs Winner
| Scenario | Approach |
|----------|----------|
| Quick A/B between 2 skills | Mode 1: single winner is fine |
| Comparing 3+ full decks | Mode 2: Pareto frontier |
| User has clear single priority | Either mode, weight that criterion |
| User has mixed priorities | Mode 2: show frontier, let user decide |
