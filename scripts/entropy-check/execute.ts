import type { EntropyConfig, EntropyIO, CheckPlan, CheckResult, ReportPlan, CheckName } from './types.ts'
import { buildCheckPlan, buildReportPlan } from './plan.ts'
import { ALL_CHECKS } from './checks.ts'

export function executeEntropyCheck(config: EntropyConfig, io: EntropyIO): ReportPlan {
  const checkpointContent = io.readFile(config.checkpointFile)
  const now = io.now()

  const plan = buildCheckPlan(config, checkpointContent, now)

  if (config.dryRun) {
    printDryRun(plan, io)
    return buildReportPlan([])
  }

  if (!plan.shouldRun) {
    io.log(`🔒 Entropy check skipped. ${plan.reason}`)
    return buildReportPlan([])
  }

  io.log('')
  io.log('═══════════════════════════════════════════════════════════════')
  io.log('  🔍  Entropy Check — Governance Debt Scan')
  io.log('═══════════════════════════════════════════════════════════════')
  io.log('')
  io.log(`  Interval: ${formatDuration(config.intervalSeconds)}`)
  if (plan.checkpointValid && plan.lastCheckTime) {
    io.log(`  Last check: ${formatTimestamp(plan.lastCheckTime)} (${formatDuration(plan.elapsedSeconds || 0)} ago)`)
  } else {
    io.log(`  Last check: none`)
  }
  io.log(`  Running ${plan.checks.length} check(s)...`)
  io.log('')

  const results: CheckResult[] = []
  for (let i = 0; i < plan.checks.length; i++) {
    const checkName = plan.checks[i]
    const checkFn = ALL_CHECKS[checkName]
    const result = checkFn(config, io)
    results.push(result)
    printCheckResult(i + 1, plan.checks.length, result, io)
  }

  const report = buildReportPlan(results)

  io.log('')
  io.log('═══════════════════════════════════════════════════════════════')
  if (report.summary.fail > 0) {
    io.log(`  ❌  Entropy check FAILED — ${report.summary.fail} issue(s), ${report.summary.warn} warning(s)`)
  } else if (report.summary.warn > 0) {
    io.log(`  ⚠️  Entropy check PASSED with ${report.summary.warn} warning(s)`)
  } else {
    io.log(`  ✅  Entropy check PASSED — governance debt low`)
  }
  io.log('═══════════════════════════════════════════════════════════════')
  io.log('')

  // Remediation SOP — reproduce.sh style IoC handoff
  const failedChecks = results.filter(r => r.status === 'fail' || r.status === 'warn')
  if (failedChecks.length > 0) {
    printRemediationSummary(failedChecks, io)
  }

  // Write checkpoint even on failure (prevents spam)
  io.writeFile(config.checkpointFile, String(now))

  return report
}

function printDryRun(plan: CheckPlan, io: EntropyIO): void {
  io.log('')
  io.log('═══════════════════════════════════════════════════════════════')
  io.log('  🔍  Entropy Check — DRY RUN')
  io.log('═══════════════════════════════════════════════════════════════')
  io.log('')
  io.log(`  Should run: ${plan.shouldRun ? 'yes' : 'no'}`)
  io.log(`  Reason: ${plan.reason || 'n/a'}`)
  io.log(`  Checks: ${plan.checks.length > 0 ? plan.checks.join(', ') : 'none'}`)
  io.log(`  Checkpoint valid: ${plan.checkpointValid ? 'yes' : 'no'}`)
  if (plan.lastCheckTime) {
    io.log(`  Last check: ${formatTimestamp(plan.lastCheckTime)}`)
  }
  if (plan.elapsedSeconds !== undefined) {
    io.log(`  Elapsed: ${formatDuration(plan.elapsedSeconds)}`)
  }
  io.log('')
}

function printCheckResult(index: number, total: number, result: CheckResult, io: EntropyIO): void {
  const icon = result.status === 'pass' ? '✅'
    : result.status === 'fail' ? '❌'
    : result.status === 'warn' ? '⚠️'
    : '⏭️'
  io.log(`[${index}/${total}] ${icon} ${result.name}: ${result.message}`)
  if (result.details && result.details.length > 0) {
    for (const detail of result.details) {
      io.log(`      → ${detail}`)
    }
  }
}

function printRemediationSummary(failedChecks: CheckResult[], io: EntropyIO): void {
  io.log('')
  io.log('┌─────────────────────────────────────────────────────────────┐')
  io.log('│  🔧  Remediation SOP — reproduce.sh style IoC handoff       │')
  io.log('│                                                             │')
  io.log('│  AGENT TRIGGER: read the <spawn subagent> blocks below,     │')
  io.log('│  execute the SOP steps, write decision-log.jsonl to         │')
  io.log('│  playground/entropy-check/ (gitignored, safe to write).     │')
  io.log('│  Human: manual execution also valid.                        │')
  io.log('└─────────────────────────────────────────────────────────────┘')
  io.log('')

  for (const check of failedChecks) {
    if (!check.remediation || check.remediation.length === 0) continue

    io.log(`▸ ${check.name}`)
    io.log(`  <spawn subagent to execute ${check.name} remediation SOP>`)
    io.log('')

    for (let i = 0; i < check.remediation.length; i++) {
      const step = check.remediation[i]
      io.log(`  Step ${i + 1}: ${step.action}`)
      if (step.command) {
        io.log(`    $ ${step.command}`)
      }
      if (step.note) {
        io.log(`    # ${step.note}`)
      }
      io.log('')
    }
  }

  io.log('┌─────────────────────────────────────────────────────────────┐')
  io.log('│  After remediation, re-run:                                 │')
  io.log('│    bun scripts/entropy-check/index.ts                       │')
  io.log('└─────────────────────────────────────────────────────────────┘')
  io.log('')
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
  return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts * 1000)
  return d.toISOString().replace('T', ' ').slice(0, 19)
}
