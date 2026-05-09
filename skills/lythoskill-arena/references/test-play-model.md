# Test Play Mental Model (TCG Analogy)
Arena operations map directly to card game deck-building test play:
| Card game operation | Arena equivalent | Mode |
|---------------------|-----------------|------|
| **Pick a card**: A or B? | `run --config examples/arena/research-compare/arena.toml` | declarative |
| **Add a card**: Does C improve my deck? | `--decks "https://raw.githubusercontent.com/lythos-labs/lythoskill/main/examples/decks/arena-add-remove/base.toml,https://raw.githubusercontent.com/lythos-labs/lythoskill/main/examples/decks/arena-add-remove/plus-research.toml"` | deck-compare |
| **Cut a card**: Is D dead weight? | `--decks "https://raw.githubusercontent.com/lythos-labs/lythoskill/main/examples/decks/arena-add-remove/base.toml,https://raw.githubusercontent.com/lythos-labs/lythoskill/main/examples/decks/arena-add-remove/minus-pdf.toml"` | deck-compare |
| **Swap a card**: E instead of F? | `--decks "https://raw.githubusercontent.com/lythos-labs/lythoskill/main/examples/decks/arena-add-remove/base.toml,https://raw.githubusercontent.com/lythos-labs/lythoskill/main/examples/decks/arena-add-remove/plus-research.toml"` | deck-compare |
| **Deck duel**: lythos vs superpowers? | `--decks "lythos.toml,superpowers.toml"` | deck-compare |
## Key Distinction
- **Single-card comparison** (Mode 1): "Which card is better in isolation?"
  Controlled variable — same helper skills, same task, different test skill.
- **Full-deck comparison** (deck-compare): "What is the marginal effect of adding/
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
