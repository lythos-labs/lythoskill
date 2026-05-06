// ── Agent adapter registry ──────────────────────────────────────────────────
//
// Canonical source: @lythos/agent-adapter
// This file re-exports for backward compatibility.
// New code should import from '@lythos/agent-adapter' directly.

// Side-effect: registers all built-in adapters (kimi, claude, claude-cli, deepseek)
import '@lythos/agent-adapter'

// Re-export from canonical source
export { useAgent, registerAgent, listAgents } from '@lythos/agent-adapter'
export type {
  AgentAdapter,
  AgentRunResult,
  CheckpointEntry,
  FsMutation,
  ToolDefinition,
} from '@lythos/agent-adapter'

// Adapter instances (backward compat aliases)
export { claudeAdapter } from './claude'
export { kimiAdapter } from './kimi'
export { deepseekAdapter } from './deepseek'
