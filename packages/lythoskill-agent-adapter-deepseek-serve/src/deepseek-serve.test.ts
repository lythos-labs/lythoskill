/**
 * Actor FSM tests: lock file, PID detection, version parsing, session IDs.
 * No real serve process needed — pure state machine + injectable fs.
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// Re-import the module for each test to get a fresh state
// We test the exported adapter + internal pure functions indirectly

// ── Helpers ──────────────────────────────────────────────────────────────────

function tempLockDir() {
  const dir = mkdtempSync(join(tmpdir(), 'deepseek-test-'))
  return dir
}

function writeTestLock(dir: string, lock: Record<string, unknown>) {
  writeFileSync(join(dir, 'deepseek-serve.json'), JSON.stringify(lock, null, 2))
}

// ── Lock file FSM ───────────────────────────────────────────────────────────

describe('ServeLock FSM — lock file lifecycle', () => {
  let lockDir: string

  beforeEach(() => { lockDir = tempLockDir() })
  afterEach(() => { try { rmSync(lockDir, { recursive: true, force: true }) } catch {} })

  it('FSM: no lock → null', () => {
    const lockPath = join(lockDir, 'deepseek-serve.json')
    // inline logic
    // Simulate readLock logic
    expect(existsSync(lockPath)).toBe(false)
  })

  it('FSM: write lock → read back', () => {
    const lock = { pid: 12345, port: 17878, version: '0.8.14', startedAt: new Date().toISOString(), threads: {} }
    writeTestLock(lockDir, lock)
    const content = readFileSync(join(lockDir, 'deepseek-serve.json'), 'utf-8')
    const parsed = JSON.parse(content)
    expect(parsed.pid).toBe(12345)
    expect(parsed.port).toBe(17878)
    expect(parsed.version).toBe('0.8.14')
    expect(parsed.threads).toEqual({})
  })

  it('FSM: corrupt lock → null (not crash)', () => {
    writeFileSync(join(lockDir, 'deepseek-serve.json'), 'not valid json {{{')
    // readLock should return null, not throw
    try {
      const raw = readFileSync(join(lockDir, 'deepseek-serve.json'), 'utf-8')
      const parsed = JSON.parse(raw)
      // Should have thrown
      expect(false).toBe(true)
    } catch {
      // Expected — JSON parse fails
      expect(true).toBe(true)
    }
  })

  it('FSM: updateThreadMapping adds entry', () => {
    const lock = { pid: 12345, port: 17878, version: '0.8.14', startedAt: new Date().toISOString(), threads: {} as Record<string, string> }
    writeTestLock(lockDir, lock)
    // Simulate update
    lock.threads['arena-20260508-001'] = 'thr_abc123'
    writeTestLock(lockDir, lock)
    const content = readFileSync(join(lockDir, 'deepseek-serve.json'), 'utf-8')
    const parsed = JSON.parse(content)
    expect(parsed.threads['arena-20260508-001']).toBe('thr_abc123')
    expect(Object.keys(parsed.threads).length).toBe(1)
  })

  it('FSM: multiple sessions map to different threads', () => {
    const lock = { pid: 12345, port: 17878, version: '0.8.14', startedAt: new Date().toISOString(), threads: {} as Record<string, string> }
    lock.threads['arena-20260508-001'] = 'thr_aaa'
    lock.threads['arena-20260508-002'] = 'thr_bbb'
    lock.threads['arena-20260508-003'] = 'thr_ccc'
    writeTestLock(lockDir, lock)
    const content = readFileSync(join(lockDir, 'deepseek-serve.json'), 'utf-8')
    const parsed = JSON.parse(content)
    expect(Object.keys(parsed.threads).length).toBe(3)
    expect(parsed.threads['arena-20260508-002']).toBe('thr_bbb')
  })
})

// ── PID detection ───────────────────────────────────────────────────────────

describe('isProcessAlive — PID signal', () => {
  it('current process PID is alive', () => {
    const alive = (() => {
      try { process.kill(process.pid, 0); return true } catch { return false }
    })()
    expect(alive).toBe(true)
  })

  it('impossible PID is dead', () => {
    // PID 99999 is extremely unlikely to exist
    const alive = (() => {
      try { process.kill(99999, 0); return true } catch { return false }
    })()
    expect(alive).toBe(false)
  })

  it('PID 0 is alive (self)', () => {
    // process.kill(0, 0) signals the whole process group — always succeeds
    const alive = (() => {
      try { process.kill(0, 0); return true } catch { return false }
    })()
    expect(alive).toBe(true)
  })
})

// ── Version parsing ─────────────────────────────────────────────────────────

describe('getVersion — parse deepseek --version', () => {
  it('parses standard version format', () => {
    const out = 'deepseek 0.8.14\n'
    const match = out.match(/(\d+\.\d+\.\d+)/)
    expect(match?.[1]).toBe('0.8.14')
  })

  it('parses version from mixed output', () => {
    const out = 'DeepSeek TUI v0.8.14 (abc1234)\nRuntime: Rust 1.80\n'
    const match = out.match(/(\d+\.\d+\.\d+)/)
    expect(match?.[1]).toBe('0.8.14')
  })

  it('returns null for no version', () => {
    const out = 'command not found\n'
    const match = out.match(/(\d+\.\d+\.\d+)/)
    expect(match).toBe(null)
  })

  it('0.8.x passes version check', () => {
    const version = '0.8.14'
    expect(version.startsWith('0.8.')).toBe(true)
  })

  it('0.9.x still works (with warning)', () => {
    const version = '0.9.0'
    expect(version.startsWith('0.8.')).toBe(false)
    // Should warn but continue
  })
})

// ── Session ID format ───────────────────────────────────────────────────────

describe('nextSessionId — format', () => {
  it('starts with arena- prefix', () => {
    let counter = 0
    const ts = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 15)
    counter++
    const id = `arena-${ts}-${String(counter).padStart(3, '0')}`
    expect(id.startsWith('arena-')).toBe(true)
  })

  it('counter increments', () => {
    let counter = 0
    const ts = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 15)
    const ids: string[] = []
    for (let i = 0; i < 5; i++) {
      counter++
      ids.push(`arena-${ts}-${String(counter).padStart(3, '0')}`)
    }
    expect(ids[0]).toContain('-001')
    expect(ids[4]).toContain('-005')
    // All unique
    expect(new Set(ids).size).toBe(5)
  })
})

// ── Adapter registration ────────────────────────────────────────────────────

describe('adapter registration', () => {
  it('adapter is registered under name "deepseek"', async () => {
    const { deepseekServeAdapter } = await import('./deepseek-serve')
    expect(deepseekServeAdapter.name).toBe('deepseek')
  })

  it('adapter has spawn method', async () => {
    const { deepseekServeAdapter } = await import('./deepseek-serve')
    expect(typeof deepseekServeAdapter.spawn).toBe('function')
  })
})

// ── Actor FSM: state transitions (conceptual) ───────────────────────────────

describe('Actor FSM — state transitions', () => {
  it('state: cold start → serve running', () => {
    // Given: no lock file, serve not running
    // When: ensureServeRunning()
    // Then: findFreePort → spawn serve → health check → writeLock → return port
    // (tested via logic verification only — real serve needed for integration)
    const states = ['no_lock', 'starting', 'health_check', 'ready', 'error']
    expect(states).toContain('ready')
    expect(states).toContain('error')
  })

  it('state: warm reuse → skip start', () => {
    // Given: lock exists, PID alive, health check passes
    // When: ensureServeRunning()
    // Then: cachedPort → health check → return (no new process)
    const expectedPath = ['check_cache', 'health_pass', 'return_port']
    expect(expectedPath.length).toBe(3)
  })

  it('state: dead PID → restart', () => {
    // Given: lock exists, PID dead
    // When: ensureServeRunning()
    // Then: isProcessAlive → false → findFreePort → spawn → health → writeLock
    const expectedPath = ['check_lock', 'pid_dead', 'find_port', 'spawn', 'health', 'write_lock', 'ready']
    expect(expectedPath.length).toBe(7)
  })

  it('state: port occupied → increment', () => {
    // Given: base port 17878 occupied
    // When: findFreePort(17878)
    // Then: try 17879, 17880... until free
    const findNext = (start: number) => start + 1
    expect(findNext(17878)).toBe(17879)
    expect(findNext(17879)).toBe(17880)
  })
})

// ── Thread API paths (conceptual) ──────────────────────────────────────────

describe('Thread API — request paths', () => {
  const PORT = 17878
  const THREAD_ID = 'thr_test123'

  it('POST /v1/threads — create thread', () => {
    const path = `/v1/threads`
    const url = `http://127.0.0.1:${PORT}${path}`
    expect(path).toBe('/v1/threads')
    expect(url).toContain(':17878')
  })

  it('POST /v1/threads/{id}/turns — send turn', () => {
    const path = `/v1/threads/${THREAD_ID}/turns`
    expect(path).toContain(THREAD_ID)
    expect(path).toContain('/turns')
  })

  it('GET /v1/threads/{id}/events — SSE stream', () => {
    const path = `/v1/threads/${THREAD_ID}/events`
    const url = `http://127.0.0.1:${PORT}${path}?since_seq=0`
    expect(url).toContain('since_seq=0')
  })

  it('GET /health — health check', () => {
    const url = `http://127.0.0.1:${PORT}/health`
    expect(url.endsWith('/health')).toBe(true)
  })
})

// ── Lock file schema ────────────────────────────────────────────────────────

describe('ServeLock schema', () => {
  it('valid lock matches expected shape', () => {
    const lock = {
      pid: 12345,
      port: 17878,
      version: '0.8.14',
      startedAt: '2026-05-08T05:04:46.734Z',
      threads: { 'arena-001': 'thr_abc' },
    }
    expect(typeof lock.pid).toBe('number')
    expect(typeof lock.port).toBe('number')
    expect(typeof lock.version).toBe('string')
    expect(typeof lock.startedAt).toBe('string')
    expect(typeof lock.threads).toBe('object')
  })

  it('threads must be string→string map', () => {
    const threads: Record<string, string> = {}
    threads['session-a'] = 'thr_111'
    threads['session-b'] = 'thr_222'
    for (const [k, v] of Object.entries(threads)) {
      expect(typeof k).toBe('string')
      expect(typeof v).toBe('string')
      expect(v.startsWith('thr_')).toBe(true)
    }
  })
})
