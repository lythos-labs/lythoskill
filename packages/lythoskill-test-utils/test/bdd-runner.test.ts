// agent-bdd: not for CI — requires `claude` CLI and LLM inference
import { describe, test, expect } from 'bun:test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { runClaudeAgent, readCheckpoints, setupWorkdir } from '../src/bdd-runner'

describe('runClaudeAgent', () => {
  test(
    'tracer bullet: brief returns ok and writes at least one checkpoint',
    async () => {
      const cwd = setupWorkdir('/tmp', 'runClaudeAgent-tracer')

      const brief = `Please write a checkpoint file to _checkpoints/test.jsonl containing this exact single-line JSON object and nothing else in that file:
{"step":"test","tool":"echo","args":["ok"],"timestamp":"2026-05-04T00:00:00Z"}
Then reply with exactly the word "ok".`

      const result = await runClaudeAgent({ cwd, brief, timeoutMs: 60000 })

      expect(result.code).toBe(0)
      expect(result.stdout.toLowerCase()).toContain('ok')
      expect(result.checkpoints.length).toBeGreaterThanOrEqual(1)
    },
    35000
  )
})

describe('readCheckpoints', () => {
  test('returns empty array when checkpoint dir does not exist', () => {
    const cwd = setupWorkdir('/tmp', 'readCheckpoints-missing')
    expect(readCheckpoints(cwd)).toEqual([])
  })

  test('reads and parses jsonl files in sorted order', () => {
    const cwd = setupWorkdir('/tmp', 'readCheckpoints-sorted')
    const checkpointDir = `${cwd}/_checkpoints`
    mkdirSync(checkpointDir, { recursive: true })
    writeFileSync(
      `${checkpointDir}/01-a.jsonl`,
      '{"step":"a","tool":"t1","args":[],"timestamp":"2026-05-04T00:00:00Z"}\n'
    )
    writeFileSync(
      `${checkpointDir}/02-b.jsonl`,
      '{"step":"b","tool":"t2","args":["x"],"timestamp":"2026-05-04T00:00:01Z"}\n\n{"step":"c","tool":"t3","args":["y","z"],"timestamp":"2026-05-04T00:00:02Z"}'
    )

    const checkpoints = readCheckpoints(cwd)
    expect(checkpoints).toHaveLength(3)
    expect(checkpoints[0].step).toBe('a')
    expect(checkpoints[1].step).toBe('b')
    expect(checkpoints[2].step).toBe('c')
    expect(checkpoints[2].args).toEqual(['y', 'z'])
  })

  test('skips malformed lines gracefully', () => {
    const cwd = setupWorkdir('/tmp', 'readCheckpoints-malformed')
    const checkpointDir = `${cwd}/_checkpoints`
    mkdirSync(checkpointDir, { recursive: true })
    writeFileSync(
      `${checkpointDir}/test.jsonl`,
      '{"step":"good","tool":"t","args":[],"timestamp":"2026-05-04T00:00:00Z"}\nnot-json\n'
    )

    const checkpoints = readCheckpoints(cwd)
    expect(checkpoints).toHaveLength(1)
    expect(checkpoints[0].step).toBe('good')
  })
})
