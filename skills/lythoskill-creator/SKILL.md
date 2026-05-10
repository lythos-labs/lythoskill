---
name: lythoskill-creator
version: 0.9.48
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
bunx @lythos/skill-creator@0.9.48 init <project-name>
```

Creates a monorepo with a starter package and an example skill.

### add-skill

Add a new skill to an existing lythoskill monorepo.

```bash
bunx @lythos/skill-creator@0.9.48 add-skill <skill-name>
```

Creates starter package + skill layer under `packages/<skill-name>/`. Requires `package.json` in the current directory (monorepo root). Skips existing files.

### build

Build a skill for distribution. Copies `packages/<name>/skill/` to `skills/<name>/`, strips dev-only files, validates SKILL.md frontmatter, and enforces the unified version.

```bash
bunx @lythos/skill-creator@0.9.48 build <skill-name>
```

Build all skills at once (used by pre-commit):

```bash
bunx @lythos/skill-creator@0.9.48 build --all
```

### align

Audit an existing project against current lythoskill conventions. Reports drift between your project and the latest scaffolding standards.

```bash
# Audit only — reports what would change
bunx @lythos/skill-creator@0.9.48 align

# Auto-fix drift where possible
bunx @lythos/skill-creator@0.9.48 align --fix
```

Checks for: outdated `package.json` scripts, stale `.gitignore` patterns, missing skill-layer boilerplate, and version mismatches.

### bump

Lock-step version bump for the entire monorepo. Updates root `package.json` + every `packages/*/package.json` to the same version (per `project_lockstep_versioning` policy). Used before `npm publish` runs.

```bash
# Semver targets
bunx @lythos/skill-creator@0.9.48 bump patch
bunx @lythos/skill-creator@0.9.48 bump minor
bunx @lythos/skill-creator@0.9.48 bump major

# Explicit version (e.g. for major milestones)
bunx @lythos/skill-creator@0.9.48 bump 1.0.0

# Preview the bump without writing files
bunx @lythos/skill-creator@0.9.48 bump 1.0.0 --dry-run
```

Run from the project root. Expects source at `packages/<name>/skill/` and outputs to `skills/<name>/`.
