import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { query } from '@anthropic-ai/claude-agent-sdk'
import type { AgentAdapter, AgentRunResult } from '@lythos/agent-adapter'
import { registerAgent } from '@lythos/agent-adapter'

// ── Credential loader ───────────────────────────────────────────────────────
//
// Reads .claude-sdk-key from project root (key=value format, one per line).
// Sets env vars if not already present. Silent if file missing.

function findProjectRoot(): string | undefined {
  // Try current working directory first
  let dir = process.cwd()
  for (let i = 0; i < 5; i++) {
    if (existsSync(join(dir, '.claude-sdk-key'))) return dir
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }

  // Fallback: resolve relative to this file (monorepo: ../../.. from src/)
  try {
    const __filename = fileURLToPath(import.meta.url)
    dir = dirname(__filename)
    for (let i = 0; i < 5; i++) {
      if (existsSync(join(dir, '.claude-sdk-key'))) return dir
      const parent = dirname(dir)
      if (parent === dir) break
      dir = parent
    }
  } catch { /* ESM import.meta.url may not resolve in all contexts */ }

  return undefined
}

function loadCredentials(): void {
  const root = findProjectRoot()
  if (!root) return
  const keyFile = join(root, '.claude-sdk-key')
  if (!existsSync(keyFile)) return

  try {
    const content = readFileSync(keyFile, 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      const value = trimmed.slice(eq + 1).trim()
      if (key && value && process.env[key] === undefined) {
        process.env[key] = value
      }
    }
  } catch { /* silent failure: env vars may already be set */ }
}

// Load once at module initialization
loadCredentials()

// ── Claude SDK AgentAdapter ─────────────────────────────────────────────────
//
// Uses @anthropic-ai/claude-agent-sdk query() API instead of claude -p CLI.
// Avoids deferred tool deadlock, stdin pipe bugs, and env pollution.
// Requires ANTHROPIC_API_KEY or Claude Code credentials in environment.

function checkAuth(): void {
  const hasKey = !!process.env.ANTHROPIC_API_KEY
  const hasClaudeCode = !!process.env.CLAUDE_CODE_SSO_TOKEN || !!process.env.CLAUDECODE
  if (!hasKey && !hasClaudeCode) {
    throw new Error(
      'Claude SDK adapter requires authentication.\n' +
      'Set ANTHROPIC_API_KEY environment variable, create .claude-sdk-key in project root, or run in a Claude Code session.'
    )
  }
}

function parseTools(toolString: string | undefined): string[] | undefined {
  if (!toolString) return undefined
  return toolString.split(',').map(t => t.trim()).filter(Boolean)
}

const claudeSdkAdapter: AgentAdapter = {
  name: 'claude-sdk',

  async spawn(opts): Promise<AgentRunResult> {
    checkAuth()

    const abortController = new AbortController()
    const timeout = setTimeout(() => abortController.abort(), opts.timeoutMs)

    const start = Date.now()

    try {
      const q = query({
        prompt: opts.brief,
        options: {
          cwd: opts.cwd,
          allowedTools: parseTools(opts.allowedTools),
          disallowedTools: parseTools(opts.disallowedTools),
          permissionMode: 'bypassPermissions',
          allowDangerouslySkipPermissions: true,
          abortController,
        },
      })

      let stdout = ''
      let lastError: string | undefined

      for await (const msg of q) {
        if (msg.type === 'result') {
          if (msg.subtype === 'success') {
            stdout = msg.result
          } else {
            lastError = 'SDK returned error result'
          }
          break
        }
        if (msg.type === 'system' && msg.subtype === 'error') {
          lastError = String((msg as unknown as Record<string, string>).text ?? 'Unknown SDK error')
        }
      }

      clearTimeout(timeout)

      const durationMs = Date.now() - start

      return {
        stdout,
        stderr: lastError ?? '',
        code: lastError ? 1 : 0,
        durationMs,
        checkpoints: [],
      }
    } catch (e) {
      clearTimeout(timeout)
      const err = e instanceof Error ? e : new Error(String(e))
      return {
        stdout: '',
        stderr: err.message,
        code: 1,
        durationMs: Date.now() - start,
        checkpoints: [],
      }
    }
  },

  async invokeTool(_opts): Promise<unknown> {
    throw new Error('invokeTool not implemented for claude-sdk adapter')
  },
}

registerAgent('claude-sdk', claudeSdkAdapter)
export { claudeSdkAdapter }
