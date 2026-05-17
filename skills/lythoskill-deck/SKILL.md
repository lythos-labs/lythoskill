---
name: lythoskill-deck
version: 0.14.2
type: standard
description: |
  Declarative skill deck governance. `deck link` reconciles the working set
  to match skill-deck.toml — deny-by-default removes undeclared skills.
  DEFAULT patterns: PHASE SWITCH via separate deck files (deck link --deck
  phase<N>.toml), SEED bootstrap (minimal deck → agent self-expands via
  deck add + curator discovery). Always restores parent deck. Zero state
  pollution between phases. INNATE FIRST: after compaction, session reload,
  or skill refresh — read every innate skill's full SKILL.md before any
  tool skill. Innate = eagerly loaded, always full context. Tool = lazy,
  read only on trigger. CRITICAL when writing a deck for others: verify
  every locator path against the REAL repo structure before publishing.
when_to_use: |
  Skill conflicts, too many skills, clean up or organize skills,
  skill-deck.toml, sync working set, initialize deck, manage skill deck,
  phase switch, seed bootstrap, fork to localhost, multi-file deck,
  deck add, deck link, deck refresh, deck validate, deck remove,
  silent blend, what are these symlinks in .claude/skills/.
  ALSO trigger when user says "switch deck", "add skill", "remove skill",
  "clean up skills", "organize my deck", "create phase deck".
allowed-tools:
  - Bash(bunx @lythos/skill-deck@0.14.2 *)
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

## Core Model

`skill-deck.toml` declares desired state. `deck link` makes `.claude/skills/` match — creates symlinks for declared skills, removes everything else. Deny-by-default: undeclared skills do not exist in the agent's view.

```
Cold Pool (~/.agents/skill-repos/)  →  deck add  →  skill-deck.toml  →  deck link  →  .claude/skills/
     (all downloaded skills)              (declare)      (desired state)    (reconcile)    (working set — what agent sees)
```

## Multi-File Phase Decks (BEST PRACTICE)

When a task spans different skill sets, use **separate deck files per phase** instead of editing a single toml:

```bash
# Phase 1 — brand design
deck link --deck phase1-brand.toml --cold-pool ~/.agents/skill-repos

# Phase 2 — content creation (atomic switch, Phase 1 skills gone)
deck link --deck phase2-content.toml --cold-pool ~/.agents/skill-repos

# Done — restore parent deck
deck link --deck ./skill-deck.toml
```

Each phase deck is independently auditable. Never add/remove entries in-place when switching contexts — a wrong edit silently breaks the previous phase's composition. The reconciler handles the transition: old symlinks removed, new ones created, no state leaks.

## Seed Bootstrap

Start with a minimal deck (only lythoskill-deck as innate). The agent reads deck SKILL.md → learns schema → uses curator `name LIKE '%keyword%'` to discover skills → `deck add` + `deck link` → self-expands. Governance skill is the only irreducible dependency.

```toml
[deck]
max_cards = 8
cold_pool = "~/.agents/skill-repos"
working_set = ".claude/skills"

[innate.skills.lythoskill-deck]
path = "github.com/lythos-labs/lythoskill/skills/lythoskill-deck"
```

## Commands

```bash
# ── Core (use these every time) ──

# Reconcile working set to match declaration
bunx @lythos/skill-deck@0.14.2 link
bunx @lythos/skill-deck@0.14.2 link --deck ./phase1-brand.toml

# Add skill from cold pool or download URL
bunx @lythos/skill-deck@0.14.2 add github.com/owner/repo/skill-name
bunx @lythos/skill-deck@0.14.2 add github.com/owner/repo/skill-name --alias my-skill --type tool

# ── Maintenance ──

bunx @lythos/skill-deck@0.14.2 refresh              # plan-only scan for updates
bunx @lythos/skill-deck@0.14.2 refresh --exec       # actually git pull
bunx @lythos/skill-deck@0.14.2 remove <alias>       # remove from deck + working set
bunx @lythos/skill-deck@0.14.2 validate             # check TOML schema
bunx @lythos/skill-deck@0.14.2 validate --remote    # probe locators against GitHub

# ── Advanced ──

bunx @lythos/skill-deck@0.14.2 to-symlink <alias>   # snapshot → symlink
bunx @lythos/skill-deck@0.14.2 to-snapshot <alias>  # symlink → snapshot (pin HEAD)
bunx @lythos/skill-deck@0.14.2 reconcile            # drift report vs cold pool
bunx @lythos/skill-deck@0.14.2 reconcile --apply    # converge
bunx @lythos/skill-deck@0.14.2 migrate-schema       # old string-array → alias-as-key
```

`link` is a reconciler: undeclared symlinks → removed; broken symlinks → recreated; non-symlink entities → backed up then removed; missing declared skills → linked from cold pool.

`refresh` defaults to **plan-only** (no git pull). Use `--exec` to apply, or let an agent read the plan and execute per target — the agent can probe remotes, switch mirrors, handle divergence.

> `deck update` is deprecated. Use `refresh`.

## Format Detection (agent duty)

Before running any `deck` command, check the toml format. If you see `skills = [...]` (string array), it's the deprecated format. Ask before migrating:

```
⚠️  This deck uses the deprecated string-array format. Run migrate?
   bunx @lythos/skill-deck@0.14.2 migrate-schema
   bunx @lythos/skill-deck@0.14.2 migrate-schema --dry-run  # preview first
```

Do NOT silently migrate.

## Key Concepts

| Concept | One-liner |
|---------|-----------|
| Cold Pool | All downloaded skills (`~/.agents/skill-repos/`). Agent cannot see here. |
| skill-deck.toml | Declares desired state. Alias-as-key dict format. |
| deck link | Reconciler. Makes `.claude/skills/` match the declaration. |
| Working Set | `.claude/skills/` — symlinks only. What the agent actually scans. |
| skill-deck.lock | Machine-generated snapshot: resolved paths, hashes, constraints. |

## Constraints

- **deny-by-default** — undeclared skills are physically absent from working set
- **max_cards** — exceeding the budget causes link to refuse
- **link backs up real directories** — non-symlink entries archived to `.claude/skills.bak.*.tar.gz`
- **transient expires** — past-due transients trigger warnings
- **managed_dirs overlap** — two skills claiming same directory triggers warning
- **Never manually create subdirectories in `.claude/skills/`** — use `deck link`
- **deck does not run post-install steps** — API keys, env vars are the skill's own responsibility

## Locators — Always Fully-Qualified

| Style | Example | Reliability |
|-------|---------|-------------|
| Fully-qualified | `github.com/lythos-labs/lythoskill/skills/lythoskill-deck` | Reliable — deterministic path |
| Bare name | `lythoskill-deck` | Fragile — non-deterministic readdir order |

The deck does NOT auto-insert a `skills/` prefix. Verify repo structure before writing locators.

## Gotchas

**deck link uses lstatSync, not existsSync** — `existsSync` returns false for broken symlinks, causing EEXIST errors.

**SKILL.md type field**: Only `standard` or `flow` are valid. `innate`/`tool`/`transient` are deck toml section names, not SKILL.md types. `deck_skill_type` (custom field) for `fork`/`transient` declarations.

**Network restrictions — SOCKS proxy**: If `deck add` or `validate --remote` fails with "Cannot reach github.com", set `LYTHOS_SOCKS_PROXY`:

```bash
export LYTHOS_SOCKS_PROXY="127.0.0.1:1080"
bunx @lythos/skill-deck@0.14.2 add github.com/owner/repo/skill
```

**Innate priority**: After compaction, read `innate` skills' full SKILL.md first. `tool` skills are lazy — read on trigger. Agent-side convention.

**Never guess locators** — web-search the repo structure before writing paths for unfamiliar repos.

## Supporting References

| When you need to… | Read |
|--------------------|------|
| Understand cold pool → deck → working set pipeline | [references/architecture.md](./references/architecture.md) |
| Look up a lythoskill term | [references/glossary.md](./references/glossary.md) |
| Write or edit skill-deck.toml | [references/toml-format.md](./references/toml-format.md) |
| Set up a cold pool | [references/cold-pool-setup.md](./references/cold-pool-setup.md) |
| Build or organize a deck | [references/deck-building.md](./references/deck-building.md) |
| Run arena benchmarks with deck isolation | [references/arena-integration.md](./references/arena-integration.md) |
| Understand SKILL.md types or skill thickness | [references/skill-types.md](./references/skill-types.md) |
| Add custom frontmatter fields | [references/custom-fields.md](./references/custom-fields.md) |
