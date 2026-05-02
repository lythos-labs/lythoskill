# Zero-Script Skill Anatomy

A skill does not require scripts, assets, or a `scripts/` directory. The only required file is `SKILL.md` with valid YAML frontmatter.

## Minimum Viable Skill

```
skill-name/
└── SKILL.md
```

## Frontmatter Requirements

```yaml
---
name: skill-name
version: 1.0.0
type: standard
description: |
  What this skill does and when to use it.
---
```

| Field | Required | Notes |
|-------|----------|-------|
| `name` | Yes | Must match directory name |
| `version` | Yes | Semantic version |
| `type` | Yes | `standard` or `flow` only |
| `description` | Yes | Used for skill matching |
| `when_to_use` | No | Recommended for discovery |

## How Zero-Script Skills Work

1. **Discovery**: The agent platform scans `.claude/skills/` and reads `SKILL.md` frontmatter
2. **Matching**: `description` + `when_to_use` are matched against the user request
3. **Invocation**: On match, the full `SKILL.md` body is loaded into context
4. **Execution**: The agent follows instructions in the body — no external scripts needed

## When to Use Zero-Script

- Purely descriptive skills (guidelines, checklists, policies)
- Skills that only teach the agent how to behave
- Minimal examples and teaching skills

## When to Add Scripts

- Need to run external CLI tools (`bunx`, `npm`, custom binaries)
- Heavy logic that should live in a Starter package
- Reusable automation that agents should not implement inline
