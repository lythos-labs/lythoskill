import type { EntropyConfig, EntropyIO, CheckResult, CheckName } from './types.ts'

export function checkCortexProbe(config: EntropyConfig, io: EntropyIO): CheckResult {
  const cortexCli = `${config.projectDir}/packages/lythoskill-project-cortex/src/cli.ts`
  if (!io.exists(cortexCli)) {
    return { name: 'cortex-probe', status: 'skip', message: 'Cortex CLI not found' }
  }

  // Stats for quick overview
  const statsResult = io.exec('bun', [cortexCli, 'stats'])
  const statsOk = statsResult.exitCode === 0

  // --suspicious mode: only actionable patterns
  const probeResult = io.exec('bun', [cortexCli, 'probe', '--suspicious'])
  if (probeResult.exitCode !== 0) {
    return { name: 'cortex-probe', status: 'warn', message: 'Cortex probe failed to run' }
  }

  const lines = probeResult.stdout.split('\n').filter(l => l.trim())
  const hasIssues = lines.some(l => l.includes('⚠️') || l.includes('📭'))

  if (!hasIssues) {
    return { name: 'cortex-probe', status: 'pass', message: 'Cortex clean — no suspicious patterns' }
  }

  const details: string[] = []
  if (statsOk) {
    details.push('Summary:')
    for (const line of statsResult.stdout.split('\n')) {
      const t = line.trim()
      if (t) details.push(`  ${t}`)
    }
    details.push('')
  }
  // Pass through the suspicious output directly
  for (const line of lines) {
    details.push(line)
  }

  return {
    name: 'cortex-probe',
    status: 'warn',
    message: 'Suspicious patterns detected — see details',
    details,
  }
}

export function checkSymlinksInSkills(config: EntropyConfig, io: EntropyIO): CheckResult {
  const skillsDir = `${config.projectDir}/skills`
  if (!io.exists(skillsDir)) {
    return { name: 'symlinks-in-skills', status: 'skip', message: 'skills/ directory not found' }
  }

  const entries = io.listDir(skillsDir)
  const symlinks: string[] = []

  for (const entry of entries) {
    const fullPath = `${skillsDir}/${entry}`
    if (io.isSymlink(fullPath)) {
      symlinks.push(entry)
    }
  }

  if (symlinks.length === 0) {
    return { name: 'symlinks-in-skills', status: 'pass', message: 'No symlinks in skills/' }
  }

  return {
    name: 'symlinks-in-skills',
    status: 'fail',
    message: `${symlinks.length} symlink(s) found in skills/`,
    details: symlinks,
  }
}

export function checkWorkingSetLeaks(config: EntropyConfig, io: EntropyIO): CheckResult {
  const workingSets = [
    `${config.projectDir}/.agents/skills`,
    `${config.projectDir}/.kimi/skills`,
    `${config.projectDir}/.cursor/skills`,
    `${config.projectDir}/.codex/skills`,
  ]

  const leaks: string[] = []
  for (const ws of workingSets) {
    const result = io.exec('git', ['ls-files', ws])
    if (result.stdout.trim()) {
      leaks.push(...result.stdout.trim().split('\n').filter(Boolean))
    }
  }

  if (leaks.length === 0) {
    return { name: 'working-set-leaks', status: 'pass', message: 'No working set leaks in git' }
  }

  return {
    name: 'working-set-leaks',
    status: 'fail',
    message: `${leaks.length} working set file(s) tracked by git`,
    details: leaks.slice(0, 5),
  }
}

export function checkEnvVarPrefix(config: EntropyConfig, io: EntropyIO): CheckResult {
  const packagesDir = `${config.projectDir}/packages`
  if (!io.exists(packagesDir)) {
    return { name: 'env-var-prefix', status: 'skip', message: 'packages/ directory not found' }
  }

  const result = io.exec('grep', [
    '-rn', 'LYTHOSKILL_',
    '--include=*.ts',
    packagesDir,
  ])

  const lines = result.exitCode === 0
    ? result.stdout.split('\n').filter(l => l.trim())
    : []

  const realLeaks = lines.filter(l => !l.includes('mirror.ts') && !l.includes('mirror.test.ts'))

  if (realLeaks.length === 0) {
    return { name: 'env-var-prefix', status: 'pass', message: 'No legacy prefix leaks' }
  }

  return {
    name: 'env-var-prefix',
    status: 'fail',
    message: `${realLeaks.length} legacy LYTHOSKILL_ prefix found`,
    details: realLeaks.slice(0, 5),
  }
}

export function checkMissingWeekly(config: EntropyConfig, io: EntropyIO): CheckResult {
  const dateResult = io.exec('date', ['+%V'])
  const yearResult = io.exec('date', ['+%Y'])
  const dowResult = io.exec('date', ['+%u']) // 1=Mon, 7=Sun

  if (dateResult.exitCode !== 0 || yearResult.exitCode !== 0) {
    return { name: 'missing-weekly', status: 'skip', message: 'Could not determine current week' }
  }

  const week = dateResult.stdout.trim()
  const year = yearResult.stdout.trim()
  const dow = dowResult.exitCode === 0 ? parseInt(dowResult.stdout.trim(), 10) : 0
  const weeklyFile = `${config.projectDir}/weekly/${year}-W${week}.md`

  if (io.exists(weeklyFile)) {
    return { name: 'missing-weekly', status: 'pass', message: `Weekly exists: ${year}-W${week}.md` }
  }

  const percent = dow > 0 ? Math.round((dow / 7) * 100) : 0
  const prevWeek = String(Number(week) - 1).padStart(2, '0')
  const prevWeekly = `${config.projectDir}/weekly/${year}-W${prevWeek}.md`
  const prevExists = io.exists(prevWeekly)

  return {
    name: 'missing-weekly',
    status: 'warn',
    message: `${year}-W${week}.md not yet written (day ${dow}/7, ${percent}% complete)`,
    details: [
      `Reference: ${year}-W${prevWeek}.md${prevExists ? '' : ' (also missing)'}`,
      'Tip: weekly convention is to write by end of week',
      'Source material: daily notes + git log + cortex INDEX',
      'Skill: lythoskill-project-scribe-weekly',
    ],
  }
}

export const ALL_CHECKS: Record<CheckName, (config: EntropyConfig, io: EntropyIO) => CheckResult> = {
  'cortex-probe': checkCortexProbe,
  'symlinks-in-skills': checkSymlinksInSkills,
  'working-set-leaks': checkWorkingSetLeaks,
  'env-var-prefix': checkEnvVarPrefix,
  'missing-weekly': checkMissingWeekly,
}
