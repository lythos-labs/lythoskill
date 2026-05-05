import { writeFileSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import type { AgentAdapter, AgentRunResult, ToolDefinition } from './types'
import { readCheckpoints } from '../bdd-runner'

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

/** Default allowed tools for non-interactive agent execution. */
export const DEFAULT_ALLOWED_TOOLS = 'Read,Write,Edit,Grep,Glob,WebSearch,WebFetch'

/** Default disallowed: dangerous shell operations. */
export const DEFAULT_DISALLOWED_TOOLS = 'Bash(rm *),Bash(sudo *),Bash(curl *),Bash(git push *)'

/**
 * Build a clean environment — strip all CLAUDE_CODE_* vars to prevent
 * nested-session detection (report.md §2.2). Also strips CLAUDECODE.
 */
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

  const cliFlags = [
    '-p',
    '--output-format', 'json',
    '--permission-mode', 'bypassPermissions',
    '--allowedTools', opts.allowedTools ?? DEFAULT_ALLOWED_TOOLS,
    '--disallowedTools', opts.disallowedTools ?? DEFAULT_DISALLOWED_TOOLS,
  ].join(' ')

  // Shell redirect: claude reads prompt from file via stdin, bypasses Bun's stdin handling
  const shellCmd = `claude ${cliFlags} < ${promptFile}`

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
  // Write prompt to temp file for shell stdin redirection (< promptfile)
  writeFileSync(cmd.promptFile, cmd.stdin || '', 'utf-8')

  const start = Date.now()

  const proc = Bun.spawn([cmd.cmd, ...cmd.args], {
    cwd: cmd.cwd,
    stdin: 'ignore',  // prompt comes from shell redirect
    stdout: 'pipe',
    stderr: 'pipe',
    // env inherits from parent — essential for API key / auth resolution
    // buildCleanEnv was stripping ANTHROPIC_API_KEY from the subset
  })

  const timeout = setTimeout(() => proc.kill(), cmd.timeoutMs)

  await proc.exited
  clearTimeout(timeout)

  const durationMs = Date.now() - start
  const rawStdout = await new Response(proc.stdout).text()
  const stderr = await new Response(proc.stderr).text()
  const code = proc.exitCode ?? 1

  // Clean up prompt file
  try { unlinkSync(cmd.promptFile) } catch {}

  // Parse JSON output from --output-format json
  let stdout = rawStdout
  try {
    const parsed = JSON.parse(rawStdout)
    stdout = typeof parsed.result === 'string' ? parsed.result : rawStdout
  } catch {
    // If JSON parse fails, keep raw output
  }

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

    // Retry loop: deferred tool deadlock recovery (§3.1.3)
    let lastError: Error | undefined
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await executeSpawnCommand(cmd)
        if (result.stdout.trim() || result.code === 0) return result
        // Empty stdout → possible deferred tool deadlock, retry
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

    // All retries exhausted — return last error as result
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
