# Philosophy

> Why declarative governance exists, and why "just install more skills" broke.

## The Governance Problem

Your `~/.agents/skills/` becomes a garbage dump. It happens gradually:

1. You install a skill from GitHub — copy it into your skills directory
2. You try Superpowers, then skill-manager — each leaves its own symlinks
3. You test skills for different projects — old versions, broken links, silent conflicts
4. Your agent sees everything you've ever installed. Which skills are *supposed* to be active? Nobody knows.

**Your skills directory becomes the dirtiest directory in your config.** The agent sees history debt, not a curated toolkit.

### Why this happens

Two distinct needs are forced into one directory:

1. **Storage** — a place to keep all the skills you might ever use, across all projects
2. **Selection** — the specific skills that should be active for *this* project right now

When `~/.agents/skills/` serves both roles, every skill you've ever collected is visible to every agent session. More skills in the directory means more context consumed, more trigger conflicts, and more unpredictable behavior.

### The fix: separate storage from selection

Lythoskill introduces two concepts that should always have been separate:

- **Cold pool** — where skills live. A directory of git-cloned skill repos. Put everything here. Nothing in the cold pool is automatically active.
- **Working set** — what the agent sees. A symlink farm in `.claude/skills/` by default (configurable per platform). Only skills declared in your deck appear here.

Real numbers from the author's setup as of 2026-05-20: **871 skills across 74 repos** in the cold pool — everything ever collected. But the working set for any given project is **13 skills** — exactly what `skill-deck.toml` declares, nothing more.

Store everything, activate only what you need.

This isn't a tooling failure. It's a **governance failure**. No tool can fix it because the problem is the model: imperative installation ("add this skill") without declarative reconciliation ("these skills, and nothing else").

## Smart Agent, Dumb Tools

The foundational layering of lythoskill:

```
┌─────────────────────────────────────────┐
│  Agent (intelligence layer)             │
│  · Decides when to invoke what          │
│  · Handles ambiguity                    │
│  · Recovers from errors                 │
│  · Uses conversation context            │
└────────────┬────────────────────────────┘
             │ structured input / explicit commands
┌────────────▼────────────────────────────┐
│  CLI (tool layer) — pure functions      │
│  · Deterministic input → output         │
│  · No LLM API calls                     │
│  · No parser / state machine / branching│
│  · No retained state                    │
└─────────────────────────────────────────┘
```

**Intelligence lives in SKILL.md.** The CLI is mechanical glue — scan, link, query. Every time a CLI grows a parser or state machine, it's duplicating what the agent already does better with full context.

This is why lythoskill packages are thin: `packages/lythoskill-deck/skill/SKILL.md` carries the intelligence, `packages/lythoskill-deck/src/` carries stable integration code, and the CLI wires them together. Three layers, one responsibility each.

## The Thin Pattern

Every lythoskill capability follows the same structure:

| Layer | Where | What |
|-------|-------|------|
| Intelligence | `SKILL.md` | Agent-facing instructions, decision rules, workflow |
| Integration | `src/` (npm package) | Stable code — SQLite, filesystem, git operations |
| Glue | `cli.ts` | Mechanical dispatch — parse args → call integration → format output |

The thin pattern is **recursive**. Deck, arena, curator, coach — each is a thin skill that governs other skills. The project itself is a thin layer over mature infrastructure (git, npm, SQLite, GitHub API).

## Declarative > Imperative

```
# Imperative (the old way)
cp -R cool-skill/ ~/.agents/skills/     # install
rm -rf ~/.agents/skills/cool-skill/     # uninstall (maybe)

# Declarative (lythoskill)
# 1. Add one line to skill-deck.toml
# 2. Run `deck link`
# 3. Working set matches declaration exactly
```

**Deny-by-default.** Skills not in the deck are physically absent from the working set. No silent accumulation. No "I forgot I installed that."

This is the same insight that drove Kubernetes away from imperative `kubectl run` toward declarative YAML reconciliation. The desired state is the source of truth; the controller makes reality match.

## Player-Deck Separation

The TCG (Trading Card Game) analogy is not decorative — it is structural. It captures a design decision that took several iterations to surface: the player (the agent platform) and the deck (the skill collection) are independent variables.

```
Player (who plays)          Deck (what you play with)
├─ Platform: claude-code    ├─ max_cards
├─ Model: claude-opus-4-6   ├─ skills[]
├─ Concurrency: 4 agents    └─ combos[]
├─ Tool set
└─ Native capabilities
```

**Same deck, different players, different results.** A deck given to Claude Code, Kimi, or Codex performs differently — not because the deck is wrong, but because players have different strengths. This is a feature, not a bug: it means decks encode reusable knowledge, while players provide execution context. Arena exists to measure this variance empirically.

The separation enables **combinatorial reuse**: 3 players + 3 decks = 9 test configurations from 6 files, not 9 hand-maintained combinations. This is the same principle that made package managers more valuable than vendored dependencies — separate the reusable artifact from the runtime context.
