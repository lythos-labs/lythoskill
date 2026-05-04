import { mkdirSync, rmSync, existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { useAgent } from './agents'

// ── Checkpoint schema (Agent BDD substrate) ───────────────────────────────

export type { FsMutation, CheckpointEntry, AgentRunResult } from './agents/types'

export async function runClaudeAgent(opts: {
  cwd: string
  brief: string
  timeoutMs?: number
  env?: Record<string, string>
}): Promise<import('./agents/types').AgentRunResult> {
  return useAgent('claude').spawn({
    cwd: opts.cwd,
    brief: opts.brief,
    timeoutMs: opts.timeoutMs ?? 60000,
    env: opts.env,
  })
}

export function readCheckpoints(cwd: string): import('./agents/types').CheckpointEntry[] {
  const checkpointDir = join(cwd, '_checkpoints')
  if (!existsSync(checkpointDir)) return []

  const files = readdirSync(checkpointDir)
    .filter(f => f.endsWith('.jsonl'))
    .sort()

  const entries: import('./agents/types').CheckpointEntry[] = []
  for (const file of files) {
    const content = readFileSync(join(checkpointDir, file), 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed) continue
      try {
        entries.push(JSON.parse(trimmed))
      } catch {
        // skip malformed lines
      }
    }
  }
  return entries
}

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
