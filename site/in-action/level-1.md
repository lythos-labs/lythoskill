# Level 1: Your First Deck

> **15 minutes · Prerequisites: Bun · ★★☆☆☆**

## What You'll Learn

Three nouns — that's all the vocabulary you need for this level:

| Term | What it is |
|------|------------|
| **Cold Pool** | Skill warehouse at `~/.agents/skill-repos/`. Agent can't see it. |
| **skill-deck.toml** | Your project's skill manifest. The single source of truth. |
| **Working Set** | The directory the agent actually reads (e.g. `.claude/skills/`). Deck controls it. |

## Run It

```bash
mkdir my-project && cd my-project

# 1. Download skill to cold pool AND write it into deck config
bunx @lythos/skill-deck@latest add github.com/anthropics/skills/skills/pdf

# 2. The CLI auto-generated skill-deck.toml — edit max_cards if needed
# 3. Sync working set from deck declaration
bunx @lythos/skill-deck@latest link

# Verify: agent can only see pdf skill. Other 49 skills are physically absent.
ls .claude/skills/
```

## What You Produce

- `skill-deck.toml` — commit this to git, your team gets the exact same setup
- `skill-deck.lock` — frozen snapshot, used by `reconcile` for drift detection
- `.claude/skills/` — the working set, synced from the deck

## What's Next

You have declaration-based skill control. When you start seeing conflicts between skills, [go to Level 2](/in-action/level-2).
