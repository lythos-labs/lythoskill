import { describe, test, expect } from 'bun:test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { readCheckpoints, setupWorkdir, assertOutput, slugifyWorkdirName } from './bdd-runner'

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

describe('assertOutput', () => {
  test('passes when exit code matches', () => {
    const errors = assertOutput({ code: 0, stdout: '', stderr: '' }, { exitCode: 0 })
    expect(errors).toEqual([])
  })

  test('fails when exit code mismatches', () => {
    const errors = assertOutput({ code: 1, stdout: '', stderr: '' }, { exitCode: 0 })
    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain('exit code')
  })

  test('finds expected stdout content', () => {
    const errors = assertOutput({ code: 0, stdout: 'hello world', stderr: '' }, { stdoutContains: ['hello'] })
    expect(errors).toEqual([])
  })

  test('fails when stdout content missing', () => {
    const errors = assertOutput({ code: 0, stdout: 'foo', stderr: '' }, { stdoutContains: ['bar'] })
    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain('stdout missing')
  })

  test('fails when excluded stdout content found', () => {
    const errors = assertOutput({ code: 0, stdout: 'error occurred', stderr: '' }, { stdoutNotContains: ['error'] })
    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain('unexpectedly contains')
  })

  test('finds expected stderr content', () => {
    const errors = assertOutput({ code: 0, stdout: '', stderr: 'warning: deprecated' }, { stderrContains: ['warning'] })
    expect(errors).toEqual([])
  })

  test('multiple assertions accumulate errors', () => {
    const errors = assertOutput({ code: 2, stdout: 'a', stderr: 'b' }, { exitCode: 0, stdoutContains: ['x'] })
    expect(errors).toHaveLength(2)
  })

  test('undefined expectations pass through', () => {
    const errors = assertOutput({ code: 0, stdout: '', stderr: '' }, {})
    expect(errors).toEqual([])
  })
})

describe('slugifyWorkdirName', () => {
  test('lowercases and replaces special chars with hyphens', () => {
    expect(slugifyWorkdirName('My Test Scenario')).toBe('my-test-scenario')
  })

  test('removes leading/trailing non-alphanum', () => {
    expect(slugifyWorkdirName('Hello World')).toBe('hello-world')
  })

  test('handles mixed scripts', () => {
    const result = slugifyWorkdirName('Test Scenario')
    expect(result).toBe('test-scenario')
  })

  test('preserves digits', () => {
    expect(slugifyWorkdirName('test-123')).toBe('test-123')
  })
})
