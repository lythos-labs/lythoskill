import type { AgentAdapter } from './types'
import { claudeAdapter } from './claude'

const registry: Record<string, AgentAdapter> = {
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
export type { AgentAdapter, AgentRunResult, CheckpointEntry, FsMutation, DeckConfig, SkillEntryLike } from './types'
