import { describe, it, expect } from 'bun:test'
import { buildCheckPlan, buildReportPlan } from './plan.ts'
import type { EntropyConfig } from './types.ts'

const baseConfig: EntropyConfig = {
  projectDir: '/tmp/test',
  checkpointFile: '/tmp/test/.last-entropy-check',
  intervalSeconds: 604800, // 7 days
  strict: false,
  dryRun: false,
  force: false,
}

describe('buildCheckPlan', () => {
  it('should run when --force is set', () => {
    const plan = buildCheckPlan({ ...baseConfig, force: true }, '12345', 99999)
    expect(plan.shouldRun).toBe(true)
    expect(plan.reason).toContain('Forced')
    expect(plan.checks).toHaveLength(5)
  })

  it('should run when no checkpoint exists', () => {
    const plan = buildCheckPlan(baseConfig, null, 100000)
    expect(plan.shouldRun).toBe(true)
    expect(plan.reason).toContain('No checkpoint')
    expect(plan.checkpointValid).toBe(false)
  })

  it('should run when checkpoint is empty', () => {
    const plan = buildCheckPlan(baseConfig, '', 100000)
    expect(plan.shouldRun).toBe(true)
    expect(plan.reason).toContain('empty')
    expect(plan.checkpointValid).toBe(false)
  })

  it('should run when checkpoint is whitespace-only', () => {
    const plan = buildCheckPlan(baseConfig, '   \n  ', 100000)
    expect(plan.shouldRun).toBe(true)
    expect(plan.reason).toContain('empty')
  })

  it('should run when checkpoint is corrupted (non-numeric)', () => {
    const plan = buildCheckPlan(baseConfig, 'not-a-number', 100000)
    expect(plan.shouldRun).toBe(true)
    expect(plan.reason).toContain('corrupted')
    expect(plan.checkpointValid).toBe(false)
  })

  it('should skip when checkpoint is valid and within interval', () => {
    const now = 1000000
    const lastCheck = now - 1000 // 1000s ago
    const plan = buildCheckPlan(baseConfig, String(lastCheck), now)
    expect(plan.shouldRun).toBe(false)
    expect(plan.checkpointValid).toBe(true)
    expect(plan.lastCheckTime).toBe(lastCheck)
    expect(plan.elapsedSeconds).toBe(1000)
  })

  it('should run when checkpoint is valid but expired', () => {
    const now = 1000000
    const lastCheck = now - 604801 // 1 second over 7 days
    const plan = buildCheckPlan(baseConfig, String(lastCheck), now)
    expect(plan.shouldRun).toBe(true)
    expect(plan.checkpointValid).toBe(true)
    expect(plan.elapsedSeconds).toBe(604801)
  })

  it('should run at exact boundary (>= interval)', () => {
    const now = 1000000
    const lastCheck = now - 604800 // exactly 7 days
    const plan = buildCheckPlan(baseConfig, String(lastCheck), now)
    expect(plan.shouldRun).toBe(true)
  })

  it('should respect custom interval in seconds', () => {
    const config = { ...baseConfig, intervalSeconds: 60 }
    const now = 1000
    const lastCheck = now - 30 // 30s ago
    const plan = buildCheckPlan(config, String(lastCheck), now)
    expect(plan.shouldRun).toBe(false)
    expect(plan.elapsedSeconds).toBe(30)
  })

  it('should run with custom interval when expired', () => {
    const config = { ...baseConfig, intervalSeconds: 60 }
    const now = 1000
    const lastCheck = now - 61 // 61s ago
    const plan = buildCheckPlan(config, String(lastCheck), now)
    expect(plan.shouldRun).toBe(true)
  })
})

describe('buildReportPlan', () => {
  it('should return exit 0 when all pass', () => {
    const report = buildReportPlan([
      { name: 'cortex-probe', status: 'pass', message: 'ok' },
      { name: 'symlinks-in-skills', status: 'pass', message: 'ok' },
    ])
    expect(report.exitCode).toBe(0)
    expect(report.summary.pass).toBe(2)
    expect(report.summary.fail).toBe(0)
  })

  it('should return exit 1 when any fail', () => {
    const report = buildReportPlan([
      { name: 'cortex-probe', status: 'pass', message: 'ok' },
      { name: 'symlinks-in-skills', status: 'fail', message: 'found' },
    ])
    expect(report.exitCode).toBe(1)
    expect(report.summary.fail).toBe(1)
  })

  it('should count warnings but not fail', () => {
    const report = buildReportPlan([
      { name: 'cortex-probe', status: 'warn', message: 'warning' },
    ])
    expect(report.exitCode).toBe(0)
    expect(report.summary.warn).toBe(1)
  })

  it('should count skips', () => {
    const report = buildReportPlan([
      { name: 'cortex-probe', status: 'skip', message: 'skipped' },
    ])
    expect(report.summary.skip).toBe(1)
  })
})
