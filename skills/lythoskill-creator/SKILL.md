---
name: lythoskill-creator
version: 0.4.0
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
bunx lythoskill-creator init <project-name>
```

Creates a monorepo with a starter package and an example skill.

### add-skill

Add a new skill to an existing lythoskill monorepo.

```bash
bunx lythoskill-creator add-skill <skill-name>
```

Creates starter package + skill layer under `packages/<skill-name>/`. Requires `package.json` and `pnpm-workspace.yaml` in the current directory (monorepo root). Skips existing files.

### build

Build a skill. Copies `packages/<name>/skill/` to `skills/<name>/`, strips dev-only files, validates SKILL.md frontmatter.

```bash
bunx lythoskill-creator build <skill-name>
```

Run from the project root. Expects source at `packages/<name>/skill/` and outputs to `skills/<name>/`.
