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

## API

| Export | Description |
|--------|------------|
| `useAgent(name)` | Look up registered adapter |
| `registerAgent(name, adapter)` | Register adapter (idempotent) |
| `listAgents()` | List all registered names |
| `readCheckpoints(cwd)` | Read JSONL from `_checkpoints/` |

## License

MIT
