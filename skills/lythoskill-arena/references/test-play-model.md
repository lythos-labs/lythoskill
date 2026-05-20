# Test Play Mental Model (TCG Analogy)
Arena operations map directly to card game deck-building test play:
| Card game operation | Arena equivalent | Mode |
|---------------------|-----------------|------|
| **Pick a card**: A or B? | `arena vs --config arena.toml` | declarative |
| **Add a card**: Does C improve my deck? | two-deck `arena.toml` (base vs +research) | vs |
| **Cut a card**: Is D dead weight? | two-deck `arena.toml` (base vs -pdf) | vs |
| **Swap a card**: E instead of F? | two-deck `arena.toml` (base vs +variant) | vs |
| **Deck duel**: lythos vs superpowers? | `arena vs --config duel.toml` | vs |
## Key Distinction
- **Single-deck test** (`arena single`): "Is this deck good for this task?"
  One deck, one task — quick sanity check before committing.
- **Multi-deck comparison** (`arena vs`): "What is the marginal effect of adding/
  removing/swapping a card in the context of this specific deck?"
  This is what experienced card game players actually optimize for.
The same skill can have completely different marginal value in different
deck contexts (deck synergy). Arena's `vs --config arena.toml` captures this.
## Practical Test Play Workflow
```
1. Start with a working deck (your current skill-deck.toml)
2. Identify a candidate skill (from curator index or web search)
3. Create deck variant: copy toml, add the candidate
4. Arena: original vs variant, on a real task
5. If Pareto-improving → adopt. If dominated → skip.
6. Record decision in ADR for future reference.
```
