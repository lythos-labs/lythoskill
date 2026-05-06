import type { AgentAdapter } from './types'

const registry: Record<string, AgentAdapter> = {}

export function registerAgent(name: string, adapter: AgentAdapter): void {
  registry[name] = adapter
}

export function useAgent(name: string): AgentAdapter {
  const adapter = registry[name]
  if (!adapter) {
    throw new Error(
      `Unknown agent: "${name}". Available: ${Object.keys(registry).join(', ') || '(none)'}`
    )
  }
  return adapter
}

export function listAgents(): string[] {
  return Object.keys(registry)
}
