# Test Play Mental Model (TCG Analogy)
Arena operations map directly to card game deck-building test play:
| Card game operation | Arena equivalent | Mode |
|---------------------|-----------------|------|
| **Pick a card**: A or B? | `--skills "A,B"` | Mode 1 |
| **Add a card**: Does C improve my deck? | `--decks "v1.toml,v1+C.toml"` | Mode 2 |
| **Cut a card**: Is D dead weight? | `--decks "v1.toml,v1-D.toml"` | Mode 2 |
| **Swap a card**: E instead of F? | `--decks "v1.toml,v1-E+F.toml"` | Mode 2 |
| **Deck duel**: lythos vs superpowers? | `--decks "lythos.toml,superpowers.toml"` | Mode 2 |
## Key Distinction
- **Single-card comparison** (Mode 1): "Which card is better in isolation?"
  Controlled variable — same helper skills, same task, different test skill.
- **Full-deck comparison** (Mode 2): "What is the marginal effect of adding/
  removing/swapping a card in the context of this specific deck?"
  This is what experienced card game players actually optimize for.
The same skill can have completely different marginal value in different
deck contexts (deck synergy). Arena's `--decks` mode captures this.
## Practical Test Play Workflow
```
1. Start with a working deck (your current skill-deck.toml)
2. Identify a candidate skill (from curator index or web search)
3. Create deck variant: copy toml, add the candidate
4. Arena: original vs variant, on a real task
5. If Pareto-improving → adopt. If dominated → skip.
6. Record decision in ADR for future reference.
```
