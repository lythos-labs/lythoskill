import type { CheckPlan, CheckName, EntropyConfig } from './types.ts'

export const DEFAULT_CHECKS: CheckName[] = [
  'cortex-probe',
  'symlinks-in-skills',
  'working-set-leaks',
  'env-var-prefix',
  'missing-weekly',
]

export function buildCheckPlan(
  config: EntropyConfig,
  checkpointContent: string | null,
  nowSeconds: number,
): CheckPlan {
  if (config.force) {
    return {
      shouldRun: true,
      reason: 'Forced by --force',
      checks: DEFAULT_CHECKS,
      checkpointValid: false,
    }
  }

  if (checkpointContent === null) {
    return {
      shouldRun: true,
      reason: 'No checkpoint found',
      checks: DEFAULT_CHECKS,
      checkpointValid: false,
    }
  }

  const trimmed = checkpointContent.trim()

  if (trimmed === '') {
    return {
      shouldRun: true,
      reason: 'Checkpoint empty',
      checks: DEFAULT_CHECKS,
      checkpointValid: false,
    }
  }

  // Validate: must be a positive integer
  if (!/^\d+$/.test(trimmed)) {
    return {
      shouldRun: true,
      reason: 'Checkpoint corrupted (non-numeric)',
      checks: DEFAULT_CHECKS,
      checkpointValid: false,
      lastCheckTime: undefined,
    }
  }

  const lastCheckTime = parseInt(trimmed, 10)
  const elapsedSeconds = nowSeconds - lastCheckTime

  if (elapsedSeconds < config.intervalSeconds) {
    return {
      shouldRun: false,
      reason: `Last check ${elapsedSeconds}s ago (< ${config.intervalSeconds}s interval)`,
      checks: [],
      checkpointValid: true,
      lastCheckTime,
      elapsedSeconds,
    }
  }

  return {
    shouldRun: true,
    reason: `Last check ${elapsedSeconds}s ago (>= ${config.intervalSeconds}s interval)`,
    checks: DEFAULT_CHECKS,
    checkpointValid: true,
    lastCheckTime,
    elapsedSeconds,
  }
}

export function buildReportPlan(results: import('./types.ts').CheckResult[]): import('./types.ts').ReportPlan {
  const summary = {
    pass: results.filter(r => r.status === 'pass').length,
    fail: results.filter(r => r.status === 'fail').length,
    warn: results.filter(r => r.status === 'warn').length,
    skip: results.filter(r => r.status === 'skip').length,
  }

  const exitCode = summary.fail > 0 ? 1 : 0

  return { results, summary, exitCode }
}
