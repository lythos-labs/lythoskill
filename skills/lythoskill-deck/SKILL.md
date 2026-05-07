---
name: lythoskill-deck
version: 0.9.28
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
  - Bash(bunx @lythos/skill-deck@0.9.28 *)
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
bunx @lythos/skill-deck@0.9.28 link
# Specify a non-default deck file
bunx @lythos/skill-deck@0.9.28 link --deck ./path/to/deck.toml
# Deck in subdirectory, working set anchored to current dir
bunx @lythos/skill-deck@0.9.28 link --deck ./decks/arena.toml --workdir .

# Download a skill to cold pool and add to deck (one-shot)
bunx @lythos/skill-deck@0.9.28 add github.com/owner/repo/skill-name

# Add with explicit alias and section
bunx @lythos/skill-deck@0.9.28 add github.com/owner/repo/skill-name --alias tdd --type tool

# Pull latest versions of declared skills from upstream
bunx @lythos/skill-deck@0.9.28 refresh
# Refresh a single skill by alias or FQ path
bunx @lythos/skill-deck@0.9.28 refresh tdd

# Remove a skill from deck and working set (cold pool untouched)
bunx @lythos/skill-deck@0.9.28 remove tdd

# GC cold pool repos no longer referenced by any deck
bunx @lythos/skill-deck@0.9.28 prune
# Skip confirmation
bunx @lythos/skill-deck@0.9.28 prune --yes

# Then re-sync working set
bunx @lythos/skill-deck@0.9.28 link
```
`link` is a **reconciler** that converges actual state to declared state:
undeclared symlinks → removed; broken/circular symlinks → recreated;
non-symlink entities → backed up then removed; missing declared skills → linked from cold pool.

> **If a declared skill is not in the cold pool**, `link` reports `Skill not found`
> and skips it. Add it first with `bunx @lythos/skill-deck@0.9.28 add <locator>`
> or place it manually in the cold pool.

You never diagnose the working set manually. Just run `link`.

`refresh` pulls the latest version of declared skills from their upstream git
repositories. Pass an alias or FQ path to refresh a single skill; omit to refresh
all declared skills. It skips `localhost/*` skills (user-managed) and non-git
directories. After `refresh`, run `link` to sync any changed skills into the
working set.

> `deck update` is deprecated and will be removed in v1.0.0. Use `refresh`.
## Format Migration
When you read a project's `skill-deck.toml`, check its format **before** running
any `deck` command.

**Old string-array format** (deprecated):
```toml
[tool]
skills = ["github.com/owner/repo/skill-name"]
```

**New alias-as-key dict format** (current):
```toml
[tool.skills.skill-name]
path = "github.com/owner/repo/skill-name"
```

**Agent duty — detect and prompt**: If you see `skills = [...]` (string array)
in any `[innate]`, `[tool]`, or `[transient]` section, the deck is in the deprecated
format. Ask the user whether to migrate before proceeding:

```
⚠️  This deck uses the deprecated string-array format. Run migrate?
   bunx @lythos/skill-deck@0.9.28 migrate-schema
```

Do NOT silently migrate. The user may be maintaining backward compatibility.
Only suggest; let them decide.

**Migration is safe**: `migrate-schema` creates a timestamped backup of the old
deck before writing the new format. Run `migrate-schema --dry-run` first to
preview the diff without modifying the file.
## Initialize
```bash
# Copy template and edit [innate]/[tool] sections
cp ${CLAUDE_SKILL_DIR}/assets/skill-deck.toml.template ./skill-deck.toml
# Or migrate existing unmanaged .claude/skills/
bash ${CLAUDE_SKILL_DIR}/scripts/deck-migrate.sh
```
Then run `bunx @lythos/skill-deck@0.9.28 link` to sync.
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
- **deck does not run post-install steps** — `add`/`link` place skills in the working set. Any additional setup (API keys, env vars, external tool dependencies) is the skill's own responsibility; follow that skill's README.
## Gotchas
**lstatSync, not existsSync**: The reconciler uses `lstatSync` (does not follow
symlinks) to detect entities. `existsSync` returns `false` for broken symlinks,
causing `EEXIST` errors on recreation. If writing custom working-set scripts, use `lstatSync`.
**SKILL.md type field**: Only `standard` or `flow` are valid (agent platform validation).
`innate`/`tool`/`transient` are **skill-deck.toml section names**, not
SKILL.md types. Using them as types causes silent skip.
`combo` is a meta-declaration (skills + prompt), not a skill type.
**Skill locators**: `skill-deck.toml` accepts two locator styles. The FQ locator maps directly to the repository's internal directory structure — no implicit prefix is inserted.

| Style | Example | Reliability |
|-------|---------|-------------|
| Bare name | `lythoskill-deck` | Fragile — only works if skill is at cold-pool root or wins the flat-scan lottery |
| Fully-qualified | `github.com/lythos-labs/lythoskill/skills/lythoskill-deck` | Reliable — deterministic path matching |

If a skill lives at `skills/pdf/` inside the `anthropics/skills` repo, the FQ locator must include the full internal path: `github.com/anthropics/skills/skills/pdf`. The deck does **not** auto-insert a `skills/` prefix.

Bare names fail for monorepo skills because the flat-scan searches `readdirSync` order and is non-deterministic when multiple repos contain the same name. **Always use fully-qualified locators.**

**Agent duty — verify before guessing**: When you encounter an unfamiliar skill repo and are unsure of its internal directory layout (e.g., whether the skill lives at repo root or under `skills/`), use web search to inspect the actual repository structure before writing the locator. Do not guess path segments. Tools like `ghproxy` can accelerate GitHub API access when direct requests time out.

**deck_ prefix**: All custom frontmatter fields in lythoskill use the `deck_` prefix
to avoid collisions with the Agent Skills open standard or future platform extensions.
**deck_skill_type**: Use the custom field `deck_skill_type` to declare a skill's
intrinsic deck role — never overload the official `type` field. `type` is reserved for
agent platform validation (`standard` or `flow` only).

| `deck_skill_type` | When to declare | Why |
|-------------------|-----------------|-----|
| `fork` | Skill is a local adaptation of an upstream skill | Upstream's desc/behavior structurally conflicts with our arena-tested conclusions |
| `transient` | Skill is a temporary workaround with `expires` | Signals "this skill expects to disappear as the ecosystem evolves" |

`innate` / `tool` are **deck-level deployment choices** declared in `skill-deck.toml`
sections, not single-card properties. The same skill can be `innate` in one deck and
`tool` in another.
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
