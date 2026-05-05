import { writeFileSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import type { AgentAdapter, AgentRunResult, ToolDefinition } from './types'
import { readCheckpoints } from '../bdd-runner'

// ── Kimi CLI adapter ────────────────────────────────────────────────────────
//
// Kimi --print mode is headless by design (no deferred tool deadlock).
// All tools eagerly loaded: SearchWeb, FetchURL, Shell, ReadFile, WriteFile, Agent.
// Apache 2.0 open source. See kimi_vs_claude_cli_report.md for full analysis.

async function spawnKimi(opts: {
  brief: string
  cwd: string
  timeoutMs?: number
}): Promise<AgentRunResult> {
  const promptFile = join(tmpdir(), `kimi-prompt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.txt`)
  writeFileSync(promptFile, opts.brief, 'utf-8')

  const start = Date.now()

  // kimi --print --afk: auto-approve all tools, auto-dismiss questions
  // Shell redirect (< file) avoids Bun stdin pipe issues; prompt length unlimited
  const proc = Bun.spawn(
    ['sh', '-c', `kimi --print --afk --output-format stream-json < ${promptFile}`],
    {
      cwd: opts.cwd,
      stdin: 'ignore',
      stdout: 'pipe',
      stderr: 'pipe',
      // env inherits from parent — preserves API keys, config paths
    },
  )

  const timeout = setTimeout(() => proc.kill(), opts.timeoutMs ?? 60000)
  await proc.exited
  clearTimeout(timeout)

  try { unlinkSync(promptFile) } catch {}

  const durationMs = Date.now() - start
  const rawStdout = await new Response(proc.stdout).text()
  const stderr = await new Response(proc.stderr).text()
  const code = proc.exitCode ?? 1

  // Kimi --output-format stream-json: each line is a JSON event.
  // Extract text from assistant messages. content can be string or array of blocks.
  let stdout = ''
  try {
    for (const line of rawStdout.split('\n')) {
      if (!line.trim()) continue
      try {
        const event = JSON.parse(line)
        if (event.role !== 'assistant') continue
        const content = event.content
        if (typeof content === 'string') {
          stdout += content + '\n'
        } else if (Array.isArray(content)) {
          for (const block of content) {
            if (block.type === 'text' && block.text) stdout += block.text + '\n'
          }
        }
      } catch { /* skip malformed lines */ }
    }
  } catch {
    stdout = rawStdout // fallback to raw output
  }

  const checkpoints = readCheckpoints(opts.cwd)

  return { stdout: stdout.trim(), stderr, code, durationMs, checkpoints }
}

export const kimiAdapter: AgentAdapter = {
  name: 'kimi',

  async spawn(opts): Promise<AgentRunResult> {
    if (!Bun.which('kimi')) {
      throw new Error('kimi not found in PATH. Install: https://github.com/MoonshotAI/kimi-cli')
    }
    return spawnKimi(opts)
  },

  async invokeTool(_opts): Promise<unknown> {
    // Kimi doesn't use function-calling invoke pattern; fall through to spawn
    throw new Error('invokeTool not implemented for kimi adapter')
  },
}
