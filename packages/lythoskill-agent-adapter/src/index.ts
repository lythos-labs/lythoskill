// ── @lythos/agent-adapter — plugin/extension architecture for agent backends ─
//
// Core contract: AgentAdapter interface + registerAgent() / useAgent() registry.
// Each adapter self-registers on import. Third-party adapters use the same pattern.
//
// PACKAGE SCOPE: This package contains the INTERFACE + REGISTRY + LIGHTWEIGHT
// adapters only. Lightweight = pure CLI spawn (Bun.spawn), no daemon, no SSE, no
// persistent state. Heavy adapters live in independent packages:
//
//   @lythos/agent-adapter-claude-sdk       — Anthropic Agent SDK adapter
//   @lythos/agent-adapter-deepseek-serve   — DeepSeek serve-mode adapter (daemon)
//
// If your adapter manages a long-running process, allocates ports, parses SSE,
// or writes PID files — create a new package. Keep this one thin.
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

// Built-in adapters — lightweight CLI wrappers only.
// Heavy adapters live in separate packages (see above).
export { kimiAdapter } from './adapters/kimi'
// Shared version-range check (ADR-20260828004129233 Option B) — used by adapter
// packages (e.g. agent-adapter-deepseek-harness) that declare an upstream range.
export { satisfiesVersionRange } from './adapters/kimi'
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
