# Level 2: Conflict Governance

> **30 minutes · Prerequisites: Level 1 · ★★★☆☆**

## What You'll Learn

Skills aren't just "on" or "off." They have roles: some are always loaded, some on-demand, some work together. And `max_cards` prevents context pollution.

## Key Concepts

```toml
[deck]
max_cards = 6          # Hard limit. Agent sees at most 6 skills at once.

[innate.skills.project-cortex]
path = "github.com/lythos-labs/lythoskill/skills/lythoskill-project-cortex"
# innate = always loaded. Agent cannot unload it.

[tool.skills.react-best-practices]
path = "github.com/vercel-labs/agent-skills/skills/react-best-practices"
# tool = loaded on demand. Agent decides when to use it.

[combo.fullstack-task]
skills = ["react-best-practices", "tdd", "design-doc-mermaid"]
prompt = "Write tests first with TDD, then build React components, output Mermaid architecture diagram"
# combo = meta-declaration. Uses existing skills, doesn't count against max_cards.
```

## What You Produce

A conflict-free project deck where:
- `innate` skills are always available (deck infrastructure)
- `tool` skills are loaded on demand (no context pollution)
- `combo` declarations chain skills together without extra cost
- `max_cards` prevents skill bloat

## When Conflicts Happen

If two skills both claim the `src/components/` directory for management, deck detects the overlap at `link` time and warns you — before the agent sees conflicting instructions.

## What's Next

Ready to create your own reusable skills? [Go to Level 3](/in-action/level-3).
