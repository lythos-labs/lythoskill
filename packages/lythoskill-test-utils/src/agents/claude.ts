import type { AgentAdapter, AgentRunResult, ToolDefinition } from './types'
import { readCheckpoints } from '../bdd-runner'

// ── Command DSL (pure: what to execute, no side effects) ────────────────────

export interface SpawnCommand {
  cmd: string
  args: string[]
  cwd: string
  stdin: string                     // text to pipe via stdin
  env: Record<string, string>
  timeoutMs: number
}

/** Build the claude -p command specification. Pure — no spawn, no IO. */
export function buildClaudeCommand(opts: {
  brief: string
  cwd: string
  timeoutMs?: number
  env?: Record<string, string>
}): SpawnCommand {
  return {
    cmd: 'claude',
    args: ['-p', '--dangerously-skip-permissions'],
    cwd: opts.cwd,
    stdin: opts.brief,
    env: { FORCE_COLOR: '0', ...(opts.env ?? {}) },
    timeoutMs: opts.timeoutMs ?? 60000,
  }
}

// ── Tool prompt builder (pure) ──────────────────────────────────────────────

export function buildToolPrompt(tool: ToolDefinition, prompt: string): string {
  const schemaJson = JSON.stringify(tool.input_schema, null, 2)
  const fence = '```'
  return [
    prompt,
    '',
    '## Tool: ' + tool.name,
    tool.description,
    '',
    '## Output Schema',
    'You MUST respond with a single JSON object matching this schema exactly.',
    'Wrap your JSON in a ' + fence + 'json fence.',
    '',
    'Schema:',
    fence + 'json',
    schemaJson,
    fence,
    '',
    'Return ONLY the JSON object (in a ' + fence + 'json fence), no other text.',
  ].join('\n')
}

// ── Executor: consume SpawnCommand + collect result ────────────────────────

async function executeSpawnCommand(cmd: SpawnCommand): Promise<AgentRunResult> {
  const start = Date.now()

  const proc = Bun.spawn([cmd.cmd, ...cmd.args], {
    cwd: cmd.cwd,
    stdin: new TextEncoder().encode(cmd.stdin),
    env: { ...process.env, ...cmd.env },
  })

  const timeout = setTimeout(() => proc.kill(), cmd.timeoutMs)

  await proc.exited
  clearTimeout(timeout)

  const durationMs = Date.now() - start
  const stdout = await new Response(proc.stdout).text()
  const stderr = await new Response(proc.stderr).text()
  const code = proc.exitCode ?? 1

  const checkpoints = readCheckpoints(cmd.cwd)

  return { stdout, stderr, code, durationMs, checkpoints }
}

// ── Adapter ─────────────────────────────────────────────────────────────────

export const claudeAdapter: AgentAdapter = {
  name: 'claude',

  async spawn(opts): Promise<AgentRunResult> {
    if (!Bun.which('claude')) {
      throw new Error('claude not found in PATH')
    }

    const cmd = buildClaudeCommand(opts)
    return executeSpawnCommand(cmd)
  },

  async invokeTool(opts): Promise<unknown> {
    const { tool, prompt, cwd, timeoutMs = 60000 } = opts
    const toolPrompt = buildToolPrompt(tool, prompt)

    const result = await this.spawn({ cwd, brief: toolPrompt, timeoutMs })

    // Extract JSON from markdown fence or raw output
    const fenceMatch = result.stdout.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    const jsonStr = fenceMatch ? fenceMatch[1].trim() : result.stdout.trim()

    return JSON.parse(jsonStr)
  },
}
