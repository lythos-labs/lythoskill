import { describe, it, expect } from 'bun:test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { readCheckpoints, setupWorkdir, assertOutput, slugifyWorkdirName } from './bdd-runner'

describe('readCheckpoints', () => {
  it('returns empty array when checkpoint dir does not exist', () => {
    const cwd = setupWorkdir('/tmp', 'readCheckpoints-missing')
    expect(readCheckpoints(cwd)).toEqual([])
  })

  it('reads and parses jsonl files in sorted order', () => {
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

  it('skips malformed lines gracefully', () => {
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

describe('assertOutput', () => {
  it('passes when exit code matches', () => {
    const errors = assertOutput({ code: 0, stdout: '', stderr: '' }, { exitCode: 0 })
    expect(errors).toEqual([])
  })

  it('fails when exit code mismatches', () => {
    const errors = assertOutput({ code: 1, stdout: '', stderr: '' }, { exitCode: 0 })
    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain('exit code')
  })

  it('finds expected stdout content', () => {
    const errors = assertOutput({ code: 0, stdout: 'hello world', stderr: '' }, { stdoutContains: ['hello'] })
    expect(errors).toEqual([])
  })

  it('fails when stdout content missing', () => {
    const errors = assertOutput({ code: 0, stdout: 'foo', stderr: '' }, { stdoutContains: ['bar'] })
    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain('stdout missing')
  })

  it('fails when excluded stdout content found', () => {
    const errors = assertOutput({ code: 0, stdout: 'error occurred', stderr: '' }, { stdoutNotContains: ['error'] })
    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain('unexpectedly contains')
  })

  it('finds expected stderr content', () => {
    const errors = assertOutput({ code: 0, stdout: '', stderr: 'warning: deprecated' }, { stderrContains: ['warning'] })
    expect(errors).toEqual([])
  })

  it('multiple assertions accumulate errors', () => {
    const errors = assertOutput({ code: 2, stdout: 'a', stderr: 'b' }, { exitCode: 0, stdoutContains: ['x'] })
    expect(errors).toHaveLength(2)
  })

  it('undefined expectations pass through', () => {
    const errors = assertOutput({ code: 0, stdout: '', stderr: '' }, {})
    expect(errors).toEqual([])
  })
})

describe('slugifyWorkdirName', () => {
  it('lowercases and replaces special chars with hyphens', () => {
    expect(slugifyWorkdirName('My Test Scenario')).toBe('my-test-scenario')
  })

  it('removes leading/trailing non-alphanum', () => {
    expect(slugifyWorkdirName('Hello World')).toBe('hello-world')
  })

  it('handles mixed scripts', () => {
    const result = slugifyWorkdirName('Test Scenario')
    expect(result).toBe('test-scenario')
  })

  it('preserves digits', () => {
    expect(slugifyWorkdirName('test-123')).toBe('test-123')
  })
})
