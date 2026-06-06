---
category: architecture
domain: testing
since: 2024-04
status: accepted
summary: |
  Every CLI command decomposes into Intent (DSL) → Plan (pure data) → Execute (IO with injectable adapters). Dry-run emerges naturally, pure plan functions unit-test without IO.
---

# Intent / Plan / Execute (Fractal Pattern)

Every CLI command, test harness, and arena run decomposes into three layers. The pattern repeats at every scale.

```
Intent (DSL)   →  Plan (pure data)  →  Execute (IO with injectable adapters)
arena.toml      →  ExecutionPlan     →  runArenaFromToml
deck config     →  RefreshPlan       →  executeRefreshPlan
reproduce.sh    →  AgentScenario     →  runAgentScenario
```

## Layer Responsibilities

| Layer | What | Test Strategy |
|-------|------|---------------|
| **Intent** | Declarative input (TOML, markdown, Zod schema). Version-controlled, agent-auditable | Schema validation |
| **Plan** | Pure function `buildXPlan(input, opts)` → typed data structure. Zero side effects | Unit tests |
| **Execute** | `executeXPlan(plan, io)` where `io = { spawn, delete, log, ... }` with defaults | Mock injection |

## Why This Matters

1. **Dry-run emerges naturally**: print the plan, skip execution
2. **Coverage without IO**: pure plan functions unit-test without git clone / agent spawn / `rm -rf`
3. **Expected log = spec**: inject `log: capture[]` → diff against expected output → testable
4. **Training signal**: agent actual log vs expected log → delta shows what went wrong
5. **`--yes` / non-interactive emerges naturally**: `io.confirm = () => true`

## IO Injection Table

| IO function | Production default | Test swap |
|-------------|-------------------|-----------|
| `spawn` | `Bun.spawn` / `spawnSync` | return `{ status, stdout, stderr }` |
| `delete` | `rmSync` | no-op |
| `log` | `console.log` | push to capture buffer |
| `gitPull` | `execSync git pull` | return `{ status, message }` |
| `linkDeck` | call `linkDeck()` | no-op |

## When to Apply

- When a function mixes logic (filtering, classification, branching) with IO (spawn, fs, network)
- When test coverage is low because IO can't run in CI
- When the same logic needs different IO backends
- When `--dry-run` would be useful to the user or agent

## When NOT to Apply

- Pure data transforms (already no IO)
- Trivial wrappers (over-abstraction)
- One-shot scripts (testability not beneficial)

## Git-dependent Tests in CI

Tests that create real git repos must set local git identity before committing:

```ts
beforeAll(async () => {
  const git = simpleGit(tmpDir)
  await git.init(['--initial-branch=main'])
  await git.addConfig('user.name', 'test')
  await git.addConfig('user.email', 'test@test.com')
})
```

## Plan Must Include Research

**Don't assume knowledge. A Plan without research is an imagined Plan.** The agent must search for existing patterns before committing to an approach — don't design from scratch when a standard solution exists. Five minutes of search beats thirty minutes of trial-and-error.

```
Plan layer:
  1. List behaviors to test
  2. Design public interface
  3. 🔍 Research: search for established patterns (MDN, Bun docs, GitHub issues)
  4. Pick and document the chosen approach
```

**Example**: `probeConnectivity` started with a custom racing loop; a web search revealed `Promise.any` + shared `AbortController` as the standard pattern. The custom loop was correct for the specific requirement, but the search saved fifteen minutes of unproductive debate.

**When to skip**: pure data transforms, one-line fixes, or changes with clearly no ecosystem precedent.
