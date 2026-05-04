import { mkdirSync, rmSync, existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

// ── Checkpoint schema (Agent BDD substrate) ───────────────────────────────

export interface FsMutation {
  action: 'create' | 'modify' | 'delete' | 'create-symlink'
  path: string
  target?: string
}

export interface CheckpointEntry {
  step: string
  tool: string
  args: string[]
  exit_code?: number
  stdout_summary?: string
  fs_mutations?: FsMutation[]
  final_state?: Record<string, unknown>
  timestamp: string
}

export interface AgentRunResult {
  stdout: string
  stderr: string
  code: number
  durationMs: number
  checkpoints: CheckpointEntry[]
}

export async function runClaudeAgent(opts: {
  cwd: string
  brief: string
  timeoutMs?: number
  env?: Record<string, string>
}): Promise<AgentRunResult> {
  const { cwd, brief, timeoutMs = 60000, env = {} } = opts

  if (!Bun.which('claude')) {
    throw new Error('claude not found in PATH')
  }

  const start = Date.now()

  const proc = Bun.spawn(['claude', '-p', '--dangerously-skip-permissions'], {
    cwd,
    stdin: new TextEncoder().encode(brief),
    env: { ...process.env, FORCE_COLOR: '0', ...env },
  })

  const timeout = setTimeout(() => proc.kill(), timeoutMs)

  await proc.exited
  clearTimeout(timeout)

  const durationMs = Date.now() - start
  const stdout = await new Response(proc.stdout).text()
  const stderr = await new Response(proc.stderr).text()
  const code = proc.exitCode ?? 1

  const checkpoints = readCheckpoints(cwd)

  return { stdout, stderr, code, durationMs, checkpoints }
}

export function readCheckpoints(cwd: string): CheckpointEntry[] {
  const checkpointDir = join(cwd, '_checkpoints')
  if (!existsSync(checkpointDir)) return []

  const files = readdirSync(checkpointDir)
    .filter(f => f.endsWith('.jsonl'))
    .sort()

  const entries: CheckpointEntry[] = []
  for (const file of files) {
    const content = readFileSync(join(checkpointDir, file), 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed) continue
      try {
        entries.push(JSON.parse(trimmed) as CheckpointEntry)
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
