// ── @lythos/agent-adapter — plugin/extension architecture for agent backends ─
//
// Core contract: AgentAdapter interface + registerAgent() / useAgent() registry.
// Each adapter self-registers on import. Third-party adapters use the same pattern.
//
// Usage:
//   import { useAgent } from '@lythos/agent-adapter'
//   import '@lythos/agent-adapter'           // loads all built-in adapters
//   const agent = useAgent('kimi')
//   const result = await agent.spawn({ cwd, brief, timeoutMs })

// Types
export type {
  AgentAdapter,
  AgentRunResult,
  CheckpointEntry,
  FsMutation,
  ToolDefinition,
} from './types'

// Registry
export { registerAgent, useAgent, listAgents } from './registry'

// Checkpoint utility
export { readCheckpoints } from './checkpoint'

// Built-in adapters (side-effect: registerAgent on import)
export { kimiAdapter } from './adapters/kimi'
export { deepseekAdapter } from './adapters/deepseek'
export {
  claudeCliAdapter,
  buildClaudeCommand,
  buildCleanEnv,
  buildToolPrompt,
  DEFAULT_ALLOWED_TOOLS,
  DEFAULT_DISALLOWED_TOOLS,
  extractJson,
} from './adapters/claude-cli'
export type { SpawnCommand } from './adapters/claude-cli'
