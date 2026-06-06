import { describe, it, expect } from 'bun:test'
import { buildJudgePrompt, runLLMJudge } from './judge'
import type { JudgeInput, Evidence } from './schema'
import type { AgentAdapter } from './agents/types'
import type { CheckpointEntry } from './schema'

function makeInput(overrides?: Partial<JudgeInput>): JudgeInput {
  return {
    criteria: 'Check that output contains OK.',
    task_context: 'Simple test task for unit testing.',
    ...overrides,
  }
}

function makeEvidence(overrides?: Partial<Evidence>): Evidence {
  return {
    sandbox_cwd: '/tmp/test-workdir',
    stdout: 'OK\nDone.',
    stderr: '',
    artifact_files: ['output.html'],
    ...overrides,
  }
}

function makeCheckpoints(): CheckpointEntry[] {
  return [{ step: 'test', tool: 'echo', args: [], timestamp: '2026-01-01T00:00:00Z' } as CheckpointEntry]
}

describe('buildJudgePrompt', () => {
  it('includes role boundary, TASK CONTEXT (not invocation), criteria, and evidence', () => {
    const prompt = buildJudgePrompt(makeInput(), makeEvidence(), makeCheckpoints())

    expect(prompt).toContain('TEST JUDGE')
    expect(prompt).toContain('not the task executor')
    expect(prompt).toContain('TASK CONTEXT')
    expect(prompt).toContain('Simple test task')
    expect(prompt).toContain('Check that output contains OK.')
    expect(prompt).toContain('OK')
    expect(prompt).toContain('output.html')
  })

  it('handles empty task_context', () => {
    const prompt = buildJudgePrompt(
      makeInput({ task_context: '' }),
      makeEvidence(),
      makeCheckpoints()
    )
    expect(prompt).toContain('(no additional context)')
  })

  it('handles empty criteria', () => {
    const prompt = buildJudgePrompt(
      makeInput({ criteria: '' }),
      makeEvidence(),
      makeCheckpoints()
    )
    expect(prompt).toContain('(no criteria specified')
  })

  // Gap I fixed: precisely assert stdout truncation at 8000 chars
  // Uses 'Q' to avoid false positives from template text ('executor', 'extra', 'text', 'sandbox')
  it('truncates large stdout to 8000 characters', () => {
    const long = 'Q'.repeat(10000)
    const prompt = buildJudgePrompt(
      makeInput(),
      makeEvidence({ stdout: long }),
      makeCheckpoints()
    )
    const qCount = (prompt.match(/Q/g) ?? []).length
    expect(qCount).toBe(8000)
  })

  // Gap H fixed: negative test — task invocation text must NOT reach judge prompt
  it('NEVER contains task invocation text (scenario.when)', () => {
    // Even if criteria or task_context were accidentally contaminated with
    // a typical task instruction pattern, the prompt structure itself prevents
    // the "TASK UNDER EVALUATION" framing that caused the T6 hijacking bug.
    const prompt = buildJudgePrompt(
      makeInput({ criteria: 'Evaluate the HTML output.' }),
      makeEvidence(),
      makeCheckpoints()
    )
    // Old coupling path used "Task Instructions:" or similar framing.
    // The new prompt uses "TASK CONTEXT" with explicit disclaimers.
    expect(prompt).not.toContain('Task Instructions')
    expect(prompt).not.toContain('TASK UNDER EVALUATION')
    // The DEFENSE section explicitly tells judge to ignore task-instruction
    // fragments that may appear in stdout.
    expect(prompt).toContain('DEFENSE')
  })

  it('artifact_files list rendered in prompt', () => {
    const prompt = buildJudgePrompt(
      makeInput(),
      makeEvidence({ artifact_files: ['out.html', 'src/data.json'] }),
      makeCheckpoints()
    )
    expect(prompt).toContain('out.html')
    expect(prompt).toContain('src/data.json')
  })

  it('empty artifact_files shows no-files message', () => {
    const prompt = buildJudgePrompt(
      makeInput(),
      makeEvidence({ artifact_files: [] }),
      makeCheckpoints()
    )
    expect(prompt).toContain('(no artifact files detected)')
  })
})

describe('runLLMJudge', () => {
  it('parses PASS verdict from JSON output', async () => {
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
    const result = await runLLMJudge(makeInput(), makeEvidence(), [], adapter)
    expect(result.verdict).not.toBeNull()
    expect(result.verdict!.verdict).toBe('PASS')
    expect(result.error).toBeUndefined()
  })

  it('parses FAIL verdict from JSON output', async () => {
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
    const result = await runLLMJudge(makeInput(), makeEvidence(), [], adapter)
    expect(result.verdict!.verdict).toBe('FAIL')
  })

  it('extracts JSON from markdown fences', async () => {
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
    const result = await runLLMJudge(makeInput(), makeEvidence(), [], adapter)
    expect(result.verdict!.verdict).toBe('PASS')
  })

  it('returns ERROR verdict for unparseable output', async () => {
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
    const result = await runLLMJudge(makeInput(), makeEvidence(), [], adapter)
    expect(result.verdict!.verdict).toBe('ERROR')
    expect(result.verdict!.reason).toContain('Judge failed')
    expect(result.verdict!.error).toBeTruthy()
  })

  it('returns ERROR verdict for invalid verdict value', async () => {
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
    const result = await runLLMJudge(makeInput(), makeEvidence(), [], adapter)
    expect(result.verdict!.verdict).toBe('ERROR')
    expect(result.verdict!.error).toContain('invalid_value')
  })

  // Gap J: normalizeVerdictJson branch coverage — notes → reason
  it('normalizes notes field into reason', async () => {
    const adapter: AgentAdapter = {
      name: 'mock',
      async spawn() {
        return {
          stdout: '{"verdict":"PASS","notes":"Everything checks out.","criteria":[]}',
          stderr: '',
          code: 0,
          durationMs: 10,
          checkpoints: [],
        }
      },
    }
    const result = await runLLMJudge(makeInput(), makeEvidence(), [], adapter)
    expect(result.verdict!.verdict).toBe('PASS')
    expect(result.verdict!.reason).toBe('Everything checks out.')
  })

  // Gap J: normalizeVerdictJson branch coverage — summary → reason
  it('normalizes summary field into reason', async () => {
    const adapter: AgentAdapter = {
      name: 'mock',
      async spawn() {
        return {
          stdout: '{"verdict":"FAIL","summary":"Task incomplete.","criteria":[]}',
          stderr: '',
          code: 0,
          durationMs: 10,
          checkpoints: [],
        }
      },
    }
    const result = await runLLMJudge(makeInput(), makeEvidence(), [], adapter)
    expect(result.verdict!.reason).toBe('Task incomplete.')
  })

  // Gap J: normalizeVerdictJson branch coverage — criteria object → array
  it('converts nested criteria object into array', async () => {
    const adapter: AgentAdapter = {
      name: 'mock',
      async spawn() {
        return {
          stdout: '{"verdict":"PASS","reason":"ok","correctness":true,"completeness":false}',
          stderr: '',
          code: 0,
          durationMs: 10,
          checkpoints: [],
        }
      },
    }
    const result = await runLLMJudge(makeInput(), makeEvidence(), [], adapter)
    expect(result.verdict!.verdict).toBe('PASS')
    expect(result.verdict!.criteria).toHaveLength(2)
    expect(result.verdict!.criteria[0].name).toBe('correctness')
    expect(result.verdict!.criteria[0].passed).toBe(true)
    expect(result.verdict!.criteria[1].name).toBe('completeness')
    expect(result.verdict!.criteria[1].passed).toBe(false)
  })
})
