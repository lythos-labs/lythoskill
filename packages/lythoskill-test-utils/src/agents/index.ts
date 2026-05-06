import type { AgentAdapter } from './types'
import { claudeAdapter } from './claude'
import { kimiAdapter } from './kimi'
import { deepseekAdapter } from './deepseek'

const registry: Record<string, AgentAdapter> = {
  kimi: kimiAdapter,       // default: headless --print works reliably (eager tools, no deadlock)
  claude: claudeAdapter,
  deepseek: deepseekAdapter, // Rust-native, no Bun stdin bug, 1M context, subagent system
}

export function useAgent(name: string): AgentAdapter {
  const adapter = registry[name]
  if (!adapter) {
    throw new Error(`Unknown agent: "${name}". Available: ${Object.keys(registry).join(', ')}`)
  }
  return adapter
}

export { claudeAdapter } from './claude'
export { kimiAdapter } from './kimi'
export { deepseekAdapter } from './deepseek'
export type { AgentAdapter, AgentRunResult, CheckpointEntry, FsMutation, DeckConfig, SkillEntryLike } from './types'
