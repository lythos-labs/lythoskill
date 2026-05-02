import { mkdirSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

export interface CliResult {
  code: number
  stdout: string
  stderr: string
}

export function runCli(cwd: string, command: string[]): CliResult {
  const [cmd, ...args] = command
  const result = spawnSync(cmd, args, {
    cwd,
    encoding: 'utf-8',
    timeout: 30000,
    env: { ...process.env, FORCE_COLOR: '0' },
  })
  return {
    code: result.status ?? 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  }
}

export function assertOutput(
  result: CliResult,
  expectations: {
    exitCode?: number
    stdoutContains?: string[]
    stdoutNotContains?: string[]
    stderrContains?: string[]
  }
): string[] {
  const errors: string[] = []

  if (expectations.exitCode !== undefined && result.code !== expectations.exitCode) {
    errors.push(`exit code: expected ${expectations.exitCode}, got ${result.code}`)
  }

  for (const str of expectations.stdoutContains ?? []) {
    if (!result.stdout.includes(str)) {
      errors.push(`stdout missing: "${str}"`)
    }
  }

  for (const str of expectations.stdoutNotContains ?? []) {
    if (result.stdout.includes(str)) {
      errors.push(`stdout unexpectedly contains: "${str}"`)
    }
  }

  for (const str of expectations.stderrContains ?? []) {
    if (!result.stderr.includes(str)) {
      errors.push(`stderr missing: "${str}"`)
    }
  }

  return errors
}

export function setupWorkdir(baseDir: string, name: string): string {
  const dir = join(baseDir, name.replace(/[^a-z0-9]+/gi, '-').toLowerCase())
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  return dir
}
