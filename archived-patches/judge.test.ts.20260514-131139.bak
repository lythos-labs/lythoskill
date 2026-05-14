import { describe, test, expect } from 'bun:test'
import { buildJudgePrompt, runLLMJudge } from './judge'
import type { AgentScenario } from './agent-bdd'
import type { AgentAdapter, AgentRunResult } from './agents/types'

function makeScenario(judge?: string): AgentScenario {
  return {
    name: 'test-scenario',
    description: '',
    timeout: 30000,
    given: { deck: {} },
    when: 'Run a test command.',
    then: ['Output should contain OK'],
    judge: judge ?? 'Check that output contains OK.',
  }
}

function makeAgentResult(overrides?: Partial<AgentRunResult>): AgentRunResult {
  return {
    stdout: 'OK\nDone.',
    stderr: '',
    code: 0,
    durationMs: 1000,
    checkpoints: [{ step: 'test', tool: 'echo', args: [], timestamp: '2026-01-01T00:00:00Z' }],
    ...overrides,
  }
}

describe('buildJudgePrompt', () => {
  test('includes scenario instructions, criteria, evidence, and tool instruction', () => {
    const scenario = makeScenario()
    const result = makeAgentResult()
    const prompt = buildJudgePrompt(scenario, result, result.checkpoints)

    expect(prompt).toContain('Run a test command.')
    expect(prompt).toContain('Check that output contains OK.')
    expect(prompt).toContain('OK')
    expect(prompt).toContain('submit_verdict')
  })
})

describe('runLLMJudge', () => {
  test('parses PASS verdict from JSON output', async () => {
    const adapter: AgentAdapter = {
      name: 'mock',
      async spawn() {
        return {
          stdout: '{"verdict":"PASS","reason":"All good.","criteria":[{"name":"check","passed":true}]}',
          stderr: '',
          code: 0,
          durationMs: 10,
          checkpoints: [],
        }
      },
    }

    const result = await runLLMJudge(makeScenario(), makeAgentResult(), [], '/tmp/test', adapter)
    expect(result.verdict).not.toBeNull()
    expect(result.verdict!.verdict).toBe('PASS')
    expect(result.error).toBeUndefined()
  })

  test('parses FAIL verdict from JSON output', async () => {
    const adapter: AgentAdapter = {
      name: 'mock',
      async spawn() {
        return {
          stdout: '{"verdict":"FAIL","reason":"Missing output.","criteria":[{"name":"check","passed":false,"note":"not found"}]}',
          stderr: '',
          code: 0,
          durationMs: 10,
          checkpoints: [],
        }
      },
    }

    const result = await runLLMJudge(makeScenario(), makeAgentResult(), [], '/tmp/test', adapter)
    expect(result.verdict).not.toBeNull()
    expect(result.verdict!.verdict).toBe('FAIL')
  })

  test('extracts JSON from markdown fences', async () => {
    const adapter: AgentAdapter = {
      name: 'mock',
      async spawn() {
        return {
          stdout: '```json\n{"verdict":"PASS","reason":"OK.","criteria":[]}\n```',
          stderr: '',
          code: 0,
          durationMs: 10,
          checkpoints: [],
        }
      },
    }

    const result = await runLLMJudge(makeScenario(), makeAgentResult(), [], '/tmp/test', adapter)
    expect(result.verdict).not.toBeNull()
    expect(result.verdict!.verdict).toBe('PASS')
  })

  test('returns ERROR verdict for unparseable output', async () => {
    const adapter: AgentAdapter = {
      name: 'mock',
      async spawn() {
        return {
          stdout: 'not valid json at all',
          stderr: '',
          code: 0,
          durationMs: 10,
          checkpoints: [],
        }
      },
    }

    const result = await runLLMJudge(makeScenario(), makeAgentResult(), [], '/tmp/test', adapter)
    expect(result.verdict!.verdict).toBe('ERROR')
    expect(result.verdict!.reason).toContain('Judge failed')
    expect(result.verdict!.error).toBeTruthy()
  })

  test('returns ERROR verdict for invalid verdict value', async () => {
    const adapter: AgentAdapter = {
      name: 'mock',
      async spawn() {
        return {
          stdout: '{"verdict":"MAYBE","reason":"unsure","criteria":[]}',
          stderr: '',
          code: 0,
          durationMs: 10,
          checkpoints: [],
        }
      },
    }

    const result = await runLLMJudge(makeScenario(), makeAgentResult(), [], '/tmp/test', adapter)
    expect(result.verdict!.verdict).toBe('ERROR')
    expect(result.verdict!.error).toContain('invalid_value')
  })
})
