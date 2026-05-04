import type { AgentAdapter, AgentRunResult } from './types'
import { readCheckpoints } from '../bdd-runner'

export const claudeAdapter: AgentAdapter = {
  name: 'claude',

  async spawn(opts): Promise<AgentRunResult> {
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
  },
}
