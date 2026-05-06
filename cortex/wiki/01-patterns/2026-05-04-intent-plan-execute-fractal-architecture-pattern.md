---
created: 2026-05-05
updated: 2026-05-06
category: pattern
---

# Intent / Plan / Execute — Fractal Architecture Pattern

> **TL;DR**
> - **Separates concerns**: every workflow → declarative intent, pure planning logic, injectable execution.
> - **Testable without side effects**: plans are typed data structures, unit-testable, dry-run printable. No fs/network/git.
> - **Scales fractally**: same three-layer decomposition at package, command, and test level.

Every CLI command, test harness, and arena run decomposes into three layers. The pattern repeats at every scale — you get value at any layer you stop at.

## The Three Layers

```
Intent (DSL)  →  Plan (pure data)  →  Execute (IO injection)
.agent.md      →  AgentScenario     →  runAgentScenario
arena.toml     →  ExecutionPlan     →  runArenaFromToml
deck config    →  RefreshPlan       →  executeRefreshPlan
```

### Intent: what you want

Declarative input. DSLs (TOML, markdown, Zod schema). Human-writable, agent-auditable, version-controlled. **You can stop here and understand what will happen.**

### Plan: pure function → data structure

`buildXPlan(input, opts)` returns a typed plan object. Zero side effects. Unit-testable. **You can assert correctness without executing.** Dry-run naturally emerges: print the plan, skip execution.

### Execute: IO injection

`executeXPlan(plan, io)` where `io = { spawn, delete, log, gitPull }`. Defaults to real functions. Tests swap in mocks. **You can verify behavior by capturing log output instead of doing real IO.**

## The IO Injection Table

| IO function | Production | Test swap |
|-------------|-----------|-----------|
| `spawn` | `Bun.spawn` / `spawnSync` | return `{ status, stdout, stderr }` |
| `delete` | `rmSync` | no-op |
| `log` | `console.log` | push to capture buffer |
| `gitPull` | `execSync git pull` | return `{ status, message }` |
| `linkDeck` | `bunx @lythos/skill-deck link` | no-op |

## Why this matters in practice

1. **Dry-run emerges naturally** — print the plan, skip execution
2. **Coverage without IO** — pure plan functions unit-test without git clone / agent spawn / `rm -rf`
3. **Expected log = spec** — inject `log: capture[]` → diff against expected output → testable
4. **Training signal** — agent actual log vs expected log → delta shows what went wrong
5. **`--yes` / non-interactive emerges naturally** — `io.confirm = () => true`

## Plan as Training Signal

When the agent executes against a plan, the delta between expected and actual output becomes a learning signal:

| Delta | Meaning |
|-------|---------|
| Agent misses steps | Execution defect → needs better training / clearer instructions |
| Agent adds steps | Plan too narrow → relax constraints |
| Agent finds a better path | Plan itself should evolve → update the spec |

The plan **is** the specification. The log **is** the evidence. The diff **is** the feedback loop.

## Fractal Property

```
Layer 0 (package):    SKILL.md → src/*.ts → bunx CLI
Layer 1 (command):    CLI flags → buildPlan() → executePlan(io)
Layer 2 (test):       .agent.md → AgentScenario → runAgentScenario
```

Each layer can stop at Plan and produce value:
- **SKILL.md**: agent reads and understands the package without running code
- **`--dry-run`**: prints the plan without executing
- **`parseAgentMd` + Zod**: validates `.agent.md` without spawning an agent

## Concrete Example: refreshDeck

### Before (monolithic — logic and IO mixed)

```ts
function refreshDeck() {
  const deck = readFileSync(findDeckToml(cwd), 'utf-8')        // IO
  const targets = parseDeck(deck).entries                        // pure (but inline)
  for (const t of targets) {
    const gitRoot = execSync('git rev-parse', { cwd: t.path })   // IO
    execSync('git pull', { cwd: gitRoot })                       // IO
    console.log(`Updated: ${t.alias}`)                           // IO
  }
}
```

### After (separated — IO injected, pure logic testable)

```ts
// Plan: pure, unit-testable, dry-run printable
const plan = buildRefreshPlan(deck, { workdir: '/custom' })
// → { targets: [{ alias, path, type: 'git'|'localhost'|'missing', gitRoot? }] }

// Execute: IO injectable, test with mocks
const results = executeRefreshPlan(plan, {
  gitPull: (dir) => execSync('git pull', { cwd: dir }),
  log: console.log,
})
```

**Coverage**: plan functions 95%+ lines, 23 tests, zero IO.

## Real Example: Player Abstraction (AgentAdapter)

The same pattern validated at the agent backend layer. Arena needs reliable agent spawn in Bun context. Claude CLI `claude -p` had deferred tool deadlock (6 monkey-patch commits, never worked). Kimi CLI `kimi --print --afk` has eager tools — worked first try.

```ts
// Plan: AgentAdapter interface (pure contract)
interface AgentAdapter {
  name: string
  spawn(opts: { cwd, brief, timeoutMs }): Promise<AgentRunResult>
}

// Execute: swap backend without changing pipeline
useAgent('kimi')   // default: reliable
useAgent('claude') // secondary: known issues
```

Arena runner code changed zero lines. One new adapter file. Pattern validated. See [player-abstraction-agent-swappable-backend.md](./player-abstraction-agent-swappable-backend.md) for full story.

## When to Apply

- When a function mixes logic (conditionals, filtering, classification) with IO (spawn, fs, network)
- When `--dry-run` would be useful to the user or agent
- When test coverage is low because IO can't run in CI
- When the same logic needs different IO backends (different CLIs, different filesystems)

## When Not to Apply

- Pure data transforms (already no IO to separate)
- Trivial wrappers (over-abstraction)
- One-shot scripts where testability isn't beneficial

## Related

- EPIC-20260504230503067: Arena TOML declarative config (first application)
- EPIC-20260504231931835: Deck refresh/prune extraction (retrofit to existing commands)
- EPIC-20260504235551635: test-utils fractal coverage (applied to infra itself)
- ADR-20260503222838594: Kanban pull mode (same pattern at governance level)
- ADR-20260506021112492: Kimi CLI as default AgentAdapter (Player abstraction validation)

## Use Case: Temporary Deck, Zero Workspace Modification

Combining `/tmp` CWD isolation with `agent-run` enables a powerful pattern:

```bash
# Polish a document using skills without touching the project workspace
bunx @lythos/skill-arena agent-run \
  --task polish-article.md \
  --deck documents.toml \
  --out ./output
```

The agent gets a temporary deck (docx + pdf skills) in an isolated `/tmp` workdir, reads the target file, produces polished output, and the workspace is untouched. No `npm install`, no `.claude/skills/` pollution, no cold pool modification needed for the deck — `bunx @lythos/skill-deck link` resolves skills on the fly.

Validated 2026-05-06: `documents.toml` + journey lesson wiki → polished `output.md` + 14KB `output.docx`.
