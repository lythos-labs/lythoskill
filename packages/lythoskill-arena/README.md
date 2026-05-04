# @lythos/skill-arena

![CI](https://img.shields.io/badge/CI-41%20unit%20tests-brightgreen)

> Controlled-variable benchmark for AI agent skills. Compare skills, decks, or configurations on the same task — single-skill A/B or full-deck Pareto frontier analysis. Now with declarative `arena.toml` (k8s-manifest style) and deterministic Pareto frontier.

## Why

"Which skill is better?" is the wrong question. The right question is "which skill is better for what."

`skill-arena` scaffolds isolated environments where subagents complete the same task under different decks. A judge agent scores outputs across multiple dimensions. Supports:

- **Mode 1**: Single-skill comparison (controlled variable — same helper skills, different test skill).
- **Mode 2**: Full-deck comparison (Pareto frontier — no single winner, only optimal trade-offs).

## Install

```bash
bun add -d @lythos/skill-arena
# or use directly
bunx @lythos/skill-arena <command>
```

## Quick Start

```bash
# Mode 1: Compare two skills on the same task
bunx @lythos/skill-arena \
  --task "Generate auth flow diagram" \
  --skills "design-doc-mermaid,mermaid-tools" \
  --criteria "syntax,context,token"

# Mode 2: Compare full deck configurations
bunx @lythos/skill-arena \
  --task "Generate auth flow diagram" \
  --decks "./decks/minimal.toml,./decks/rich.toml" \
  --criteria "quality,token,maintainability"

# Visualize results
bunx @lythos/skill-arena viz tmp/arena-<id>/
```

## Commands

### Declarative mode (k8s-style, recommended)

```bash
# Print execution plan without running
bunx @lythos/skill-arena run --config arena.toml --dry-run

# Execute with per-side runs_per_side and statistical aggregation
bunx @lythos/skill-arena run --config arena.toml
```

### CLI-flag mode (backward compat)

```
bunx @lythos/skill-arena run \
  --task ./TASK-arena.md \
  --players ./players/claude.toml \
  --decks ./decks/run-01.toml,./decks/run-02.toml \
  --criteria coverage,relevance,actionability,depth
```

### Scaffold mode (legacy, manual execution)

```
bunx @lythos/skill-arena scaffold --task "..." --skills a,b
```

### Viz

```bash
bunx @lythos/skill-arena viz runs/arena-<id>/
```

## Skill Documentation

This package is the **Starter** layer (CLI implementation).  
The agent-visible **Skill** layer documentation is here:  
[packages/lythoskill-arena/skill/SKILL.md](../../packages/lythoskill-arena/skill/SKILL.md)

## Architecture

```
arena.toml  →  ArenaToml (Zod)  →  ExecutionPlan (pure)  →  per-cell agent spawn (IO)
                                    ↓
                aggregateAllStats (pure)  ←  verdicts[]
                                    ↓
                runComparativeJudge (IO)  →  report.md + Pareto frontier
```

Intent/plan/execute separation:
- **Intent**: `arena.toml` declarative config (k8s-manifest style)
- **Plan**: `buildExecutionPlan()`, `aggregateSideStats()`, `computePareto()` — pure functions
- **Execute**: `runAgentScenario` per cell, `runComparativeJudge` — IO via `AgentAdapter`

Built on `@lythos/test-utils` shared infrastructure.

## Test Coverage

| Layer | Count | CI | Notes |
|-------|-------|----|-------|
| Unit tests | 41 | ✅ | TOML parser, player resolution, Pareto, stats |
| Agent BDD | — | ❌ | Requires `claude` CLI; run locally |

Pareto frontier is a **deterministic algorithm** — never delegated to LLM. 8 unit tests cover dominance, cross-dominance, transitive chains, partial criteria, and empty scores.

## License

MIT
