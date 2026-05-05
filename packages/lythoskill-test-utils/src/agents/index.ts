import type { AgentAdapter } from './types'
import { claudeAdapter } from './claude'
import { kimiAdapter } from './kimi'

const registry: Record<string, AgentAdapter> = {
  kimi: kimiAdapter,    // default: headless --print works reliably (eager tools, no deadlock)
  claude: claudeAdapter,
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
export type { AgentAdapter, AgentRunResult, CheckpointEntry, FsMutation, DeckConfig, SkillEntryLike } from './types'
