---
name: lythoskill-creator
description: |
  Scaffold and build lythoskill projects -- thin skill monorepos where heavy logic
  lives in npm/pip packages and skills are lightweight routers.
---

# lythoskill-creator

A lythoskill project separates concerns into three layers:

1. **Starter** (`packages/<name>/`): npm-publishable package with CLI. All dependencies managed here.
2. **Skill** (`skills/<name>/`): Thin SKILL.md + scripts that call the starter via `bunx`.
3. **Dist** (`dist/<name>/`): Release-ready skill directory for agent consumption.

## Scripts

### init

Scaffold a new lythoskill project.

```bash
bunx lythoskill init <project-name>
```

Creates a monorepo with a starter package and an example skill.

### build

Build a skill for distribution. Strips dev-only files, validates SKILL.md frontmatter, outputs to `dist/`.

```bash
bunx lythoskill build <skill-name>
```

Run from the project root. Expects the skill at `skills/<skill-name>/`.
