---
created: 2026-05-08
updated: 2026-05-08
category: pattern
---

# Agent Adapter as Actor — Daemon Lifecycle + Facade for Multi-Player CLI Backends

> Each agent platform is an actor: it manages its own process lifecycle, persistent state, and internal orchestration. Clients interact through a single `spawn()` interface.

## Problem

Different agent CLIs have fundamentally different execution models:
- **One-shot** (kimi `--print`, claude `-p`): stateless, text-only or limited tools
- **Daemon** (deepseek `serve --http`, opencode `serve`): long-running process with HTTP API, persistent threads, subagent orchestration

Arena's `useAgent('xxx').spawn()` should work the same regardless — the adapter hides the lifecycle complexity.

## Pattern

```
Client (arena runner)
  │
  │  useAgent('deepseek').spawn({cwd, prompt})   ← single interface
  │
  ▼
Actor (deepseek-serve adapter)
  │
  ├── State:    ~/.agents/lythoskill/deepseek-serve.json
  │             { pid, port, version, threads: { sessionId → threadId } }
  │
  ├── Lifecycle:
  │     no lock → start serve → health check → write lock → ready
  │     lock + PID alive → health check → reuse
  │     lock + PID dead → clean up → start fresh
  │
  ├── Facade:
  │     POST /v1/threads → POST .../turns → SSE collect → return stdout
  │     Internal subagent allocation is DeepSeek's concern, not ours
  │
  └── Error: port conflict → auto-increment
              serve crash → auto-restart on next spawn
              stale lock → detect + overwrite
```

## Contract

The actor's public surface is exactly the `AgentAdapter` interface:

```typescript
interface AgentAdapter {
  name: string
  spawn(opts: {
    cwd: string
    brief: string
    timeoutMs: number
  }): Promise<AgentRunResult>
}
```

Everything else — PID management, port allocation, thread mapping, SSE parsing, serve lifecycle — is internal to the actor.

## Why Actor Model

- **Separation of concerns**: arena doesn't know about DeepSeek threads, ports, or serve processes
- **Persistent state**: lock file survives session restarts; thread IDs cross-reference arena sessions
- **Self-healing**: stale PID → auto-restart; port occupied → increment; serve down → respawn
- **Facade for internal complexity**: DeepSeek's 8 subagent roles, RLM queries, LSP diagnostics — all transparent to client

## Implementation

Canonical example: `packages/lythoskill-agent-adapter/src/adapters/deepseek-serve.ts`

Testable parts (no real serve needed):
- Lock file read/write/corrupt handling
- PID alive/dead detection (`process.kill(pid, 0)`)
- Version parsing from CLI stdout
- Session ID generation (`arena-{ts}-{counter}`)
- Thread API request path construction
- State transition logic (cold start / warm reuse / dead restart)

Integration-tested parts (real serve required):
- Thread creation + turn submission
- SSE event streaming + delta collection
- File operation execution
- Subagent orchestration (observed via output, not controlled)

## Related

- [DeepSeek-TUI headless analysis](../../03-lessons/2026-05-06-deepseek-tui-headless-programmatic-analysis.md) — API surface + subagent maturity
- [AGENTS.md as bootloader](./2026-05-08-agents-md-as-network-native-agent-bootloader.md) — same session, another actor pattern
- [Intent/Plan/Execute](./2026-05-04-intent-plan-execute-fractal-architecture-pattern.md) — actor's internal methods follow this
- `players.toml` — honest player status (tested/theoretical/blocked)

## Test Surface

27 unit tests for the actor FSM (`deepseek-serve.test.ts`):
- Lock file lifecycle: 5 tests
- PID detection: 2 tests
- Version parsing: 5 tests
- Session ID format: 2 tests
- Adapter registration: 2 tests
- State transitions: 4 tests
- API paths: 4 tests
- Schema validation: 2 tests
- Adapter exports: 1 test
category: pattern
---

# Agent adapter as actor — daemon lifecycle + facade pattern for multi-player CLI backends

> One-line summary of this pattern.

## Context
<!-- When does this apply? What problem does it solve? -->

## Details
<!-- The core content. Be specific. -->

## When to Apply / When Not to Apply
<!-- Boundaries and exceptions. -->

## Related
<!-- Links to related wiki entries, ADRs, or tasks. -->
