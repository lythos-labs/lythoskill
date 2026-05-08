# @lythos/agent-adapter

Plugin architecture for agent backends. One interface, multiple implementations.

**This package is the INTERFACE + REGISTRY + lightweight CLI adapters only.**
Heavy adapters (daemon lifecycle, SSE parsing, PID management) live in independent packages:

| Package | Player | Mechanism | Weight |
|---------|--------|-----------|--------|
| `@lythos/agent-adapter` | `kimi` | `kimi --print` | Light — pure CLI spawn |
| `@lythos/agent-adapter` | ~~`claude`~~ | ~~`claude -p`~~ | Deprecated — deferred tool deadlock |
| `@lythos/agent-adapter-claude-sdk` | `claude` | Anthropic Agent SDK | Heavy — SDK dep |
| `@lythos/agent-adapter-deepseek-serve` | `deepseek` | `deepseek serve --http` thread API | Heavy — daemon, SSE, PID lock |

Rule: if your adapter starts a long-running process, allocates ports, or parses SSE —
create a new package. Keep this one thin.

## Install

```bash
bun add @lythos/agent-adapter
```

## Usage

```ts
import { useAgent } from '@lythos/agent-adapter'
import '@lythos/agent-adapter'                  // lightweight adapters (kimi, claude-cli)
import '@lythos/agent-adapter-claude-sdk'       // heavy: claude-sdk
import '@lythos/agent-adapter-deepseek-serve'   // heavy: deepseek serve

const agent = useAgent('deepseek')
const result = await agent.spawn({ cwd: '/tmp', brief: '...', timeoutMs: 60000 })
```

## Custom Adapter

```ts
import { registerAgent, type AgentAdapter } from '@lythos/agent-adapter'

const myAdapter: AgentAdapter = {
  name: 'my-agent',
  async spawn(opts) { /* ... */ return { stdout, stderr, code: 0, durationMs, checkpoints: [] } },
}
registerAgent('my-agent', myAdapter)
```

## Authentication & Runtime Setup

> "agent-run isn't 'install CLI and it works' — every player needs platform-specific authentication that the adapter does NOT bundle." — OpenClaw test report, 2026-05-08

Each backend has its own credential model. The adapter package only provides the integration glue; you must independently configure the upstream platform's auth.

| Player | Adapter package | Required credential | Setup |
|---|---|---|---|
| `kimi` | `@lythos/agent-adapter` (built-in) | Moonshot login (NOT npm `kimi-cli`) | `uv tool install kimi-cli` then `kimi login` (one-time, persists in `~/.config/kimi`) |
| `claude` | `@lythos/agent-adapter-claude-sdk` | `ANTHROPIC_API_KEY` | `export ANTHROPIC_API_KEY=sk-ant-...` in your shell |
| `claude-cli` *(deprecated)* | `@lythos/agent-adapter` (built-in) | `claude` CLI session | n/a — deprecated due to deferred-tool deadlock |
| `deepseek` | `@lythos/agent-adapter-deepseek-serve` | DeepSeek API key | `export DEEPSEEK_API_KEY=sk-...` or `deepseek auth` |
| `cursor`, `gemini` | (built-in pass-through to `useAgent`) | Platform-specific | Run that platform's own auth flow first |

### Runtime gotchas (learned from OpenClaw integration testing)

These are **not bugs** — they are inherent to how Bun + npm + workspaces interact with optional adapters. Worth knowing before you debug.

1. **`bunx` ephemeral env does NOT read workspace `node_modules`**. If you `bunx @lythos/skill-arena agent-run --player deepseek` and get "adapter not found", it's because bunx pulled a fresh copy that doesn't include the optional `@lythos/agent-adapter-deepseek-serve` peer. Solutions:
   - Run the local source directly: `bun packages/lythoskill-arena/src/cli.ts agent-run ...`
   - Or install adapters globally: `bun add -g @lythos/agent-adapter-deepseek-serve`
2. **`Bun.spawn` doesn't inherit registry state**. If you spawn a child process expecting it to find adapters registered in the parent, it won't — the child has a fresh module graph. The adapter must be `import`-ed at the top of the spawned script, not registered via side-channel.
3. **Optional adapter imports are conditional** — arena's CLI does:
   ```ts
   try { await import('@lythos/agent-adapter-claude-sdk') } catch { /* package not installed */ }
   try { await import('@lythos/agent-adapter-deepseek-serve') } catch { /* package not installed */ }
   ```
   This means a missing package is silent at startup; failures show up later as `useAgent('claude')` returning the built-in fallback (or throwing). Install the heavy adapter package explicitly before running with that player.
4. **Heavy adapter cold start**: `@lythos/agent-adapter-deepseek-serve` starts a `deepseek serve --http` daemon and waits for health-check. First run takes a few seconds; subsequent runs reuse the running daemon via PID lockfile in `~/.agents/lythoskill/deepseek-serve.json`.
5. **`kimi` (built-in) ≠ `kimi-cli` on npm**. The `kimi` player invokes Moonshot's official `kimi` binary installed via `uv tool install kimi-cli`. The npm package `kimi-cli` is unrelated and is NOT what this adapter uses.

### Quick auth check

Before running `agent-run`, verify your chosen player can authenticate:

```bash
# claude — verify ANTHROPIC_API_KEY is set
echo "${ANTHROPIC_API_KEY:?ANTHROPIC_API_KEY not set}" | head -c 10

# deepseek — verify DEEPSEEK_API_KEY or local auth
echo "${DEEPSEEK_API_KEY:?DEEPSEEK_API_KEY not set}" | head -c 10
# or: deepseek auth status

# kimi — verify Moonshot login persisted
kimi --version && ls ~/.config/kimi/
```

If any of these fail, fix auth first — `agent-run` will not surface a clear error message; you'll just get a generic adapter failure at run time.

## API

| Export | Description |
|--------|------------|
| `useAgent(name)` | Look up registered adapter |
| `registerAgent(name, adapter)` | Register adapter (idempotent) |
| `listAgents()` | List all registered names |
| `readCheckpoints(cwd)` | Read JSONL from `_checkpoints/` |

## License

MIT
