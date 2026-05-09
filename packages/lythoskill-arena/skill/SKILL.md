---
name: lythoskill-arena
version: {{PACKAGE_VERSION}}
type: standard
description: |
  Controlled-variable test play for skills and deck configurations.  Scaffolds isolated arena environments where subagents complete  the same task under different decks, then a judge agent scores outputs  across multiple dimensions. Supports single-skill A/B comparison
  and full-deck Pareto frontier analysis.
when_to_use: |
  Compare skills, A/B test skills, which skill is better, test deck  configuration, benchmark skill, skill evaluation, deck comparison,
  try before adopting, test play, Pareto analysis, skill synergy check,  does adding this skill improve my deck.
allowed-tools:
  - Bash(bunx @lythos/skill-arena@{{PACKAGE_VERSION}} *)
  - Bash(bunx @lythos/skill-deck@{{PACKAGE_VERSION}} link *)
# ── deck governance metadata (consumed by lythoskill tooling only) ──
deck_niche: meta.governance.arena
deck_managed_dirs:
  - tmp/arena-*/
---

# Skill Arena
> Test play for skills and deck configurations. Not "which is best" — "which is best for what."
## Flow
```mermaid
flowchart TD
    BEGIN([BEGIN]) --> Parse[🧠 Parse arena request]
    Parse --> Setup[🤖 Create arena directory + decks]
    Setup --> Dispatch[🧠 Dispatch subagents in parallel]    Dispatch --> Collect{🧠 All outputs collected?}
    Collect -->|No| Wait[Wait for subagent]    Wait --> Collect
    Collect -->|Yes| Judge[🧠 Judge scores outputs]
    Judge --> Report[🧠 Generate benchmark report]
    Report --> Restore[🤖 Restore parent deck]
    Restore --> Archive[🧠 Archive to wiki/cortex]
    Archive --> END([END])
```

🤖 = CLI automation (scaffolding) | 🧠 = Agent reasoning (execution + judging)

**Core design**: The CLI only scaffolds (creates directories, generates deck files,
writes metadata). All evaluation is agent-side: the judge is an agent following
TASK-arena.md instructions, not a scoring script.

## Player Setup

Arena needs at least one AI agent CLI to spawn subprocesses. Players are
swappable backends — the arena pipeline doesn't care which executes.

| Player | CLI | Install | Headless reliability |
|--------|-----|---------|---------------------|
| **kimi** (default) | Kimi Code CLI | `uv tool install kimi-cli` or `uvx kimi-cli` | ✅ Eager tools, no deadlock |
| **claude** | Claude Code CLI | `npm install -g @anthropic-ai/claude-code` | ⚠️ Known `-p` mode issues |

```bash
# Install Kimi (recommended — Python, uv is Python's bunx)
uv tool install kimi-cli
kimi login  # or export KIMI_API_KEY=...

# Verify
kimi --print -p "hello"  # should produce output
```

Player is specified per side in `arena.toml`:
```toml
[[side]]
name = "my-test"
player = "kimi"  # or "claude"
deck = "./my-deck.toml"
```

If `player` is omitted, arena defaults to `kimi`.

## Commands

### Primary: single agent run (`single`)

The simplest path — one subagent, one deck, one task. Used by `examples/quick-agent.sh` internally.

```bash
# Task in a markdown file
bunx @lythos/skill-arena@{{PACKAGE_VERSION}} agent-run \
  --task ./TASK.md \
  --deck ./skill-deck.toml \
  --player kimi \
  --out ./output

# Inline brief (no TASK file needed)
bunx @lythos/skill-arena@{{PACKAGE_VERSION}} agent-run \
  --brief "Investigate this repo and produce a deck plan" \
  --deck ./skill-deck.toml \
  --out ./output
```

### Declarative: `run --config` (k8s-style)

Use an `arena.toml` to declare task + sides + criteria — reproducible, version-controlled, dry-runnable.

```bash
bunx @lythos/skill-arena@{{PACKAGE_VERSION}} run --config ./arena.toml
bunx @lythos/skill-arena@{{PACKAGE_VERSION}} run --config ./arena.toml --dry-run
```

`arena.toml` declares per-side player + deck + criteria; `run --config` orchestrates the whole comparison.

### Declarative mode (recommended)

```bash
bunx @lythos/skill-arena@{{PACKAGE_VERSION}} vs --config ./arena.toml
bunx @lythos/skill-arena@{{PACKAGE_VERSION}} vs --config ./arena.toml --dry-run
```

### Legacy: `scaffold` (human-in-the-loop)

For controlled-variable comparison via per-deck scaffolds. The CLI creates the directory + per-side decks; the agent dispatches subagents and judges.

```bash
bunx @lythos/skill-arena@{{PACKAGE_VERSION}} scaffold \
  --task "Generate auth flow diagram" \
  --decks "./decks/minimal.toml,./decks/rich.toml" \
  --criteria "quality,token,maintainability"
```

### Visualize results

```bash
bunx @lythos/skill-arena@{{PACKAGE_VERSION}} viz tmp/arena-<id>/
```

Renders ASCII bar charts and radar comparison from `report.md`.

### Parameters

| Flag | Used by | Description |
|------|---------|-------------|
| `--task <path\|desc>` | single, vs, scaffold | Task description or path to TASK-arena.md |
| `--brief "<prompt>"` | single | Inline task brief (alternative to `--task` path) |
| `--deck <path>` | single | Deck for the single subagent |
| `--config <path>` | vs | Declarative arena.toml |
| `--players <list>` | run (CLI mode) | Comma-separated player.toml paths |
| `--decks <list>` | scaffold | Comma-separated deck.toml paths |
| `--criteria <list>` | scaffold | Evaluation dimensions (default: syntax,context,logic,token) |
| `--player <name>` | single | Specific player (default: kimi) |
| `--out <dir>` | single, vs | Output directory |
| `--dir <dir>` | scaffold | Parent dir (default: tmp) |
| `--project <dir>` | all | Project root (default: .) |
| `--timeout <ms>` | single | Subagent timeout |
| `--dry-run` | vs --config | Print plan without running |


## Directory Structure (generated by CLI)
```
tmp/arena-<timestamp>-<slug>/
├── arena.json              # Metadata: participants, criteria, status
├── decks/
│   ├── arena-run-01.toml   # One deck per participant
│   └── arena-run-02.toml
├── runs/
│   ├── run-01.md           # Subagent A output
│   └── run-02.md           # Subagent B output
├── TASK-arena.md           # Task card (subagent + judge instructions)
└── report.md               # Judge output (generated after scoring)
```

## Execution Steps (after CLI scaffolding)
1. **Read TASK-arena.md** — contains per-subagent commands and judge persona
2. **For each participant**: switch deck (`deck link --deck`), execute task, save output to `runs/`
3. **Restore parent deck** after each subagent (`deck link --deck ./skill-deck.toml`)
4. **Judge**: read all `runs/*.md`, score per criteria, generate `report.md`
5. **Optional**: `arena viz` to render charts, archive to `wiki/01-patterns/`

## Constraints
- **max_participants = 5** per arena run.
- **Restore parent deck**: mandatory after every subagent. Forgetting leaves
  subsequent work on the stripped arena deck.
- **deny-by-default**: skills not in the arena deck are invisible to subagents.  This is what makes controlled-variable comparison meaningful.

## Gotchas
**CLI scaffolds, agent executes**: The CLI (`bunx @lythos/skill-arena`) only
creates the directory structure and deck files. It does **not** dispatch
subagents, run tasks, or score outputs. The agent reads TASK-arena.md and
orchestrates the rest. Don't wait for CLI output beyond the scaffold report.
**Judge is not a script**: Skill comparison requires semantic understanding
(context fit, creativity, maintainability). Token counting is scriptable;
"which output better fits the business scenario" is not. The judge is always
an agent/subagent following the TASK-arena.md persona.
**Mode 2 does not pick a winner**: Full-deck comparison outputs score vectors
and identifies the Pareto frontier. A cheap-but-medium-quality deck and an
expensive-but-high-quality deck can both be non-dominated. The user chooses
based on what they value most.
**viz requires report.md**: The `viz` subcommand parses markdown tables from
`report.md`. If the judge hasn't written it yet, viz will say so. Report
tables need `| Checkpoint | Score A | Score B |` format for parsing.
## Supporting References
Read these **only when the specific topic arises**:

| When you need to… | Read |
|--------------------|------|
| Look up arena.toml or player config schema (declarative mode, side.env, player tool_set) | [references/configuration-schemas.md](./references/configuration-schemas.md) |
| Understand Pareto frontier scoring and MOO analysis | [references/pareto-analysis.md](./references/pareto-analysis.md) |
| Map arena operations to card game test play | [references/test-play-model.md](./references/test-play-model.md) |
| Detect deck synergy and emergent combos | [references/combo-and-synergy.md](./references/combo-and-synergy.md) |
| Set up continuous skill monitoring pipeline | [references/continuous-monitoring.md](./references/continuous-monitoring.md) |
| Let the agent self-initiate arena runs | [references/agent-autonomous-arena.md](./references/agent-autonomous-arena.md) |
| Review arena's design principles in depth | [references/design-principles.md](./references/design-principles.md) |
