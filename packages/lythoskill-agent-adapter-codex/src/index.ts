/**
 * Codex adapter — spawns `codex exec` headless CLI.
 *
 * Follows the same CLI-wrapper pattern as the kimi adapter:
 * - Prompt via temp file + Bun.file(stdin) — no shell, no injection
 * - Array args — no string interpolation
 * - JSONL stdout parsing
 *
 * Reference: codex-research-2026-05-10
 */

import { writeFileSync, unlinkSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import type { AgentAdapter, AgentRunResult } from '@lythos/agent-adapter'
import { registerAgent } from '@lythos/agent-adapter'

// ── Pure functions (testable without CLI) ────────────────────

/** Build codex exec args — no shell wrapper, injection-safe. */
export function buildCodexCommand(): string[] {
  return [
    'codex', 'exec',
    '--ask-for-approval', 'never',
    '--sandbox', 'workspace-write',
    '--json',
    '--ephemeral',
    '--skip-git-repo-check',
    '-',  // read prompt from stdin
  ]
}

/**
 * Parse codex JSONL output into plain text.
 * Extracts text from item.completed events and final thread.turn.completed message.
 */
export function parseCodexJsonl(raw: string): string {
  const lines: string[] = []
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue
    try {
      const event = JSON.parse(line)
      // item.completed: agent finished a task item
      if (event.type === 'item.completed' && event.item?.type === 'agent_message') {
        for (const block of event.item.content || []) {
          if (block.type === 'output_text' && block.text) {
            lines.push(block.text)
          }
        }
      }
      // thread.turn.completed: final turn result
      if (event.type === 'thread.turn.completed') {
        const msg = event.turn?.final_message
        if (typeof msg === 'string') lines.push(msg)
      }
      // Fallback: any event with a text message
      if (event.message && typeof event.message === 'string') {
        lines.push(event.message)
      }
    } catch { /* skip malformed lines */ }
  }
  return lines.join('\n')
}

// ── Spawn wrapper (IO, tested via arena integration) ─────────

async function spawnCodex(opts: {
  brief: string
  cwd: string
  timeoutMs?: number
}): Promise<AgentRunResult> {
  const promptFile = join(tmpdir(), `codex-prompt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.txt`)
  writeFileSync(promptFile, opts.brief, 'utf-8')

  const start = Date.now()

  const proc = Bun.spawn(buildCodexCommand(), {
    cwd: opts.cwd,
    stdin: Bun.file(promptFile),
    stdout: 'pipe',
    stderr: 'pipe',
  })

  const timeout = setTimeout(() => proc.kill(), opts.timeoutMs ?? 120_000)
  await proc.exited
  clearTimeout(timeout)

  try { unlinkSync(promptFile) } catch {}

  const durationMs = Date.now() - start
  const rawStdout = await new Response(proc.stdout).text()
  const stderr = await new Response(proc.stderr).text()
  const code = proc.exitCode ?? 1

  let stdout: string
  try {
    stdout = parseCodexJsonl(rawStdout)
  } catch {
    stdout = rawStdout
  }

  return { stdout: stdout.trim(), stderr, code, durationMs, checkpoints: [] }
}

const codexAdapter: AgentAdapter = {
  name: 'codex',

  async spawn(opts): Promise<AgentRunResult> {
    if (!Bun.which('codex')) {
      throw new Error('codex not found in PATH. Install: npm i -g @openai/codex')
    }
    // Verify auth exists (OAuth or API key)
    const home = process.env.HOME || process.env.USERPROFILE || '~'
    const authFile = join(home, '.codex', 'auth.json')
    if (!existsSync(authFile) && !process.env.OPENAI_API_KEY) {
      console.warn('⚠️  No ~/.codex/auth.json or OPENAI_API_KEY found. Run "codex login" first.')
    }
    return spawnCodex(opts)
  },

  async invokeTool(_opts): Promise<unknown> {
    throw new Error('invokeTool not implemented for codex adapter')
  },
}

registerAgent('codex', codexAdapter)
export { codexAdapter }
