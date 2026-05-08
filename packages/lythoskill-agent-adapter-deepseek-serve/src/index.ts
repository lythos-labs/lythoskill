// ── @lythos/agent-adapter-deepseek-serve — DeepSeek serve-mode adapter ─
//
// Daemon lifecycle: start/stop/reuse deepseek serve --http process.
// Uses HTTP thread API for full agent execution with file ops, shell, subagents.
//
// Self-registers on import:
//   import '@lythos/agent-adapter-deepseek-serve'
//   import { useAgent } from '@lythos/agent-adapter'
//   const agent = useAgent('deepseek')

export { deepseekServeAdapter, ensureServeRunning } from './deepseek-serve'
