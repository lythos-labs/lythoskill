# Arena Configuration Schemas

> Two TOML schemas drive arena runs: **arena.toml** (declarative arena config, k8s-manifest style) and **player config** (two distinct locations with different meanings — disambiguated below). This reference is the source-of-truth for both. CLI command surface lives in [SKILL.md → Commands](../SKILL.md#commands) — this doc covers config files only.

## arena.toml — Declarative Arena Manifest

Used by `arena run --config <path>` (k8s-style declarative mode).

### Top-level shape

```toml
[arena]
# task description OR path to TASK-arena.md (relative to arena.toml)
task = "Generate auth flow diagram"
# evaluation dimensions (≥1 required)
criteria = ["syntax", "context", "logic", "token"]
# per-side run repetition (default: 1)
runs_per_side = 1
# total participant limit (2 ≤ N ≤ 5, default: 5)
max_participants = 5
# (optional) reproducibility metadata
model = "claude-sonnet-4-6"
endpoint = "api.anthropic.com"
notes = "Re-running 2026-04-30 baseline"

# 2-5 sides; each side is one participant
[[side]]
name = "kimi-baseline"
player = "kimi"               # see player config below
deck = "./decks/baseline.toml"
control = false               # control side gets shared control skill (default: false)

[[side]]
name = "claude-rich"
player = "claude"
deck = "./decks/rich.toml"

# (optional) per-side environment overrides
[side.env]
container = "node:22"
pre_run = ["bun install --frozen-lockfile"]
working_dir = "/workspace"
env_vars = { OPENAI_API_KEY = "$KIMI_KEY", DEBUG = "1" }
```

### Field reference

#### `[arena]` — global run config

| Field | Type | Default | Notes |
|---|---|---|---|
| `task` | string \| path | required | Task description OR path to TASK-arena.md (relative to arena.toml location) |
| `criteria` | array of strings | required, ≥1 | Evaluation dimensions for the judge agent |
| `runs_per_side` | positive int | `1` | Repeat each side N times for variance reduction |
| `max_participants` | int 2–5 | `5` | Hard cap on `[[side]]` count |
| `model` | string | `null` | Reproducibility metadata; not enforced by runner |
| `endpoint` | string | `null` | Reproducibility metadata; not enforced by runner |
| `notes` | string | `null` | Freeform reproducibility notes |

#### `[[side]]` — per-participant config

| Field | Type | Default | Notes |
|---|---|---|---|
| `name` | string | required | Side label (used in output paths and report) |
| `player` | string | required | Player reference (see [Player config](#player-config) below) |
| `deck` | path | required | Path to deck.toml (relative to arena.toml) |
| `control` | bool | `false` | If true, side gets shared control skill in addition to its deck |

#### `[side.env]` — optional per-side environment

Used when sides need isolated runtime contexts (different containers, env vars, working dirs).

| Field | Type | Default | Notes |
|---|---|---|---|
| `container` | string | `null` | Container image identifier (interpretation is runner-specific) |
| `pre_run` | array of strings | `[]` | Shell commands to run before the side starts |
| `working_dir` | string | `null` | Override working directory |
| `env_vars` | map of strings | `{}` | Environment variables; values may reference shell vars (`$VAR`) |

### Validation

`arena run --config <path>` parses with Zod (`packages/lythoskill-arena/src/arena-toml.ts`). Errors print field-level paths (e.g., `arena.criteria: must contain at least 1 element`).

`--dry-run` prints the resolved execution plan (`task / criteria / cells / total_runs`) without executing.

### Total runs formula

```
total_runs = side.length × arena.runs_per_side
```

A 3-side arena with `runs_per_side = 2` produces 6 cells (3 × 2).

---

## Player Config — Two Distinct Locations, Two Distinct Meanings

> **Disambiguation upfront**: `players.toml` at project root and per-side player config files (e.g., `playground/player-kimi-agent.toml`) are **different things**. One is a registry, the other is a runtime config. Conflating them misleads about importance — see below.

### Location 1: `players.toml` at project root — **Platform registry**

A community-facing registry of which agent platforms have been verified to work with arena, with status levels and tested scenarios. **Intended audience: humans evaluating arena's platform compatibility, not runtime.**

```toml
# players.toml (project root)
[players.claude]
status = "tested"               # tested | theoretical | blocked
adapter = "claude-sdk"
method = "@anthropic-ai/claude-agent-sdk query()"
notes = "Full agent mode. File ops, tools, subagents all confirmed."
tested_version = "2.1.133"
tested_scenarios = ["skill-introspection (122ms, PASS)", "..."]

[players.kimi]
status = "tested"
adapter = "kimi-cli"
method = "kimi --print (one-shot)"
# ...
```

**Status levels**:
- `tested` — verified by lythoskill team with documented scenarios + version
- `theoretical` — API/docs say it should work; community verification welcome
- `blocked` — known blocker prevents use (documented inline)

**Auto-detection**: `bun packages/lythoskill-arena/src/cli.ts players detect` scans installed CLIs and refreshes this file.

**Important**: this file's location at project root is conventional but **not architecturally privileged**. Putting it elsewhere works equally well; the project root location is a documentation anchor, not a runtime requirement. (Per session 2026-05-08 user note: "even if a players.toml at root isn't wrong per se, having it appear here would mislead about importance" — treat it as community reference, not load-bearing config.)

### Location 2: per-player runtime config — **Specific run config**

For arena.toml's `side.player` field, when a side needs configuration beyond the default platform name (e.g., specific model, tool set, concurrency limits, capability fingerprint), point at a per-player TOML:

```toml
# playground/player-kimi-agent.toml (or players/kimi-agent.toml)
[player]
name = "Kimi Agent"             # display name
platform = "kimi"               # one of: claude | kimi | deepseek | cursor | gemini
model = "kimi-k1.5"             # specific model identifier
concurrent = 8                  # max parallel subagents

[player.tool_set]               # capability flags
file_read = true
file_write = true
bash = true
web_search = true
agent_swarm = true

[capabilities.unverified]       # freeform notes for un-tested capabilities
agent_swarm_max = "文档说支持 8 并发，待实测"

[verified.2026-04-29]           # verification snapshot (date-keyed)
concurrent = 8                  # ✅ verified
agent_swarm_max = 8             # ✅ verified
web_search = true               # ✅ verified
session_isolation = false       # ⚠️ swarm shares context — weaker than subagent
context_window_tokens = 200000  # performance fingerprint
```

#### `[player]` — required block

| Field | Type | Default | Notes |
|---|---|---|---|
| `name` | string | required | Display name (shown in report.md) |
| `platform` | string | required | One of: `claude`, `claude-code`, `kimi`, `deepseek`, `cursor`, `gemini`. Unknown values are passed through unchanged (assumed `useAgent`-compatible). |
| `model` | string | optional | Specific model identifier for the platform |
| `concurrent` | int | `1` | Max parallel subagents this player can drive |

#### `[player.tool_set]` — capability flags

All booleans. Default `false` if unspecified. Used by arena to gate which tasks a player can attempt.

| Flag | Meaning |
|---|---|
| `file_read` | Can read local files |
| `file_write` | Can write local files |
| `bash` | Can execute shell commands |
| `web_search` | Has built-in web search |
| `agent_swarm` | Can spawn parallel subagents |

#### `[capabilities.unverified]` — freeform notes

Kept for "this should work but we haven't tested" claims. Not enforced; documentation only.

#### `[verified.<YYYY-MM-DD>]` — date-keyed verification snapshots

Each verification run adds a new section. Allows tracking capability drift over time. Example: `[verified.2026-04-29]`, `[verified.2026-05-15]` are independent snapshots.

### How `side.player` resolves

`packages/lythoskill-arena/src/player.ts → resolvePlayer(name)`:

1. **Built-in name** (`claude`, `kimi`, `deepseek`, `cursor`, `gemini`, `claude-code`) → direct platform mapping (case-insensitive)
2. **Unknown string** → passed through to `useAgent` as-is (assumed platform-compatible)
3. **Future**: per-player `.toml` paths (e.g., `./players/kimi-agent.toml`) will override built-in mappings — currently not yet wired (the registry is documentation-only; runtime uses `BUILTIN_PLAYERS` map directly).

This means for **today**, `side.player = "kimi"` is sufficient for built-in platforms. Per-player `.toml` files are documentation/audit artifacts whose runtime integration is pending.

### Authentication is NOT bundled

A player reference resolves the **adapter** but not the **credential**. Each platform requires its own auth setup before `single` can succeed. See [`@lythos/agent-adapter` README → Authentication & Runtime Setup](../../../lythoskill-agent-adapter/README.md#authentication--runtime-setup) for the per-player credential matrix and runtime gotchas (bunx ephemeral env, Bun.spawn module graph, optional adapter imports, etc.).

In short: install the heavy adapter package + set the platform credential env var, BEFORE running. Errors surface at run time, not at startup.

---

## Schema Evolution Notes

Per session 2026-05-08 user reflection: "player 是我一直点到但是确实随着演化细节在变化的概念" — the player concept has evolved across iterations. Current state (2026-05-20, v0.15.3):

- **What's stable**: arena.toml schema (Zod-validated, ADR-20260502110308316), built-in platform names, `useAgent` resolution path, side env override surface
- **What's evolving**: per-player `.toml` runtime integration (currently documentation-only), platform fingerprint format (`[verified.<date>]` pattern is a starting convention, not yet mature), `capabilities.unverified` freeform → may eventually become a structured Zod schema
- **What's deliberately ambiguous**: where `players.toml` (registry) lives — root convention is fine but not load-bearing

When evolving these schemas: bump arena.toml version field (not yet present, but reserved) before breaking changes; for player config, keep additive-only changes through 0.15.x.

## Related

- **CLI surface**: [SKILL.md → Commands](../SKILL.md#commands)
- **arena.toml Zod source**: `packages/lythoskill-arena/src/arena-toml.ts`
- **Player resolution source**: `packages/lythoskill-arena/src/player.ts`
- **ADR-20260502110308316**: arena.toml schema (player as facade)
- **Project memory**: `project_unified_runner_pluggable_agent` (player as pluggable backend axis)
