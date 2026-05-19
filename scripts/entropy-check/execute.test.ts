import { describe, it, expect } from 'bun:test'
import { executeEntropyCheck } from './execute.ts'
import type { EntropyConfig, EntropyIO } from './types.ts'

const baseConfig: EntropyConfig = {
  projectDir: '/tmp/test',
  checkpointFile: '/tmp/test/.last-entropy-check',
  intervalSeconds: 604800,
  strict: false,
  dryRun: false,
  force: false,
}

function mockIO(overrides: Partial<EntropyIO> = {}): EntropyIO & { logs: string[] } {
  const logs: string[] = []
  return {
    readFile: () => null,
    writeFile: () => {},
    exists: () => false,
    exec: () => ({ stdout: '', stderr: '', exitCode: 0 }),
    now: () => 1000000,
    listDir: () => [],
    isSymlink: () => false,
    log: (msg: string) => logs.push(msg),
    logs,
    ...overrides,
  }
}

describe('executeEntropyCheck', () => {
  it('skips when within interval', () => {
    const io = mockIO({
      readFile: () => '999000', // 1000s ago
      now: () => 1000000,
    })
    const report = executeEntropyCheck(baseConfig, io)
    expect(report.exitCode).toBe(0)
    expect(report.summary.pass).toBe(0)
    expect(io.logs.some(l => l.includes('skipped'))).toBe(true)
    expect(io.logs.some(l => l.includes('1000s ago'))).toBe(true)
  })

  it('runs all checks when expired', () => {
    const io = mockIO({
      readFile: () => '393200', // ~7 days ago
      now: () => 1000000,
      exists: (p: string) => p.includes('packages'),
    })
    const report = executeEntropyCheck(baseConfig, io)
    expect(report.results.length).toBe(5)
    expect(io.logs.some(l => l.includes('Running 5 check(s)'))).toBe(true)
  })

  it('dry-run shows plan without executing', () => {
    const io = mockIO({
      readFile: () => '999000',
      now: () => 1000000,
    })
    const config = { ...baseConfig, dryRun: true }
    const report = executeEntropyCheck(config, io)
    expect(report.results.length).toBe(0)
    expect(io.logs.some(l => l.includes('DRY RUN'))).toBe(true)
    expect(io.logs.some(l => l.includes('Should run: no'))).toBe(true)
  })

  it('dry-run shows checks when forced', () => {
    const io = mockIO()
    const config = { ...baseConfig, dryRun: true, force: true }
    const report = executeEntropyCheck(config, io)
    expect(io.logs.some(l => l.includes('Should run: yes'))).toBe(true)
    expect(io.logs.some(l => l.includes('cortex-probe'))).toBe(true)
  })

  it('writes checkpoint on completion', () => {
    let written: string | null = null
    const io = mockIO({
      now: () => 1234567,
      writeFile: (_path: string, content: string) => { written = content },
    })
    executeEntropyCheck(baseConfig, io)
    expect(written).toBe('1234567')
  })

  it('writes checkpoint even when checks fail', () => {
    let written: string | null = null
    const io = mockIO({
      now: () => 1234567,
      writeFile: (_path: string, content: string) => { written = content },
      exists: (p: string) => p.includes('skills') || p.includes('packages'),
      listDir: () => ['bad-symlink'],
      isSymlink: (p: string) => p.includes('bad-symlink'),
    })
    const report = executeEntropyCheck(baseConfig, io)
    expect(report.exitCode).toBe(1)
    expect(written).toBe('1234567')
  })

  it('shows interval and last check in output', () => {
    const io = mockIO({
      readFile: () => '500000',
      now: () => 1000000,
    })
    const config = { ...baseConfig, force: true }
    executeEntropyCheck(config, io)
    expect(io.logs.some(l => l.includes('Interval:'))).toBe(true)
    expect(io.logs.some(l => l.includes('Last check:'))) || expect(io.logs.some(l => l.includes('none'))).toBe(true)
  })

  it('shows custom interval in output', () => {
    const io = mockIO({
      readFile: () => '999990',
      now: () => 1000000,
    })
    const config = { ...baseConfig, intervalSeconds: 60, force: true }
    const report = executeEntropyCheck(config, io)
    // Forced run shows interval, not elapsed (checkpoint invalid due to force)
    expect(report.results.length).toBe(5)
    expect(io.logs.some(l => l.includes('Interval: 1m 0s'))).toBe(true)
    expect(io.logs.some(l => l.includes('Last check: none'))).toBe(true)
  })
})
