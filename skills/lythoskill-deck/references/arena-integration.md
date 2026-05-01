# Arena Integration: Deck Isolation
skill-arena evaluates skill effectiveness via controlled-variable experiments.
Its core dependency is deck's isolation capability.
## Isolation Flow
```
Parent deck (skill-deck.toml): 28 skills
    │
    ▼  Arena starts
Temporary deck (arena-run-01.toml): 2 skills
├── Variable: 1 skill under test
└── Control: 1 helper skill (constant)
    │
    ▼  Subagent executes task
Collect output
    │
    ▼  Restore parent deck (mandatory!)
Back to 28 skills
```

## Control Variable Principle
Output differences must converge to the **single variable** (the skill under test).
All other conditions — prompt, context, judge persona, helper skills — must be identical.

## Parent Deck Restoration
After each subagent completes, execute `link --deck ./skill-deck.toml` to restore
the parent deck. Forgetting this means subsequent work runs on the stripped-down arena deck.

## Pareto Analysis
Arena does not pick a "winner." It outputs a score vector across dimensions
(quality, token efficiency, maintainability) and identifies the **Pareto frontier** —
non-dominated solutions where no option is strictly better than another across all dimensions.
## Full Deck Comparison
```bash
bunx @lythos/skill-arena \
  --task "Generate auth flow diagram" \  --decks "minimal.toml,rich.toml,superpowers.toml" \  --criteria "quality,token,maintainability"
```

`--decks` mode tests complete deck configurations (synergy effects).
The same skill can have different marginal value in different deck contexts.
