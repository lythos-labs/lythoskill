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

## Scripts

### init

Scaffold a new lythoskill project.

```bash
bunx @lythos/creator init <project-name>
```

Creates a monorepo with a starter package and an example skill.

### build

Build a skill. Copies `packages/<name>/skill/` to `skills/<name>/`, strips dev-only files, validates SKILL.md frontmatter.

```bash
bunx @lythos/creator build <skill-name>
```

Run from the project root. Expects source at `packages/<name>/skill/` and outputs to `skills/<name>/`.
