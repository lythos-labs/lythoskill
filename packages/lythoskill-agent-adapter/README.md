# @lythos/agent-adapter

Plugin architecture for agent backends. One interface, multiple implementations.

## Install

```bash
bun add @lythos/agent-adapter
```

## Built-in Adapters

Import the package once — adapters self-register on import:

```ts
import '@lythos/agent-adapter' // side-effect: registers all built-in adapters

import { useAgent, listAgents } from '@lythos/agent-adapter'

console.log(listAgents()) // ['kimi', 'claude', 'claude-cli', 'deepseek']

const agent = useAgent('kimi')
const result = await agent.spawn({
  cwd: '/tmp',
  brief: 'Write "hello" to output.txt',
  timeoutMs: 60000,
})

console.log(result.stdout)
```

| Adapter | Player name | Mechanism | Status |
|---------|-------------|-----------|--------|
| **Kimi** | `kimi` | `kimi --print --afk` | Stable |
| **DeepSeek** | `deepseek` | `deepseek --approval-policy auto` | Text-only (no tool execution) |
| **Claude CLI** | `claude`, `claude-cli` | `claude -p` | Deprecated — deferred tool deadlock |

## Custom Adapter

Any code implementing `AgentAdapter` can register itself:

```ts
import { registerAgent, type AgentAdapter } from '@lythos/agent-adapter'

const hermesAdapter: AgentAdapter = {
  name: 'hermes',
  async spawn(opts) {
    // Your spawn logic here
    return { stdout, stderr, code, durationMs, checkpoints }
  },
}

registerAgent('hermes', hermesAdapter)

// Now useAgent('hermes') works everywhere
```

## API

### `useAgent(name: string): AgentAdapter`

Look up a registered adapter by name. Throws if not found.

### `registerAgent(name: string, adapter: AgentAdapter): void`

Register a custom adapter. Idempotent — calling twice overwrites.

### `listAgents(): string[]`

List all registered agent names.

### `readCheckpoints(cwd: string): CheckpointEntry[]`

Read checkpoint JSONL files from `cwd/_checkpoints/`.

## Interface

```ts
interface AgentAdapter {
  name: string
  spawn(opts: {
    cwd: string
    brief: string
    timeoutMs: number
    idleTimeoutMs?: number
    env?: Record<string, string>
    allowedTools?: string   // comma-separated, e.g. "Read,Write,Edit"
    disallowedTools?: string
  }): Promise<AgentRunResult>

  invokeTool?(opts: {
    tool: ToolDefinition
    prompt: string
    cwd: string
    timeoutMs: number
  }): Promise<unknown>
}
```

## Zero Dependencies

This package has **zero external dependencies**. It defines the contract — implementation packages bring their own deps (e.g. `@lythos/agent-adapter-claude-sdk` depends on `@anthropic-ai/claude-agent-sdk`).

## License

MIT
