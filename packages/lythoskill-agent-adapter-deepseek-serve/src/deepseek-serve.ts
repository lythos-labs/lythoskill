/**
 * DeepSeek serve-mode adapter — HTTP thread API for full agent execution.
 *
 * Background: `deepseek "prompt"` and `deepseek exec` are text-only (no tool
 * execution). The `deepseek serve --http` thread API supports full agent mode
 * with file ops, shell, web search, and subagents.
 *
 * Lifecycle:
 *   1. Version check — must be in known range (0.8.x)
 *   2. Lock file — ~/.agents/lythoskill/deepseek-serve.json (pid, port, version)
 *   3. If serve running (PID alive) → reuse port
 *   4. If not → start `deepseek serve --http --port <auto>` → write lock
 *   5. HTTP thread API: create thread → send turn → collect SSE → return
 *
 * Per wiki: cortex/wiki/03-lessons/2026-05-06-deepseek-tui-headless-programmatic-analysis.md
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { spawn, type Subprocess } from 'bun'
import type { AgentAdapter, AgentRunResult } from '@lythos/agent-adapter'
import { registerAgent } from '@lythos/agent-adapter'

// ── Config ──────────────────────────────────────────────────────────────────

const LOCK_DIR = join(homedir(), '.agents', 'lythoskill')
const LOCK_FILE = join(LOCK_DIR, 'deepseek-serve.json')
const BASE_PORT = 17878

interface ServeLock {
  pid: number
  port: number
  version: string
  startedAt: string
  /** Session ID → thread ID mappings. Threads can be resumed/forked across sessions. */
  threads: Record<string, string>
}

// ── Lock file ───────────────────────────────────────────────────────────────

function readLock(): ServeLock | null {
  try {
    if (!existsSync(LOCK_FILE)) return null
    return JSON.parse(readFileSync(LOCK_FILE, 'utf-8'))
  } catch {
    return null
  }
}

function writeLock(lock: ServeLock): void {
  mkdirSync(LOCK_DIR, { recursive: true })
  writeFileSync(LOCK_FILE, JSON.stringify(lock, null, 2) + '\n')
}

function updateThreadMapping(sessionId: string, threadId: string): void {
  const lock = readLock()
  if (!lock) return
  lock.threads[sessionId] = threadId
  writeLock(lock)
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

// ── Port finder ─────────────────────────────────────────────────────────────

async function findFreePort(start: number): Promise<number> {
  const net = await import('node:net')
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.listen(start, '127.0.0.1', () => {
      const port = (server.address() as any).port
      server.close(() => resolve(port))
    })
    server.on('error', () => resolve(findFreePort(start + 1)))
  })
}

// ── Version check ───────────────────────────────────────────────────────────

async function getVersion(): Promise<string | null> {
  try {
    const proc = spawn({ cmd: ['deepseek', '--version'], stdout: 'pipe', stderr: 'pipe' })
    const out = await new Response(proc.stdout).text()
    const match = out.match(/(\d+\.\d+\.\d+)/)
    return match ? match[1] : null
  } catch {
    return null
  }
}

// ── Serve lifecycle ─────────────────────────────────────────────────────────

let cachedPort: number | null = null

async function ensureServeRunning(): Promise<number> {
  if (cachedPort !== null) {
    // Quick health check
    try {
      const res = await fetch(`http://127.0.0.1:${cachedPort}/health`, { signal: AbortSignal.timeout(2000) })
      if (res.ok) return cachedPort
    } catch {}
    cachedPort = null
  }

  // Check version
  const version = await getVersion()
  if (!version) throw new Error('DeepSeek CLI not found. Install: https://github.com/Hmbown/deepseek-tui')
  if (!version.startsWith('0.8.')) {
    console.warn(`⚠️  DeepSeek version ${version} — tested on 0.8.14. May behave differently.`)
  }

  // Check lock file
  const lock = readLock()
  if (lock && isProcessAlive(lock.pid)) {
    // Verify health
    try {
      const res = await fetch(`http://127.0.0.1:${lock.port}/health`, { signal: AbortSignal.timeout(2000) })
      if (res.ok) {
        cachedPort = lock.port
        return lock.port
      }
    } catch {}
  }

  // Start new serve instance
  const port = await findFreePort(BASE_PORT)
  console.log(`🔧 Starting DeepSeek serve on port ${port}...`)

  const proc = spawn({
    cmd: ['deepseek', 'serve', '--http', '--port', String(port)],
    stdout: 'pipe',
    stderr: 'pipe',
    stdin: 'ignore',
  })

  // Wait for serve to be ready (up to 60s for CI/cold-start)
  for (let i = 0; i < 120; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/health`, { signal: AbortSignal.timeout(1000) })
      if (res.ok) {
        writeLock({ pid: proc.pid, port, version, startedAt: new Date().toISOString(), threads: {} })
        cachedPort = port
        return port
      }
    } catch {}
    await new Promise(r => setTimeout(r, 500))
  }

  throw new Error(`DeepSeek serve failed to start on port ${port}`)
}

// ── Thread API ──────────────────────────────────────────────────────────────

interface DeepSeekThread {
  id: string
  workspace: string
  mode: string
}

interface DeepSeekEvent {
  seq: number
  event: string
  payload: { delta?: string; kind?: string }
}

async function collectThreadOutput(threadId: string, port: number, timeoutMs: number): Promise<string> {
  // Wait for turn to appear (non-blocking, short poll)
  const deadline = Date.now() + timeoutMs
  let lastSeq = 0
  let output = ''
  let completed = false

  while (Date.now() < deadline) {
    // Get events since last checkpoint (incremental, not from 0 each time)
    const eventsRes = await fetch(
      `http://127.0.0.1:${port}/v1/threads/${threadId}/events?since_seq=${lastSeq}`,
      { signal: AbortSignal.timeout(3000) }
    ).catch(() => null)

    if (eventsRes?.ok) {
      const text = await eventsRes.text()
      for (const line of text.split('\n')) {
        if (line.startsWith('data: ')) {
          try {
            const event: DeepSeekEvent = JSON.parse(line.slice(6))
            if (event.seq > lastSeq) lastSeq = event.seq
            if (event.payload?.delta) output += event.payload.delta
            if (event.event === 'turn_completed' || event.event === 'turn.completed') completed = true
          } catch {}
        }
      }
    }

    // Fallback: check thread status directly if SSE didn't signal completion
    if (!completed) {
      try {
        const thRes = await fetch(
          `http://127.0.0.1:${port}/v1/threads/${threadId}`,
          { signal: AbortSignal.timeout(3000) }
        )
        if (thRes.ok) {
          const th = await thRes.json()
          const turn = th.turns?.[0] ?? th.thread?.latest_turn
          if (turn?.status === 'completed' && output) completed = true
        }
      } catch {}
    }

    if (completed && output) return output

    // Adaptive poll: shorter interval when events are flowing
    await new Promise(r => setTimeout(r, 500))
  }

  return output || '(timeout)'
}

// ── Session tracking ────────────────────────────────────────────────────────

let sessionCounter = 0

function nextSessionId(): string {
  sessionCounter++
  const ts = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 15)
  return `arena-${ts}-${String(sessionCounter).padStart(3, '0')}`
}

// ── Adapter ─────────────────────────────────────────────────────────────────

const deepseekServeAdapter: AgentAdapter = {
  name: 'deepseek',

  async spawn(opts): Promise<AgentRunResult> {
    const startTime = Date.now()
    const port = await ensureServeRunning()
    const sessionId = nextSessionId()

    // Create thread
    const threadRes = await fetch(`http://127.0.0.1:${port}/v1/threads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspace: opts.cwd,
        mode: 'yolo',
        auto_approve: true,
        allow_shell: true,
      }),
    })
    if (!threadRes.ok) {
      throw new Error(`Failed to create thread: HTTP ${threadRes.status}`)
    }
    const thread: DeepSeekThread = await threadRes.json()
    updateThreadMapping(sessionId, thread.id)

    // Send turn
    const turnRes = await fetch(`http://127.0.0.1:${port}/v1/threads/${thread.id}/turns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: opts.brief }),
    })
    if (!turnRes.ok) {
      throw new Error(`Failed to send turn: HTTP ${turnRes.status}`)
    }

    // Collect output
    const stdout = await collectThreadOutput(thread.id, port, opts.timeoutMs)
    const durationMs = Date.now() - startTime

    return {
      stdout,
      stderr: '',
      code: 0,
      durationMs,
      checkpoints: [],
    }
  },
}

registerAgent('deepseek', deepseekServeAdapter)

export { deepseekServeAdapter, ensureServeRunning }
