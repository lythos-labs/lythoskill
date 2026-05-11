---
name: lythoskill-arena
version: 0.9.49
type: standard
description: |
  Stateless one-shot skill execution and controlled-variable comparison.
  `single` mode runs any deck against any task with zero local state —
  no install, no working-set pollution, no deck overwrite. `vs` mode
  runs declarative arena.toml for reproducible multi-deck comparison
  with Pareto frontier analysis. Always restores your parent deck after.
  First run: arena checks which players are available (kimi/codex/claude)
  and records your preference. Subagent-friendly: can resume interrupted
  arena runs from saved state.
when_to_use: |
  TEST a skill before adopting, COMPARE two decks, AUDIT a module with QA deck,
  BENCHMARK skill performance, run one-shot task with remote deck, try before
  you buy, which skill is better, does adding this skill improve my deck,
  arena single, arena vs, arena compare, test play, Pareto analysis,
  skill synergy check, security sweep, module audit, quick experiment.
  ALSO trigger when user says "test this skill", "try this deck",
  "compare A vs B", "audit this package", "sweep for bugs".
allowed-tools:
  - Bash(bunx @lythos/skill-arena@0.9.49 *)
  - Bash(bunx @lythos/skill-deck@0.9.49 link *)
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

## Player Discovery (first run)

Arena auto-detects available players. On first run, it:

1. Checks `which kimi`, `which codex`, `which claude` (in that order)
2. Records available players to `~/.agents/arena/players.json`
3. Defaults to `kimi` if available (proven headless reliability)
4. If no players found, guides installation

```bash
# Supported players (install at least one):
uv tool install kimi-cli       # kimi (recommended — most reliable headless)
npm i -g @openai/codex          # codex (codex exec --json)
npm install -g @anthropic-ai/claude-code  # claude (SDK mode preferred over -p)
```

### Player priority

| Player | Priority | Headless reliability | When to use |
|--------|----------|---------------------|-------------|
| **kimi** (default) | 1st | ✅ Eager tools, no deadlock | Best cost/reliability ratio. `--print --afk` is first-class headless. |
| **codex** | 2nd | ✅ New adapter | If you already have `codex` installed and configured. |
| **deepseek** | 3rd | ⚠️ TUI native | `deepseek serve --http` daemon mode. If `which deepseek` succeeds, you're using it. |
| **claude** | 4th | ⚠️ SDK mode preferred | Avoid `claude -p` (known Bun.spawn deadlock). Use SDK adapter instead. |

If `player` is omitted, arena tries kimi → codex → deepseek → claude.

### Player API key setup

Each player needs its own auth. Don't hardcode these — when setting up a new player,
**web-search the latest install + auth instructions** (they change between versions):

| Player | Auth setup (run once) | Verify |
|--------|----------------------|--------|
| **kimi** | `kimi login` or `export KIMI_API_KEY=...` | `kimi --print -p "hello"` |
| **codex** | `codex login` or `export OPENAI_API_KEY=...` | `codex exec --json "hello"` |
| **deepseek** | `deepseek login` or `export DEEPSEEK_API_KEY=...` | `deepseek serve --http --port 0 --health` |
| **claude** | `claude login` or `export ANTHROPIC_API_KEY=...` | `claude -p "hello"` |

If `which <player>` fails, guide the user to install first (web-search for latest
install command — packages and tool names change between versions).

## Working Directory & Lock Files

Arena creates an **isolated workdir** for each run — your project's working set
is never touched. The arena workdir lives at:

```
tmp/arena-<timestamp>-<slug>/    ← isolated workdir (gitignored)
  skill-deck.toml                ← copy of the arena deck
  skill-deck.lock                ← lock file (ONLY in arena workdir)
  .claude/skills/                ← working set (ONLY in arena workdir)
```

**Important**: `skill-deck.lock` is created in the arena workdir, NOT your
project root. If you see a lock file in your project root after running arena,
something went wrong — the arena didn't use an isolated workdir. Check the
`--out` flag points to a tmp directory.

After each subagent runs, arena restores your parent deck:
```bash
deck link --deck ./skill-deck.toml   # restore YOUR deck (not the arena deck)
```
This is mandatory — forgetting leaves you on the stripped arena deck.

## Commands

### Primary: single agent run (`single`)

The simplest path — one subagent, one deck, one task. Used by `examples/quick-agent.sh` internally.

```bash
# URL deck (auto-fetched) + inline brief — no local files needed
bunx @lythos/skill-arena@0.9.49 single \
  --deck https://raw.githubusercontent.com/lythos-labs/lythoskill/main/examples/decks/scout.toml \
  --brief "Investigate this repo and produce a deck plan" \
  --player kimi
```

### Declarative: `run --config` (k8s-style)

Use an `arena.toml` to declare task + sides + criteria — reproducible, version-controlled, dry-runnable.

```bash
bunx @lythos/skill-arena@0.9.49 run --config ./arena.toml
bunx @lythos/skill-arena@0.9.49 run --config ./arena.toml --dry-run
```

`arena.toml` declares per-side player + deck + criteria; `run --config` orchestrates the whole comparison.

### Declarative mode (recommended)

```bash
bunx @lythos/skill-arena@0.9.49 vs --config ./arena.toml
bunx @lythos/skill-arena@0.9.49 vs --config ./arena.toml --dry-run
```

### Legacy: `scaffold` (human-in-the-loop)

For controlled-variable comparison via per-deck scaffolds. The CLI creates the directory + per-side decks; the agent dispatches subagents and judges.

```bash
bunx @lythos/skill-arena@0.9.49 scaffold \
  --task "Generate auth flow diagram" \
  --decks "./decks/minimal.toml,./decks/rich.toml" \
  --criteria "quality,token,maintainability"
```

### Visualize results

```bash
bunx @lythos/skill-arena@0.9.49 viz tmp/arena-<id>/
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
