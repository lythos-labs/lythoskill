import { writeFileSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import type { AgentAdapter, AgentRunResult, CheckpointEntry } from '../types'
import { readCheckpoints } from '../checkpoint'
import { registerAgent } from '../registry'

// ── Pure functions (testable without CLI) ────────────────────────────────────

/** Build kimi --print command args (no shell wrapper — safe from injection). */
export function buildKimiCommand(_modelTier?: 'fast' | 'balanced' | 'deep'): string[] {
  // Kimi CLI has no --model flag; model selection is via /model slash command,
  // config.toml, or KIMI_MODEL_NAME env var. modelTier is accepted but unused
  // — Kimi effectively provides one tier via coding plan.
  return ['kimi', '--print', '--afk', '--output-format', 'stream-json']
}

/**
 * Parse kimi stream-json output into plain text + checkpoint trace.
 * Each line is a JSON event; extracts text from assistant role messages
 * and tool_calls/tool messages into CheckpointEntry for white-box replay.
 */
export function parseKimiStreamJson(raw: string): { text: string; checkpoints: CheckpointEntry[] } {
  const textLines: string[] = []
  const checkpoints: CheckpointEntry[] = []
  const pendingTools = new Map<string, { name: string; args: string }>()

  for (const line of raw.split('\n')) {
    if (!line.trim()) continue
    try {
      const event = JSON.parse(line)
      if (event.role === 'assistant') {
        const content = event.content
        if (typeof content === 'string') {
          textLines.push(content)
        } else if (Array.isArray(content)) {
          for (const block of content) {
            if (block.type === 'text' && block.text) textLines.push(block.text)
          }
        }

        if (Array.isArray(event.tool_calls)) {
          for (const tc of event.tool_calls) {
            if (tc.type === 'function' && tc.function) {
              checkpoints.push({
                step: 'tool_call',
                tool: tc.function.name,
                args: [tc.function.arguments],
                timestamp: new Date().toISOString(),
              })
              pendingTools.set(tc.id, { name: tc.function.name, args: tc.function.arguments })
            }
          }
        }
      } else if (event.role === 'tool' && event.tool_call_id) {
        const pending = pendingTools.get(event.tool_call_id)
        if (pending) {
          checkpoints.push({
            step: 'tool_result',
            tool: pending.name,
            args: [pending.args],
            stdout_summary: String(event.content ?? '').slice(0, 500),
            timestamp: new Date().toISOString(),
          })
          pendingTools.delete(event.tool_call_id)
        }
      }
    } catch { /* skip malformed lines */ }
  }

  return { text: textLines.join('\n'), checkpoints }
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

  const proc = Bun.spawn(buildKimiCommand(), {
    cwd: opts.cwd,
    stdin: Bun.file(promptFile),
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

  let text: string
  let streamCheckpoints: CheckpointEntry[]
  try {
    const parsed = parseKimiStreamJson(rawStdout)
    text = parsed.text
    streamCheckpoints = parsed.checkpoints
  } catch {
    text = rawStdout
    streamCheckpoints = []
  }

  // Preserve raw JSONL for post-hoc white-box analysis
  try {
    writeFileSync(join(opts.cwd, 'agent-stdout-raw.jsonl'), rawStdout, 'utf-8')
  } catch { /* ignore write failures */ }

  const fileCheckpoints = readCheckpoints(opts.cwd)
  const checkpoints = [...streamCheckpoints, ...fileCheckpoints]

  return { stdout: text.trim(), stderr, code, durationMs, checkpoints }
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
