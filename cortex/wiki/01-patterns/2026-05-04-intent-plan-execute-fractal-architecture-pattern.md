---
created: 2026-05-05
updated: 2026-05-05
category: pattern
---

# Intent / Plan / Execute — fractal architecture pattern

Every CLI command, test harness, and arena run can be decomposed into three layers. The pattern is fractal: it repeats at every scale, and you get value at every layer.

## The Three Layers

```
Intent (DSL)  →  Plan (pure data)  →  Execute (IO)
.agent.md      →  AgentScenario     →  runAgentScenario
arena.toml     →  ExecutionPlan     →  runArenaFromToml
deck config    →  RefreshPlan       →  executeRefreshPlan
```

### Intent: what you want
Declarative input. DSLs (TOML, markdown, Zod schema). Human-writable, agent-auditable, version-controlled. **You can stop here and understand what will happen.**

### Plan: pure function → data structure
`buildXPlan(input, opts)` returns a typed plan object. Zero side effects. Unit-testable. **You can assert correctness without executing.** Dry-run naturally emerges: print the plan, exit.

### Execute: IO injection
`executeXPlan(plan, io)` where `io = { spawn, delete, log, gitPull }`. Defaults to real functions. Tests swap in mocks. **You can verify "what would happen" by capturing log output.**

## The IO Injection Table

| IO function | Production | Test |
|-------------|-----------|------|
| `spawn` | `Bun.spawn` / `spawnSync` | return `{ status, stdout, stderr }` |
| `delete` | `rmSync` | no-op |
| `log` | `console.log` | capture buffer |
| `gitPull` | `execSync git pull` | return `{ status, message }` |

## Fractal property

The same pattern holds at every level:

```
Layer 0 (package):    SKILL.md → src/*.ts → bunx CLI
Layer 1 (command):    CLI flags → buildPlan() → executePlan(io)
Layer 2 (test):       .agent.md → AgentScenario → runAgentScenario
```

Each layer can stop at the Plan step and produce value:
- SKILL.md: agent reads and understands the package
- `--dry-run`: prints plan, no execution
- `parseAgentMd` + Zod: validates .agent.md without running agent

## Plan as training signal

When the agent executes against a plan, the diff between expected and actual output is the signal:

| Delta | Meaning |
|-------|---------|
| Agent misses steps | Execution defect → needs training / better instructions |
| Agent adds steps | Plan too narrow → relax constraints |
| Agent finds better path | Plan itself should evolve → update the spec |

The plan IS the specification. The log IS the evidence. The diff IS the feedback loop.

## When to Apply

- Any function that mixes logic (conditionals, filtering, classification) with IO (spawn, fs, network)
- When `--dry-run` would be useful
- When test coverage is low because IO can't run in CI
- When the same logic needs to be reused with different IO backends

## When Not to Apply

- Pure data transforms (no IO to separate)
- Trivial wrappers (don't over-abstract)
- One-shot scripts where testability doesn't matter

## Concrete Examples

### Before (monolithic)

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

### After (separated)

```ts
// Pure: unit-testable, dry-run printable
const plan = buildRefreshPlan(deck, { workdir: '/custom' })
// plan = { targets: [{ alias, path, type: 'git'|'localhost'|'missing', gitRoot? }] }

// IO: injectable for testing
const results = executeRefreshPlan(plan, {
  gitPull: (dir) => execSync('git pull', { cwd: dir }),
  log: console.log,
})
```

## Related

- EPIC-20260504230503067: Arena TOML declarative config (first application of this pattern)
- EPIC-20260504231931835: Deck refresh/prune extraction (applied to existing commands)
- EPIC-20260504235551635: test-utils fractal coverage (applied to infra itself)
- ADR-20260503222838594: Kanban pull mode (same pattern at governance level)
