# Philosophy

> Why declarative governance exists, and why "just install more skills" broke.

## The Governance Problem

Your `~/.claude/skills/` becomes a garbage dump. It happens gradually:

1. You install a skill from GitHub — `cp -R` into the working set
2. You try Superpowers, then skill-manager — each leaves its own symlinks
3. You test skills for different projects — old versions, broken links, silent conflicts
4. Agent sees a bloated working set. Which skills are *supposed* to be active? Nobody knows.

**The working set becomes the dirtiest directory in your config.** Agent sees history debt, not a curated deck.

Real numbers from the author's cold pool as of 2026-05-20: **871 skills across 74 repos**. Cold pool size is personal — yours will differ. The point isn't the number; it's that without governance, any of them could silently enter your working set. With lythoskill-deck, the project's working set is **13 skills** — exactly what `skill-deck.toml` declares, nothing more.

This isn't a tooling failure. It's a **governance failure**. No tool can fix it because the problem is the model: imperative installation ( "add this skill" ) without declarative reconciliation ( "these skills, and nothing else" ).

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
cp -R cool-skill/ ~/.claude/skills/     # install
rm -rf ~/.claude/skills/cool-skill/     # uninstall (maybe)

# Declarative (lythoskill)
# 1. Add one line to skill-deck.toml
# 2. Run `deck link`
# 3. Working set matches declaration exactly
```

**Deny-by-default.** Skills not in the deck are physically absent from the working set. No silent accumulation. No "I forgot I installed that."

This is the same insight that drove Kubernetes away from imperative `kubectl run` toward declarative YAML reconciliation. The desired state is the source of truth; the controller makes reality match.
