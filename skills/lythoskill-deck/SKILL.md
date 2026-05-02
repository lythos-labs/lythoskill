---
name: lythoskill-deck
version: 0.7.1
type: standard
description: |
  Declarative skill deck governance. Syncs .claude/skills/ working set
  to match skill-deck.toml declarations via symlinks. Undeclared skills
  are physically removed (deny-by-default), eliminating silent conflicts
  and context pollution from excess skill descriptions.
when_to_use: |
  Skill conflicts, too many skills, clean up or organize skills,
  skill-deck.toml, sync working set, initialize deck, what are
  these symlinks in .claude/skills/, silent blend, manage skill deck.
allowed-tools:
  - Bash(bunx @lythos/skill-deck *)
# ── deck governance metadata (consumed by lythoskill tooling, not by agent platforms) ──
deck_niche: meta.governance.deck
deck_dependencies:
  runtime: [bash]
  optional: [bun]
deck_managed_dirs:
  - .claude/skills/
  - skill-deck.lock
---

# lythoskill-deck: Declarative Skill Deck Governance
> What matters is not how many skills you have, but which ones the agent sees at the same time.
## What This Does
`skill-deck.toml` declares which skills a project needs. `deck link` creates
symlinks in `.claude/skills/` for declared skills and **removes everything else**.
This is deny-by-default: undeclared skills do not exist in the agent's view.
## Commands
```bash
# Always run from your project root (where skill-deck.toml lives)
cd /path/to/your-project

# Reconcile working set to match declarations (the routine command)
bunx @lythos/skill-deck link
# Specify a non-default deck file
bunx @lythos/skill-deck link --deck ./path/to/deck.toml
# Deck in subdirectory, working set anchored to current dir
bunx @lythos/skill-deck link --deck ./decks/arena.toml --workdir .

# Download a skill to cold pool and add to deck (one-shot)
bunx @lythos/skill-deck add github.com/owner/repo/skill-name
# Or via Vercel skills.sh
bunx @lythos/skill-deck add owner/repo --via skills.sh

# Pull latest versions of declared skills from upstream
bunx @lythos/skill-deck update
# Then re-sync working set
bunx @lythos/skill-deck link
```
`link` is a **reconciler** that converges actual state to declared state:
undeclared symlinks → removed; broken/circular symlinks → recreated;
non-symlink entities → backed up then removed; missing declared skills → linked from cold pool.

> **If a declared skill is not in the cold pool**, `link` reports `Skill not found`
> and skips it. Add it first with `bunx @lythos/skill-deck add <locator>`
> or place it manually in the cold pool.

You never diagnose the working set manually. Just run `link`.

`update` pulls the latest version of each declared skill from its upstream git
repository. It skips `localhost/*` skills (user-managed) and non-git directories.
After `update`, run `link` to sync any changed skills into the working set.
## Initialize
```bash
# Copy template and edit [innate]/[tool] sections
cp ${CLAUDE_SKILL_DIR}/assets/skill-deck.toml.template ./skill-deck.toml
# Or migrate existing unmanaged .claude/skills/
bash ${CLAUDE_SKILL_DIR}/scripts/deck-migrate.sh
```
Then run `bunx @lythos/skill-deck link` to sync.
## Diagnose (read-only)
```bash
bash ${CLAUDE_SKILL_DIR}/scripts/deck-status.sh
```
Reports skills in cold pool but not in deck, expiring transients, managed-dir overlaps.
## Key Concepts
| Concept | One-liner |
|---------|-----------|
| **Cold Pool** | All downloaded skills (`~/.agents/skill-repos/`). Agent cannot see here. |
| **skill-deck.toml** | Declares desired state: "this project uses these skills." |
| **`deck link`** | Reconciler. Makes `.claude/skills/` match the declaration. |
| **Working Set** | `.claude/skills/` — symlinks only. What the agent actually scans. |
| **skill-deck.lock** | Machine-generated snapshot: resolved paths, hashes, constraints. |
## Constraints
- **deny-by-default** — undeclared skills are physically absent.
- **link backs up real directories** — non-symlink entries in `.claude/skills/` are archived to `.claude/skills.bak.YYYYMMDD-HHMMSS.tar.gz` before removal. Total size > 100MB causes link to refuse (use `--no-backup` or clean up manually).
- **max_cards** — exceeding the budget causes link to refuse.
- **transient expires** — past-due transients trigger warnings.
- **managed_dirs overlap** — two skills claiming the same directory triggers a warning.
- **Never manually create subdirectories in `.claude/skills/`.** Use `deck link`. Manual directories become untracked "ghost skills" that get backed up and removed on the next link.
## Gotchas
**lstatSync, not existsSync**: The reconciler uses `lstatSync` (does not follow
symlinks) to detect entities. `existsSync` returns `false` for broken symlinks,
causing `EEXIST` errors on recreation. If writing custom working-set scripts, use `lstatSync`.
**SKILL.md type field**: Only `standard` or `flow` are valid (agent platform validation).
`innate`/`tool`/`combo`/`transient` are **skill-deck.toml section names**, not
SKILL.md types. Using them as types causes silent skip.
**Skill locators**: `skill-deck.toml` accepts two locator styles. The cold pool uses Go module-style layout (`host/owner/repo/skills/name`).

| Style | Example | Reliability |
|-------|---------|-------------|
| Bare name | `lythoskill-deck` | Fragile — only works if skill is at cold-pool root or wins the flat-scan lottery |
| Fully-qualified | `github.com/lythos-labs/lythoskill/lythoskill-deck` | Reliable — deterministic path matching |

Bare names fail for monorepo skills because the flat-scan searches `readdirSync` order and is non-deterministic when multiple repos contain the same name. **Always use fully-qualified locators.**

**deck_ prefix**: All custom frontmatter fields in lythoskill use the `deck_` prefix
to avoid collisions with the Agent Skills open standard or future platform extensions.
**Standard compliance**: lythoskill-deck does not modify the Agent Skills standard.
Every skill remains a directory with SKILL.md. Deck only controls which directories
appear in `.claude/skills/`. Without deck, skills work normally via manual placement.
## Supporting References
Read these **only when the specific topic arises**:
| When you need to… | Read |
|--------------------|------|
| Understand the cold pool → deck → working set pipeline | [references/architecture.md](./references/architecture.md) |
| Look up a lythoskill term (silent blend, niche, transient…) | [references/glossary.md](./references/glossary.md) |
| Write or edit a skill-deck.toml file | [references/toml-format.md](./references/toml-format.md) |
| Set up a cold pool for the first time | [references/cold-pool-setup.md](./references/cold-pool-setup.md) |
| Choose, compare, or organize skills for a deck | [references/deck-building.md](./references/deck-building.md) |
| Run arena benchmarks with deck isolation | [references/arena-integration.md](./references/arena-integration.md) |
| Understand SKILL.md type values or skill thickness layers | [references/skill-types.md](./references/skill-types.md) |
| Add custom frontmatter fields to a skill | [references/custom-fields.md](./references/custom-fields.md) |
