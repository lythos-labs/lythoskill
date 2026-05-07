# @lythos/skill-arena

![CI](https://img.shields.io/badge/CI-41%20unit%20tests-brightgreen) ![Intent/Plan](https://img.shields.io/badge/arch-intent%2Fplan%2Fexecute-8A2BE2)

> Controlled-variable benchmark for AI agent skills. Compare skills, decks, or configurations on the same task — single-skill A/B or full-deck Pareto frontier analysis. Now with declarative `arena.toml` (k8s-manifest style) and deterministic Pareto frontier.

## Why

"Which skill is better?" is the wrong question. The right question is "which skill is better for what."

`skill-arena` scaffolds isolated environments where subagents complete the same task under different decks. A judge agent scores outputs across multiple dimensions. Supports:

- **Mode 1**: Single-skill comparison (controlled variable — same helper skills, different test skill).
- **Mode 2**: Full-deck comparison (Pareto frontier — no single winner, only optimal trade-offs).

## Prerequisites

Arena runs AI agents as subprocesses. You need at least one agent CLI installed:

### Kimi CLI (recommended default)

Kimi Code CLI is the default player for arena — it has reliable headless execution with eager tool loading (no deferred tool deadlock).

```bash
# Install via uv (recommended) — uv is Python's bunx equivalent
uv tool install kimi-cli
# Or run without installing:
uvx kimi-cli --print -p "hello"

# Authenticate
kimi login
# Or set API key:
export KIMI_API_KEY=your_key
```

Docs: [https://github.com/MoonshotAI/kimi-cli](https://github.com/MoonshotAI/kimi-cli)

### Claude CLI (secondary)

```bash
npm install -g @anthropic-ai/claude-code
claude --version  # should be ≥ 2.1.128
```

Note: Claude `-p` mode has known issues with web tools in Bun.spawn (deferred tool deadlock). Kimi is the default for reliability.

## Install

```bash
bun add -d @lythos/skill-arena
# or use directly
bunx @lythos/skill-arena@0.9.24 <command>
```

## Quick Start

```bash
# Mode 1: Compare two skills on the same task
bunx @lythos/skill-arena@0.9.24 \
  --task "Generate auth flow diagram" \
  --skills "design-doc-mermaid,mermaid-tools" \
  --criteria "syntax,context,token"

# Mode 2: Compare full deck configurations
bunx @lythos/skill-arena@0.9.24 \
  --task "Generate auth flow diagram" \
  --decks "./decks/minimal.toml,./decks/rich.toml" \
  --criteria "quality,token,maintainability"

# Visualize results
bunx @lythos/skill-arena@0.9.24 viz tmp/arena-<id>/
```

## Commands

### Declarative mode (k8s-style, recommended)

```bash
# Print execution plan without running
bunx @lythos/skill-arena@0.9.24 run --config arena.toml --dry-run

# Execute with per-side runs_per_side and statistical aggregation
bunx @lythos/skill-arena@0.9.24 run --config arena.toml
```

### CLI-flag mode (backward compat)

```
bunx @lythos/skill-arena@0.9.24 run \
  --task ./TASK-arena.md \
  --players ./players/claude.toml \
  --decks ./decks/run-01.toml,./decks/run-02.toml \
  --criteria coverage,relevance,actionability,depth
```

### Scaffold mode (legacy, manual execution)

```
bunx @lythos/skill-arena@0.9.24 scaffold --task "..." --skills a,b
```

### Viz

```bash
bunx @lythos/skill-arena@0.9.24 viz runs/arena-<id>/
```

## Skill Documentation

This package is the **Starter** layer (CLI implementation).  
The agent-visible **Skill** layer documentation is here:  
[packages/lythoskill-arena/skill/SKILL.md](../../packages/lythoskill-arena/skill/SKILL.md)

## Architecture

Part of the [lythoskill](https://github.com/lythos-labs/lythoskill) ecosystem — the thin-skill pattern separates heavy logic (this npm package) from lightweight agent instructions (SKILL.md).

```
Starter (this package) → npm publish → bunx @lythos/skill-arena@0.9.24 ...
Skill   (packages/<name>/skill/)     → build → SKILL.md + thin scripts
Output  (skills/<name>/)             → git commit → agent-visible skill
```

### Runtime architecture (intent/plan/execute)

```
arena.toml  →  ArenaToml (Zod)  →  ExecutionPlan (pure)  →  per-cell agent spawn (IO)
                                    ↓
                aggregateAllStats (pure)  ←  verdicts[]
                                    ↓
                runComparativeJudge (IO)  →  report.md + Pareto frontier
```

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
