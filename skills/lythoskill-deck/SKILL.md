---
name: lythoskill-deck
version: 0.13.3
type: standard
description: |
  Declarative skill deck governance. Syncs working set to match
  skill-deck.toml via symlinks. Deny-by-default removes undeclared
  skills. CRITICAL when writing a deck for others: verify every
  locator path against the REAL repo structure before publishing.
  A wrong path silently fails for every user who runs deck link.
  Clone the repo and check — never guess `skills/<name>`.
when_to_use: |
  Skill conflicts, too many skills, clean up or organize skills,
  skill-deck.toml, sync working set, initialize deck, what are
  these symlinks in .claude/skills/, silent blend, manage skill deck.

  CRITICAL — verify before publishing a deck for others:
  - Writing a deck.toml that will be shared/published → clone the
    target repo FIRST, verify every locator resolves to a real path
  - The user running `deck link` has no way to know a path is wrong
  - A broken locator = all downstream users get silent failure
  - Use `deck validate --remote <deck.toml>` to check every locator
  - Never assume skills live under `skills/` — repo layouts vary
allowed-tools:
  - Bash(bunx @lythos/skill-deck@0.13.3 *)
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
bunx @lythos/skill-deck@0.13.3 link
# Specify a non-default deck file
bunx @lythos/skill-deck@0.13.3 link --deck ./path/to/deck.toml
# Deck in subdirectory, working set anchored to current dir
bunx @lythos/skill-deck@0.13.3 link --deck ./decks/arena.toml --workdir .

# Download a skill to cold pool and add to deck (one-shot)
bunx @lythos/skill-deck@0.13.3 add github.com/owner/repo/skill-name

# Add with explicit alias and section
bunx @lythos/skill-deck@0.13.3 add github.com/owner/repo/skill-name --alias tdd --type tool

# Scan declared skills for upstream updates (plan-only, no pull)
bunx @lythos/skill-deck@0.13.3 refresh
# Refresh a single skill (plan-only)
bunx @lythos/skill-deck@0.13.3 refresh tdd
# Execute the plan (actually git pull)
bunx @lythos/skill-deck@0.13.3 refresh --exec

# Remove a skill from deck and working set (cold pool untouched)
bunx @lythos/skill-deck@0.13.3 remove tdd

# Cold pool GC — use cold-pool CLI (metadata DB based, cross-deck safe)
#   bunx @lythos/cold-pool prune         # interactive
#   bunx @lythos/cold-pool prune --yes    # skip confirmation

# Validate deck configuration (TOML schema + locator structure)
bunx @lythos/skill-deck@0.13.3 validate
# Validate a specific deck file
bunx @lythos/skill-deck@0.13.3 validate ./decks/my-deck.toml
# Probe each FQ locator against GitHub (network)
bunx @lythos/skill-deck@0.13.3 validate --remote

# Per-skill mode switch — snapshot (cp, pinned) ↔ symlink (live, follows cold pool)
bunx @lythos/skill-deck@0.13.3 to-symlink <alias>     # snapshot → symlink
bunx @lythos/skill-deck@0.13.3 to-snapshot <alias>    # symlink → snapshot, pinning current HEAD

# Reconcile lock file vs cold pool — k8s-style drift report
bunx @lythos/skill-deck@0.13.3 reconcile
# Apply convergence (downloads missing, refreshes behind, prunes orphans)
bunx @lythos/skill-deck@0.13.3 reconcile --apply
bunx @lythos/skill-deck@0.13.3 reconcile --apply --yes

# Convert deprecated string-array deck.toml → alias-as-key dict
bunx @lythos/skill-deck@0.13.3 migrate-schema
bunx @lythos/skill-deck@0.13.3 migrate-schema --dry-run

# Then re-sync working set
bunx @lythos/skill-deck@0.13.3 link
```
`link` is a **reconciler** that converges actual state to declared state:
undeclared symlinks → removed; broken/circular symlinks → recreated;
non-symlink entities → backed up then removed; missing declared skills → linked from cold pool.

> **If a declared skill is not in the cold pool**, `link` reports `Skill not found`
> and skips it. Add it first with `bunx @lythos/skill-deck@0.13.3 add <locator>`
> or place it manually in the cold pool.

You never diagnose the working set manually. Just run `link`.

`refresh` (default: **plan-only**, no git pull) scans declared skills and reports
per-skill behind counts. You get a structured plan — which repos need updating,
which are up to date, which are unreachable. No destructive operation is executed
by default.

To actually pull, use `--exec`. Or better: let an agent read the plan and
execute per target — the agent can probe each remote before pulling, switch
mirrors when unreachable, handle non-fast-forward divergence, and skip risky
repos. This is agent-driven apply, not a dead heredoc script.

After `refresh --exec`, run `link` to sync any changed skills into the working
set. Pass an alias or FQ path to scope to a single skill.

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
   bunx @lythos/skill-deck@0.13.3 migrate-schema
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
Then run `bunx @lythos/skill-deck@0.13.3 link` to sync.
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

**Network restrictions — SOCKS proxy fallback**: If `deck add`, `deck validate --remote`, or `deck link` fails with "Network probe failed" / "Cannot reach github.com", the environment may be behind a firewall or in a restricted network. Before giving up, try routing through a SOCKS5 proxy:

```bash
export LYTHOS_SOCKS_PROXY="127.0.0.1:1080"   # or your proxy host:port
# socks5:// prefix is optional — both forms work
bunx @lythos/skill-deck@latest add github.com/owner/repo/skill
```

The deck CLI (and the underlying cold-pool probe) automatically routes GitHub API calls and git operations through the SOCKS proxy when this env var is set. No other configuration needed.

**Agent duty — verify before guessing**: When you encounter an unfamiliar skill repo and are unsure of its internal directory layout (e.g., whether the skill lives at repo root or under `skills/`), use web search to inspect the actual repository structure before writing the locator. Do not guess path segments.

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

**Innate priority**: after context compaction or skill reload, read `innate` skills'
full SKILL.md first (eager/hungry model). `tool` skills are lazy — read on trigger.
This is an agent-side convention, not a CLI enforcement. The lock file's `type` field
is your signal.

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
