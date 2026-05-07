---
name: lythoskill-creator
version: 0.9.27
type: standard
description: |
  Scaffold and build projects for the lythoskill ecosystem only.
  Creates thin-skill monorepos: heavy logic in npm packages (Starter),
  agent-facing instructions in lightweight SKILL.md (Skill),
  build output committed to skills/ (Output).
when_to_use: |
  Scaffold a lythoskill monorepo, init a lythoskill project,
  add a skill to an existing lythoskill repo,
  build a skill that follows the thin-skill pattern (Starter + Skill + Output),
  lythoskill skill template, new lythoskill repository.
  NOT for: writing a generic skill (just create SKILL.md directly),
  creating a plain npm CLI tool (use your usual scaffolding).
---

# lythoskill-creator

> **Not a generic skill creator.** This scaffolds projects for the lythoskill ecosystem only.
> If you just want to write a skill, create a `SKILL.md` file directly — no tooling needed.

A lythoskill project separates concerns into three layers:

1. **Starter** (`packages/<name>/`): npm-publishable package with CLI. All dependencies managed here.
2. **Skill** (`packages/<name>/skill/`): Thin SKILL.md + scripts that call the starter via `bunx`.
3. **Output** (`skills/<name>/`): Build output copied from Skill layer. Committed to Git so consumers can clone and use without building.

## Scripts

### init

Scaffold a new lythoskill monorepo.

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

Build a skill for distribution. Copies `packages/<name>/skill/` to `skills/<name>/`, strips dev-only files, validates SKILL.md frontmatter, and enforces the unified version.

```bash
bunx lythoskill-creator build <skill-name>
```

Build all skills at once (used by pre-commit):

```bash
bunx lythoskill-creator build --all
```

### align

Audit an existing project against current lythoskill conventions. Reports drift between your project and the latest scaffolding standards.

```bash
# Audit only — reports what would change
bunx lythoskill-creator align

# Auto-fix drift where possible
bunx lythoskill-creator align --fix
```

Checks for: outdated `package.json` scripts, missing `pnpm-workspace.yaml` entries, stale `.gitignore` patterns, missing skill-layer boilerplate, and version mismatches.

Run from the project root. Expects source at `packages/<name>/skill/` and outputs to `skills/<name>/`.
