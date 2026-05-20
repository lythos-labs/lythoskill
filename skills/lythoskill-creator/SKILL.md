---
name: lythoskill-creator
version: 0.15.1
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
bunx @lythos/skill-creator@0.15.1 init <project-name>
```

Creates a monorepo with a starter package and an example skill.

### add-skill

Add a new skill to an existing lythoskill monorepo. Follows the cortex Step 1/2/3 pattern:
CLI creates template → agent fills content → probe verifies.

```bash
bunx @lythos/skill-creator@0.15.1 add-skill <skill-name>
```

**Step 1 (CLI)**: Creates `packages/<skill-name>/skill/SKILL.md` template.
**Step 2 (agent)**: Edit SKILL.md — fill description, when_to_use, body, gotchas.
  → After editing, run `bunx @lythos/skill-coach` to validate against 12-dimension quality rubric.
  → Fix issues coach flags, then proceed to Step 3.
**Step 3 (verify)**: Run `cortex probe` to confirm no empty-shell template.

**Two skill types, decided upfront**:

| Type | Has CLI? | Has package.json? | npm publish? | Example |
|------|----------|-------------------|-------------|---------|
| **Skill + CLI** | ✅ bin field | ✅ required | ✅ to npm | deck, arena, curator, cortex |
| **Pure skill** | ❌ no CLI | ❌ none needed | ❌ skip | scribe, onboarding, coach, journalist |

- **Skill + CLI**: `add-skill` creates `packages/<name>/` with `package.json` + `src/cli.ts` + `skill/SKILL.md`. Add to `scripts/publish.sh` PACKAGES array.
- **Pure skill**: Create `packages/<name>/skill/SKILL.md` directly. No package.json, no CLI, no npm. Distribution via cold pool (git clone / localhost). The pre-commit build hook auto-creates `skills/<name>/` output.

**After creation**: run `bunx @lythos/skill-creator build <name>` to build the skill output, then `git add skills/<name>/`.

### build

Build a skill for distribution. Copies `packages/<name>/skill/` to `skills/<name>/`, strips dev-only files, validates SKILL.md frontmatter, and enforces the unified version.

```bash
bunx @lythos/skill-creator@0.15.1 build <skill-name>
```

Build all skills at once (used by pre-commit):

```bash
bunx @lythos/skill-creator@0.15.1 build --all
```

### align

Audit an existing project against current lythoskill conventions. Reports drift between your project and the latest scaffolding standards.

```bash
# Audit only — reports what would change
bunx @lythos/skill-creator@0.15.1 align

# Auto-fix drift where possible
bunx @lythos/skill-creator@0.15.1 align --fix
```

Checks for: outdated `package.json` scripts, stale `.gitignore` patterns, missing skill-layer boilerplate, and version mismatches.

### bump

Lock-step version bump for the entire monorepo. Updates root `package.json` + every `packages/*/package.json` to the same version (per `project_lockstep_versioning` policy). Used before `npm publish` runs.

```bash
# Semver targets
bunx @lythos/skill-creator@0.15.1 bump patch
bunx @lythos/skill-creator@0.15.1 bump minor
bunx @lythos/skill-creator@0.15.1 bump major

# Explicit version (e.g. for major milestones)
bunx @lythos/skill-creator@0.15.1 bump 1.0.0

# Preview the bump without writing files
bunx @lythos/skill-creator@0.15.1 bump 1.0.0 --dry-run
```

Run from the project root. Expects source at `packages/<name>/skill/` and outputs to `skills/<name>/`.
