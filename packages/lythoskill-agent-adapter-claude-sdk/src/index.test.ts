import { describe, test, expect } from 'bun:test'
import { claudeSdkAdapter } from './index'

describe('@lythos/agent-adapter-claude-sdk', () => {
  test('adapter has correct name', () => {
    expect(claudeSdkAdapter.name).toBe('claude-sdk')
  })

  test('spawn throws clear error when auth is missing', async () => {
    const hasAuth = !!process.env.ANTHROPIC_API_KEY || !!process.env.CLAUDE_CODE_SSO_TOKEN || !!process.env.CLAUDECODE
    if (!hasAuth) {
      await expect(
        claudeSdkAdapter.spawn({ cwd: '/tmp', brief: 'test', timeoutMs: 1000 })
      ).rejects.toThrow('Claude SDK adapter requires authentication')
    }
  })

  test('invokeTool is not implemented', async () => {
    await expect(
      claudeSdkAdapter.invokeTool?.({
        tool: { name: 'test', description: 'test', input_schema: {} },
        prompt: 'test',
        cwd: '/tmp',
        timeoutMs: 1000,
      })
    ).rejects.toThrow('invokeTool not implemented')
  })
})
