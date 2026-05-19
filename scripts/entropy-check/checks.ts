import type { EntropyConfig, EntropyIO, CheckResult, CheckName } from './types.ts'

export function checkCortexProbe(config: EntropyConfig, io: EntropyIO): CheckResult {
  const cortexCli = `${config.projectDir}/packages/lythoskill-project-cortex/src/cli.ts`
  if (!io.exists(cortexCli)) {
    return { name: 'cortex-probe', status: 'skip', message: 'Cortex CLI not found' }
  }

  const result = io.exec('bun', [cortexCli, 'probe'])
  if (result.exitCode !== 0) {
    return { name: 'cortex-probe', status: 'warn', message: 'Cortex probe failed to run' }
  }

  const lines = result.stdout.split('\n')
  const warnings: string[] = []
  for (const line of lines) {
    if (line.includes('⚠️') || line.includes('📭')) {
      warnings.push(line.trim())
    }
  }

  if (warnings.length === 0) {
    return { name: 'cortex-probe', status: 'pass', message: 'Cortex clean' }
  }

  return {
    name: 'cortex-probe',
    status: 'warn',
    message: `${warnings.length} item(s) from cortex probe`,
    details: warnings.slice(0, 10),
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
    // Use exec to check if it's a symlink (L stat)
    const stat = io.exec('stat', ['-c', '%F', fullPath])
    if (stat.stdout.includes('symbolic link')) {
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

  // grep exits 1 when no matches — that's "pass" for this check
  const lines = result.exitCode === 0
    ? result.stdout.split('\n').filter(l => l.trim())
    : []

  // Filter out mirror compat code
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

  if (dateResult.exitCode !== 0 || yearResult.exitCode !== 0) {
    return { name: 'missing-weekly', status: 'skip', message: 'Could not determine current week' }
  }

  const week = dateResult.stdout.trim()
  const year = yearResult.stdout.trim()
  const weeklyFile = `${config.projectDir}/weekly/${year}-W${week}.md`

  if (io.exists(weeklyFile)) {
    return { name: 'missing-weekly', status: 'pass', message: `Weekly exists: ${year}-W${week}.md` }
  }

  return {
    name: 'missing-weekly',
    status: 'warn',
    message: `No weekly for current week (W${week}): ${weeklyFile}`,
  }
}

export const ALL_CHECKS: Record<CheckName, (config: EntropyConfig, io: EntropyIO) => CheckResult> = {
  'cortex-probe': checkCortexProbe,
  'symlinks-in-skills': checkSymlinksInSkills,
  'working-set-leaks': checkWorkingSetLeaks,
  'env-var-prefix': checkEnvVarPrefix,
  'missing-weekly': checkMissingWeekly,
}
