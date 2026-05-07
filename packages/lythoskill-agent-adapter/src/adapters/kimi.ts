import { writeFileSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import type { AgentAdapter, AgentRunResult } from '../types'
import { readCheckpoints } from '../checkpoint'
import { registerAgent } from '../registry'

// ── Pure functions (testable without CLI) ────────────────────────────────────

/** Build the kimi --print shell command. */
export function buildKimiCommand(promptFile: string): string[] {
  return ['sh', '-c', `kimi --print --afk --output-format stream-json < ${promptFile}`]
}

/**
 * Parse kimi stream-json output into plain text.
 * Each line is a JSON event; extracts text from assistant role messages.
 * content can be string or array of content blocks.
 */
export function parseKimiStreamJson(raw: string): string {
  const lines: string[] = []
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue
    try {
      const event = JSON.parse(line)
      if (event.role !== 'assistant') continue
      const content = event.content
      if (typeof content === 'string') {
        lines.push(content)
      } else if (Array.isArray(content)) {
        for (const block of content) {
          if (block.type === 'text' && block.text) lines.push(block.text)
        }
      }
    } catch { /* skip malformed lines */ }
  }
  return lines.join('\n')
}

// ── Spawn wrapper (IO, tested via BDD / arena integration) ──────────────────

async function spawnKimi(opts: {
  brief: string
  cwd: string
  timeoutMs?: number
}): Promise<AgentRunResult> {
  const promptFile = join(tmpdir(), `kimi-prompt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.txt`)
  writeFileSync(promptFile, opts.brief, 'utf-8')

  const start = Date.now()

  const proc = Bun.spawn(buildKimiCommand(promptFile), {
    cwd: opts.cwd,
    stdin: 'ignore',
    stdout: 'pipe',
    stderr: 'pipe',
  })

  const timeout = setTimeout(() => proc.kill(), opts.timeoutMs ?? 60000)
  await proc.exited
  clearTimeout(timeout)

  try { unlinkSync(promptFile) } catch {}

  const durationMs = Date.now() - start
  const rawStdout = await new Response(proc.stdout).text()
  const stderr = await new Response(proc.stderr).text()
  const code = proc.exitCode ?? 1

  let stdout: string
  try {
    stdout = parseKimiStreamJson(rawStdout)
  } catch {
    stdout = rawStdout
  }

  const checkpoints = readCheckpoints(opts.cwd)

  return { stdout: stdout.trim(), stderr, code, durationMs, checkpoints }
}

const kimiAdapter: AgentAdapter = {
  name: 'kimi',

  async spawn(opts): Promise<AgentRunResult> {
    if (!Bun.which('kimi')) {
      throw new Error('kimi not found in PATH. Install: https://github.com/MoonshotAI/kimi-cli')
    }
    return spawnKimi(opts)
  },

  async invokeTool(_opts): Promise<unknown> {
    throw new Error('invokeTool not implemented for kimi adapter')
  },
}

registerAgent('kimi', kimiAdapter)
export { kimiAdapter }
