import { writeFileSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import type { AgentAdapter, AgentRunResult, ToolDefinition } from '../types'
import { readCheckpoints } from '../checkpoint'
import { registerAgent } from '../registry'

// ── Command DSL (pure: what to execute, no side effects) ────────────────────

export interface SpawnCommand {
  cmd: string
  args: string[]
  cwd: string
  stdin: string                     // prompt text (written to temp file for shell redirection)
  promptFile: string                // temp file path for shell stdin redirection
  env: Record<string, string>
  timeoutMs: number
}

export function buildCleanEnv(extra?: Record<string, string>): Record<string, string> {
  const env: Record<string, string> = {}
  for (const [key, value] of Object.entries(process.env)) {
    if (value === undefined) continue
    if (key === 'CLAUDECODE') continue
    if (key.startsWith('CLAUDE_CODE_')) continue
    env[key] = value
  }
  return { ...env, FORCE_COLOR: '0', ...(extra ?? {}) }
}

export const DEFAULT_ALLOWED_TOOLS = 'Read,Write,Edit,Grep,Glob,WebSearch,WebFetch'
export const DEFAULT_DISALLOWED_TOOLS = 'Bash(rm *),Bash(sudo *),Bash(curl *),Bash(git push *)'

/**
 * Build the claude -p command specification. Pure — no spawn, no IO.
 *
 * Uses shell stdin redirection (sh -c "claude -p ... < promptfile") to avoid:
 * - Bun ARM64 stdin pipe flush bug (§2.1.1)
 * - Command-line length limits on long arena task prompts
 * Prompt is written to a temp file, then fed via shell redirect.
 */
export function buildClaudeCommand(opts: {
  brief: string
  cwd: string
  timeoutMs?: number
  env?: Record<string, string>
  allowedTools?: string
  disallowedTools?: string
}): SpawnCommand {
  const promptFile = join(tmpdir(), `claude-prompt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.txt`)
  const allowed = opts.allowedTools ?? DEFAULT_ALLOWED_TOOLS
  const disallowed = opts.disallowedTools ?? DEFAULT_DISALLOWED_TOOLS
  const shellCmd = `claude -p --output-format json --permission-mode bypassPermissions --allowedTools '${allowed}' --disallowedTools '${disallowed}' < ${promptFile}`

  return {
    cmd: 'sh',
    args: ['-c', shellCmd],
    cwd: opts.cwd,
    stdin: opts.brief,
    promptFile,
    env: buildCleanEnv(opts.env),
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

// ── JSON extraction (pure: parse LLM output without IO) ─────────────────

export function extractJson(raw: string): unknown {
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  const jsonStr = fenceMatch ? fenceMatch[1].trim() : raw.trim()
  return JSON.parse(jsonStr)
}

// ── Executor: consume SpawnCommand + collect result ────────────────────────

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 2000

async function executeSpawnCommand(cmd: SpawnCommand): Promise<AgentRunResult> {
  writeFileSync(cmd.promptFile, cmd.stdin || '', 'utf-8')

  const start = Date.now()

  const proc = Bun.spawn([cmd.cmd, ...cmd.args], {
    cwd: cmd.cwd,
    stdin: 'ignore',
    stdout: 'pipe',
    stderr: 'pipe',
  })

  const timeout = setTimeout(() => proc.kill(), cmd.timeoutMs)
  await proc.exited
  clearTimeout(timeout)

  const durationMs = Date.now() - start
  const rawStdout = await new Response(proc.stdout).text()
  const stderr = await new Response(proc.stderr).text()
  const code = proc.exitCode ?? 1

  try { unlinkSync(cmd.promptFile) } catch {}

  let stdout = rawStdout
  try {
    const parsed = JSON.parse(rawStdout)
    stdout = typeof parsed.result === 'string' ? parsed.result : rawStdout
  } catch {}

  const checkpoints = readCheckpoints(cmd.cwd)

  return { stdout, stderr, code, durationMs, checkpoints }
}

// ── Adapter ─────────────────────────────────────────────────────────────────
//
// ⚠️ DEPRECATED: Claude -p CLI path is broken due to deferred tool deadlock
// (report.md §2.1.3). Use claude-sdk adapter (TASK-20260506001644316) instead.
// This adapter is kept for backward compat but not recommended for production.

/** @deprecated Use claude-sdk adapter instead. CLI -p path is broken (deferred tool deadlock). */
const claudeCliAdapter: AgentAdapter = {
  name: 'claude',

  async spawn(opts): Promise<AgentRunResult> {
    if (!Bun.which('claude')) {
      throw new Error('claude not found in PATH')
    }

    const cmd = buildClaudeCommand(opts)

    let lastError: Error | undefined
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await executeSpawnCommand(cmd)
        if (result.stdout.trim() || result.code === 0) return result
        if (attempt < MAX_RETRIES) {
          await new Promise(r => setTimeout(r, RETRY_DELAY_MS * attempt))
        }
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e))
        if (attempt < MAX_RETRIES) {
          await new Promise(r => setTimeout(r, RETRY_DELAY_MS * attempt))
        }
      }
    }

    return {
      stdout: '',
      stderr: lastError?.message ?? 'All retries exhausted',
      code: 1,
      durationMs: 0,
      checkpoints: [],
    }
  },

  async invokeTool(opts): Promise<unknown> {
    const { tool, prompt, cwd, timeoutMs = 60000 } = opts
    const toolPrompt = buildToolPrompt(tool, prompt)
    const result = await this.spawn({ cwd, brief: toolPrompt, timeoutMs })
    return extractJson(result.stdout)
  },
}

// Register under both names: 'claude' for backward compat, 'claude-cli' to be explicit
registerAgent('claude', claudeCliAdapter)
registerAgent('claude-cli', claudeCliAdapter)
export { claudeCliAdapter }
