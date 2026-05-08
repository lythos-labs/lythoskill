# Level 0: Zero-Knowledge Taste

> **5 minutes · No prerequisites beyond Bun · ★☆☆☆☆**

## What You'll Learn

The single concept: `deck` is like *equipping gear* on your agent. Different gear, completely different output.

## Run It

```bash
curl -fsSL https://raw.githubusercontent.com/lythos-labs/lythoskill/main/examples/install-deck.sh | bash
```

This downloads three decks and runs the same prompt against each:

| Deck | What it produces |
|------|-----------------|
| `scout.toml` | Plain text output |
| `documents.toml` | `.docx` formatted document |
| `visual-explainer.toml` | Mermaid diagrams + themed output |

Open the three output directories. Same prompt, same agent, three completely different results.

## What You Just Experienced

- **Before**: agent scans all 50+ installed skills → noise, conflicts, unpredictable output
- **After** (with deck): agent sees only the 1-4 skills you declared → focused, predictable output

## What's Next

If you only have ≤3 skills and no conflicts, you can stop here. No tool needed — just put skills in `.claude/skills/` manually.

If you want per-project skill control, [go to Level 1](/in-action/level-1).
