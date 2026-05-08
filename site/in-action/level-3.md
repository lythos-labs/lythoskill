# Level 3: Skill Author

> **1-2 hours · Prerequisites: Level 2 · ★★★★☆**

## What You'll Learn

The **Thin Skill Pattern** — separating implementation (npm package) from instruction (SKILL.md). Your internal tool's usage guide becomes a reusable, installable skill.

## Three-Layer Architecture

| Layer | Where | Role |
|-------|-------|------|
| **Starter** | npm package (`packages/<name>/`) | Implementation + CLI. Developer-facing. |
| **Skill** | `SKILL.md` + references | Agent instruction. Lightweight, no runtime deps. |
| **Output** | `skills/<name>/` | Build artifact. Committed to git, installable via `deck add`. |

## Run It

```bash
# Scaffold a new skill package
bunx @lythos/skill-creator@latest init my-skill
cd my-skill

# Write your business logic in packages/my-skill/
# Write agent instructions in packages/my-skill/skill/SKILL.md

# Build: renders SKILL.md with version placeholders → skills/my-skill/
bunx @lythos/skill-creator@latest build my-skill
```

Your skill is now installable: `deck add github.com/your-org/my-repo/skills/my-skill`

## Design Principles

- **SKILL.md is a template**: `{{PACKAGE_VERSION}}` placeholders are replaced at build time.
- **`packages/<name>/skill/` existence = skill product**: the build filter.
- **One skill, one focus**: don't cram multiple unrelated workflows into one SKILL.md.

## What's Next

When you have multiple candidate skills and need to decide which one is better, [go to Level 4](/in-action/level-4).
