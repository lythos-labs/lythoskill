# @lythos/agent-adapter-claude-sdk

Claude SDK adapter for `@lythos/agent-adapter`. Uses `@anthropic-ai/claude-agent-sdk` (`query()` API) instead of the fragile `claude -p` CLI path.

## Install

```bash
bun add @lythos/agent-adapter-claude-sdk
```

## Setup

Create `.claude-sdk-key` in your project root (same directory as `package.json`):

```
ANTHROPIC_API_KEY=sk-ant-...
# Optional: custom base URL (e.g. AWS Bedrock, Vertex)
ANTHROPIC_BASE_URL=https://api.anthropic.com
```

Or set the environment variable directly:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

## Usage

Import once — the adapter self-registers:

```ts
import '@lythos/agent-adapter-claude-sdk'
import { useAgent } from '@lythos/agent-adapter'

const agent = useAgent('claude-sdk')
const result = await agent.spawn({
  cwd: '/tmp',
  brief: 'Write "hello" to output.txt',
  timeoutMs: 60000,
})

console.log(result.stdout)
```

## Why SDK over CLI?

| | `claude -p` CLI | SDK `query()` |
|---|---|---|
| Deferred tool deadlock | ❌ Hangs | ✅ No deadlock |
| Stdin pipe bugs | ❌ ARM64 flush issues | ✅ Direct API |
| Env pollution | ❌ Nested detection | ✅ Clean |
| Tool permissions | `--permission-mode bypassPermissions` | `allowDangerouslySkipPermissions: true` |
| Output reliability | 6 commits, never produced | ✅ Stable |

## How it works

1. Reads `.claude-sdk-key` on module load (falls back to env vars)
2. Calls `query({ prompt, options: { cwd, allowedTools, disallowedTools, permissionMode: 'bypassPermissions' } })`
3. Iterates the async generator until `type: 'result'` message
4. Returns `AgentRunResult` with stdout, stderr, code, durationMs

## License

MIT
