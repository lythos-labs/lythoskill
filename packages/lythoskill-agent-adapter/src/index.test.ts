import { describe, test, expect } from 'bun:test'
import { useAgent, registerAgent, listAgents, type AgentAdapter } from './index'

describe('@lythos/agent-adapter', () => {
  test('built-in adapters are auto-registered on import', () => {
    const agents = listAgents()
    expect(agents).toContain('kimi')
    expect(agents).toContain('claude')
    expect(agents).toContain('claude-cli')
    expect(agents).toContain('deepseek')
  })

  test('useAgent returns kimi adapter', () => {
    const adapter = useAgent('kimi')
    expect(adapter.name).toBe('kimi')
    expect(typeof adapter.spawn).toBe('function')
  })

  test('useAgent returns claude-cli adapter', () => {
    const adapter = useAgent('claude-cli')
    expect(adapter.name).toBe('claude')
  })

  test('useAgent throws for unknown agent', () => {
    expect(() => useAgent('gpt-5')).toThrow('Unknown agent: "gpt-5"')
  })

  test('registerAgent adds custom adapter', () => {
    const mockAdapter: AgentAdapter = {
      name: 'mock',
      async spawn(opts) {
        return { stdout: 'mock', stderr: '', code: 0, durationMs: 0, checkpoints: [] }
      },
    }
    registerAgent('mock', mockAdapter)
    expect(listAgents()).toContain('mock')
    expect(useAgent('mock').name).toBe('mock')
  })

  test('useAgent returns deepseek adapter', () => {
    const adapter = useAgent('deepseek')
    expect(adapter.name).toBe('deepseek')
    expect(typeof adapter.spawn).toBe('function')
  })

  test('spawn throws clear error when binary is missing', async () => {
    const adapter = useAgent('kimi')
    const hasKimi = !!Bun.which('kimi')
    if (!hasKimi) {
      await expect(
        adapter.spawn({ cwd: '/tmp', brief: 'test', timeoutMs: 1000 })
      ).rejects.toThrow('kimi not found in PATH')
    }
  })
})
