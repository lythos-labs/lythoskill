# @lythos/skill-arena

> Controlled-variable benchmark for AI agent skills. Test single decks or compare A/B — agent-orchestrated by default, cross-player when you need it.

## Modes at a Glance

| Mode | How | When |
|------|-----|------|
| **Agent-Orchestrated** (DEFAULT) | Agent tool spawns subagents, parallel dispatch, native judge | Single deck test, cross-deck A/B comparison |
| **Cross-Player** (OPT-IN) | CLI runner spawns different agent binaries via Bun.spawn | Comparing kimi vs codex vs claude |

**95% of arena use is agent-orchestrated.** The Agent tool can spawn parallel subagents with isolated workdirs and different decks — zero CLI. Cross-player mode is ONLY needed when comparing different agent CLIs (the Agent tool can only spawn same-type agents).

## Install

```bash
bun add -d @lythos/skill-arena
# or use directly
bunx @lythos/skill-arena@0.15.0 <command>
```

## Quick Start

```bash
# single — test one deck (most common)
bunx @lythos/skill-arena@0.15.0 single \
  --deck ./examples/decks/scout.toml \
  --brief "Generate auth flow diagram" \
  --out ./output

# single with explicit player
bunx @lythos/skill-arena@0.15.0 single \
  --deck ./examples/decks/scout.toml \
  --brief "Generate auth flow diagram" \
  --player kimi \
  --out ./output

# cross-deck vs — compare two decks (agent-orchestrated)
# Create arena.toml declaring sides with different decks, then:
bunx @lythos/skill-arena@0.15.0 vs --config ./arena.toml

# cross-player vs — compare kimi vs codex (CLI only)
bunx @lythos/skill-arena@0.15.0 vs --config ./arena.toml --player kimi
```

**What happens**: Agent creates isolated `/tmp` workdir per side, `deck link` skills, spawns parallel subagents, collects artifacts, judge scores outputs. Parent deck restored after.

## Commands

### `single` — one deck, one task

```bash
bunx @lythos/skill-arena@0.15.0 single \
  --deck ./deck.toml \
  --brief "Produce a .docx report with radar chart" \
  --timeout 600000 \
  --out ./output

# with explicit player
bunx @lythos/skill-arena@0.15.0 single \
  --deck ./deck.toml \
  --brief "Produce a .docx report with radar chart" \
  --player kimi \
  --out ./output
```

### `vs` — multi-deck comparison

```bash
bunx @lythos/skill-arena@0.15.0 vs --config ./arena.toml
bunx @lythos/skill-arena@0.15.0 vs --config ./arena.toml --dry-run
```

### `prepare-workdir` — isolate + link skills (agent-orchestrated)

```bash
bunx @lythos/skill-arena@0.15.0 prepare-workdir \
  --deck ./skill-deck.toml \
  --out /tmp/arena-side-a \
  --brief "task description"
```

Creates `/tmp`-isolated workdir with deck copied, AGENTS.md written, and `deck link` run. `--dry-run` prints the plan (skills, workdir path, link needed) without creating anything.

### `archive` — collect agent outputs (agent-orchestrated)

```bash
bunx @lythos/skill-arena@0.15.0 archive \
  --from /tmp/arena-side-a \
  --to ./playground/output \
  --sides side-a
```

Copies agent artifacts from workdir(s) to output, skipping internal files (`.claude`, `skill-deck.toml`, `skill-deck.lock`, `AGENTS.md`). Single-side archives fall back to workdir root when the named side subdirectory doesn't exist. `--dry-run` shows the per-side plan before copying.

### `viz` — render results (WIP — HTML report generation pending)

```bash
bunx @lythos/skill-arena@0.15.0 viz runs/arena-<id>/
```

## Parameters

| Flag | Command | Description |
|------|---------|-------------|
| `--brief "<text>"` | single | Inline task brief |
| `--deck <path\|url>` | single | Deck file (URL auto-fetched) |
| `--player <name>` | single, vs | Agent player: kimi\|codex\|deepseek\|claude |
| `--timeout <ms>` | single | Subagent timeout (300000–600000 for complex tasks) |
| `--from <dir>` | archive | Source workdir |
| `--to <dir>` | archive | Output directory |
| `--sides <names>` | archive | Comma-separated side names (default: `.`) |
| `--out <dir>` | single, vs, prepare-workdir | Output / workdir directory |
| `--config <path>` | vs | arena.toml |
| `--dry-run` | vs, prepare-workdir, archive | Print plan without execution |

## Prerequisites (cross-player only)

For cross-player mode, install at least one agent CLI:

```bash
uv tool install kimi-cli           # kimi (recommended default)
npm i -g @openai/codex             # codex
# deepseek: bundled with desktop app or pip install deepseek-cli
# claude: set ANTHROPIC_API_KEY (SDK, no CLI binary needed)
```

## Skill Documentation

The agent-visible skill layer: [skill/SKILL.md](./skill/SKILL.md)

## Architecture

```
arena.toml  →  ArenaToml (Zod)  →  ExecutionPlan (pure)  →  per-cell agent spawn (IO)
                                   ↓
               aggregateAllStats (pure)  ←  verdicts[]
                                   ↓
               runComparativeJudge (IO)  →  report.md + Pareto frontier
```

- **Intent**: `arena.toml` declarative config
- **Plan**: `buildExecutionPlan()`, `aggregateSideStats()`, `computePareto()` — pure functions
- **Execute**: Agent tool spawn (agent-orchestrated) or `AgentAdapter` (cross-player)

## License

MIT
