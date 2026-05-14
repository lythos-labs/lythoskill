---
name: lythoskill-arena
version: {{PACKAGE_VERSION}}
type: standard
description: |
  Stateless one-shot skill execution and controlled-variable comparison.
  `single` mode runs any deck against any task with zero local state —
  no install, no working-set pollution, no deck overwrite. `vs` mode
  runs declarative arena.toml for reproducible multi-deck comparison
  with Pareto frontier analysis. Always restores your parent deck after.
  First run: arena checks which players are available (kimi/codex/deepseek/claude)
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

## Player Discovery (first run)

Arena auto-detects available players. On first run, it:

1. Checks `which kimi`, `which codex`, `which deepseek` (CLI-wrapped players), then checks `ANTHROPIC_API_KEY` for Claude (SDK — no CLI binary needed)
2. Records available players to `~/.agents/lythoskill/arena/players.json`
   (same `~/.agents/` namespace as cold pool + curator — user agent config in one place)
3. Defaults to `kimi` if available (proven headless reliability)
4. If no players found, guides installation

```bash
# Supported players (install at least one):
uv tool install kimi-cli                    # kimi (recommended — most reliable headless)
npm i -g @openai/codex                      # codex (codex exec --json)
# deepseek: bundled with DeepSeek desktop app or pip install deepseek-cli
# claude: uses Anthropic SDK (API key), no CLI binary required
```

### Player priority

| Player | Priority | Headless mode | When to use |
|--------|----------|---------------|-------------|
| **kimi** (default) | 1st | `--print --afk` | Best cost/reliability ratio. Eager tools, no deadlock. |
| **codex** | 2nd | `codex exec --json` | If you already have codex installed. New adapter, early feedback. |
| **deepseek** | 3rd | `deepseek serve --http` | Daemon mode for headless use. If `which deepseek` succeeds. |
| **claude** | 4th | SDK (`claude-sdk` adapter) | Uses Anthropic SDK directly — no shell spawn, no deadlock. Needs API key only. |

If `player` is omitted, arena tries kimi → codex → deepseek → claude.

### Player API key setup

Each player needs its own auth. Don't hardcode these — when setting up a new player,
**web-search the latest install + auth instructions** (they change between versions):

| Player | Auth setup (run once) | Verify |
|--------|----------------------|--------|
| **kimi** | `kimi login` or `export KIMI_API_KEY=...` | `kimi --print -p "hello"` |
| **codex** | `codex login` or `export OPENAI_API_KEY=...` | `which codex && codex --version` |
| **deepseek** | `deepseek login` or `export DEEPSEEK_API_KEY=...` | `which deepseek && deepseek --version` |
| **claude** | `export ANTHROPIC_API_KEY=...` (or `claude login` for OAuth) | `echo $ANTHROPIC_API_KEY` (SDK reads this directly, no CLI binary needed) |

For CLI-wrapped players (kimi/codex/deepseek): if `which <player>` fails, guide the user to install first. For Claude (SDK): only the API key matters — web-search for latest key setup.

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

## Preflight Protocol (MANDATORY before every single/vs run)

**CWD is the most fragile variable in arena.** Before running `single` or `vs`, always execute a self-check to verify the agent sees the correct environment. This is idempotent — running it multiple times must return the same result.

```
Self-check (run via Bash before arena command):

1. WHO AM I:     pwd
2. WHERE AM I:   ls -la .claude/skills/ 2>/dev/null || echo "no .claude/skills/"
3. WHAT SKILLS:  for d in .claude/skills/*/; do
                   head -3 "$d/SKILL.md" 2>/dev/null | grep -E "^name:|^description:" | head -2
                 done
4. CWD WRITABLE: touch .arena-write-test && rm .arena-write-test && echo "CWD writable" || echo "CWD NOT WRITABLE"
5. PLAYER CHECK: which kimi codex deepseek 2>/dev/null || echo "check ANTHROPIC_API_KEY for claude"
6. DECK EXISTS:  test -f <deck-path> && echo "Deck: $(wc -c < <deck-path>) bytes" || echo "DECK MISSING"
```

If ANY of these fail, STOP. Fix the configuration before proceeding. Common failures:
- `no .claude/skills/`: forgot to `deck link` before running arena
- `CWD NOT WRITABLE`: `--out` flag not set or directory permissions
- `DECK MISSING`: URL not fetched or local path wrong
- Skills listing empty: deck link created symlinks but cold pool missing — run `deck refresh`

If self-check passes, proceed to the arena command. The self-check report is your execution environment audit trail — include it when reporting errors.

## Execution Modes

### DEFAULT: Agent-Orchestrated

**This is the default for all arena tasks.** The agent reads the config, prepares isolated environments, dispatches subagents, and judges — without invoking `arena vs` or `arena single` CLI commands.

The agent's ReAct loop IS the arena runner. Each side gets an independent CWD container.

```mermaid
flowchart TD
    A[User: 'compare' / 'vs' / 'arena'] --> B{Cross-player comparison?}
    B -->|Yes — different players| C[useAgent mode<br/>arena vs --config<br/>each side spawns its player CLI]
    B -->|No — DEFAULT<br/>same player, different decks| D[Agent reads config]
    D --> E[PREFLIGHT: per-side workDir + deck link + self-check]
    E --> F{All preflights pass?}
    F -->|No| G[Fix: adjust mirror, retry link, report]
    G --> E
    F -->|Yes| H[SPAWN: sessions_spawn × N<br/>parallel, background=true<br/>each with isolated CWD + deck]
    H --> I[WAIT: all subagents complete]
    I --> J[COLLECT: artifacts from each side]
    J --> K[Comparative judge vs criteria]
    K --> L[Write report.md with per-side verdicts]
    L --> M[Done]
    
    style B fill:#f96,stroke:#333
    style C fill:#f96,stroke:#333
    style D fill:#4a9,stroke:#333
    style E fill:#49a,stroke:#333
    style H fill:#a4a,stroke:#333
    style K fill:#aa4,stroke:#333
**Why this is the default:** per-side CWD isolation prevents skill pollution. Preflight identifies misconfiguration before execution. Agent can fix failures mid-run (switch mirror, adjust timeout, retry) — CLI mode cannot.

### OPT-IN: Cross-Player Mode (`arena vs --config`)

Use ONLY when comparing different players (kimi vs codex vs deepseek vs claude).
The player axis requires spawning real CLI runtimes — agent-orchestrated cannot simulate
another agent's memory, hooks, or tool-use semantics.

```bash
# Single deck, explicit player
bunx @lythos/skill-arena@{{PACKAGE_VERSION}} single \
  --deck ./skill-deck.toml \
  --brief "Investigate this repo" \
  --player kimi

# vs mode with arena.toml (each side's player is declared in the config)
bunx @lythos/skill-arena@{{PACKAGE_VERSION}} vs --config ./arena.toml
bunx @lythos/skill-arena@{{PACKAGE_VERSION}} vs --config ./arena.toml --dry-run
```

Player mode uses `bunx @lythos/skill-arena` CLI — the runner spawns a player CLI process per side.

## Agent-Orchestrated Protocol

### 1. Parse the config

Read `arena.toml` or deck files. Extract: sides, task, criteria (if any), per-side deck paths.

### 2. Prepare per-side environments

For EACH side, create an isolated workDir:

```bash
mkdir -p playground/arena-{timestamp}/work/{side}/
```

In each workDir:
- Copy or fetch the side's deck file
- `bunx @lythos/skill-deck@latest link` — isolate skills to that side
- Run preflight self-check (CWD, skills, writable, player probe)

### 3. Preflight self-check (idempotent)

```
WHO AM I:    pwd
WHERE AM I:  ls .claude/skills/
WHAT SKILLS: for each skill, read frontmatter name + description
CWD WRITABLE: touch + rm test
DECK OK:     deck file exists and is valid TOML
```

If ANY fail → fix before proceeding. Include preflight results in the final report.

### 4. Dispatch subagents

Spawn one subagent per side with `run_in_background: true`:

```
subagent: "Arena cell: {side}"
prompt: "You are running an arena comparison cell.
  CWD: {workDir}
  Deck: {deckPath}
  Task: {taskBrief}
  Preflight: {preflight report}
  Produce output to: {outputDir}/

  MANDATORY — write decision-log.jsonl to {outputDir}/.
  Each line is one JSON object with: t (seconds elapsed),
  phase (setup/content/design/output), decision (what you chose),
  reason (why). This is your decision trail — the only way the
  orchestrator can understand your reasoning chain.

  Example:
  {\"t\":0,\"phase\":\"setup\",\"decision\":\"selected Golden Hour palette\",\"reason\":\"warm tones match baking theme\"}
  {\"t\":12,\"phase\":\"content\",\"decision\":\"6 science topics\",\"reason\":\"Baker's Percentages requires chemistry depth\"}"
```

All subagents run in PARALLEL. Each has its own CWD and isolated skills.

### 5. Judge and report

After ALL subagents complete:
- Collect artifacts from each side's output dir
- **Collect decision-log.jsonl from each side** — the decision trail IS the observable behavior
- Run comparative judge against criteria
- Write `report.md` with per-side results + judge verdict
- Include preflight reports + decision-log summaries as execution environment audit trail

The decision log makes the agent's reasoning chain visible. Without it, you only see the artifact — not why it was made that way.

## CLI Commands (Opt-in Player Mode Only)

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
