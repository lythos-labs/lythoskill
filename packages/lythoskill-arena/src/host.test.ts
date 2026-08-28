import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { mkdtempSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { detectHost, resolveSingleMode } from './host'
import { main, type ArenaCliIO } from './cli'

// ─── Helpers ───────────────────────────────────────────────────────────────

const HOST_VARS = ['CLAUDECODE', 'CLAUDE_CODE_SSE_PORT'] as const

// Tests run inside real agent sessions (kimi-code sets CLAUDE_CODE_SSE_PORT) —
// every test pins the host markers explicitly instead of inheriting them.
function withEnv<T>(vars: Record<string, string | undefined>, fn: () => T): T {
  const saved = new Map<string, string | undefined>()
  for (const k of HOST_VARS) { saved.set(k, process.env[k]); delete process.env[k] }
  for (const [k, v] of Object.entries(vars)) {
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
  try { return fn() } finally {
    for (const [k, v] of saved.entries()) {
      if (v === undefined) delete process.env[k]
      else process.env[k] = v
    }
  }
}

async function catchExitAsync(fn: () => Promise<void>): Promise<number | undefined> {
  let exitCode: number | undefined
  try { await fn() } catch (e: any) {
    if (!String(e).includes('EXIT:')) throw e
    const m = String(e).match(/EXIT:(\d+)/)
    if (m) exitCode = parseInt(m[1], 10)
  }
  return exitCode
}

function mockIO() {
  const logs: string[] = []
  const errors: string[] = []
  const io: Required<ArenaCliIO> = {
    log: (msg: string) => logs.push(msg),
    error: (msg: string) => errors.push(msg),
    warn: () => {},
    exit: (code: number) => { throw new Error(`EXIT:${code}`) },
  }
  return { io, logs, errors }
}

const NO_HOST = { CLAUDECODE: undefined, CLAUDE_CODE_SSE_PORT: undefined } as const
const QUICK_START_DECK = resolve(import.meta.dir, '..', '..', '..', 'examples', 'decks', 'quick-start.toml')

// ─── detectHost ─────────────────────────────────────────────────────────────

describe('detectHost', () => {
  it('detects Claude Code via CLAUDECODE', () => {
    const d = detectHost({ CLAUDECODE: '1' } as NodeJS.ProcessEnv)
    expect(d.detected).toBe(true)
    expect(d.host).toBe('Claude Code')
    expect(d.marker).toBe('CLAUDECODE')
  })

  it('detects claude-code forks (incl. kimi-code) via CLAUDE_CODE_SSE_PORT as unidentified', () => {
    const d = detectHost({ CLAUDE_CODE_SSE_PORT: '12345' } as NodeJS.ProcessEnv)
    expect(d.detected).toBe(true)
    expect(d.host).toBe('agent host (unidentified)')
    expect(d.marker).toBe('CLAUDE_CODE_SSE_PORT')
  })

  it('prefers the specific CLAUDECODE marker when both are set', () => {
    const d = detectHost({ CLAUDECODE: '1', CLAUDE_CODE_SSE_PORT: '1' } as NodeJS.ProcessEnv)
    expect(d.host).toBe('Claude Code')
  })

  it('reports no host when no markers are present', () => {
    const d = detectHost({} as NodeJS.ProcessEnv)
    expect(d.detected).toBe(false)
    expect(d.host).toBe('none')
  })
})

// ─── resolveSingleMode: 4-cell env/flag matrix ─────────────────────────────

describe('resolveSingleMode (4-cell matrix)', () => {
  it('host detected + --player given → external (explicit player always wins)', () => {
    const m = resolveSingleMode('codex', { CLAUDE_CODE_SSE_PORT: '1' } as NodeJS.ProcessEnv)
    expect(m).toEqual({ mode: 'external', player: 'codex' })
  })

  it('no host + --player given → external', () => {
    const m = resolveSingleMode('kimi', {} as NodeJS.ProcessEnv)
    expect(m).toEqual({ mode: 'external', player: 'kimi' })
  })

  it('host detected + no --player → handoff', () => {
    const m = resolveSingleMode(undefined, { CLAUDECODE: '1' } as NodeJS.ProcessEnv)
    expect(m.mode).toBe('handoff')
    if (m.mode === 'handoff') expect(m.host.host).toBe('Claude Code')
  })

  it('no host + no --player → no-player (loud error upstream)', () => {
    const m = resolveSingleMode(undefined, {} as NodeJS.ProcessEnv)
    expect(m.mode).toBe('no-player')
  })
})

// ─── CLI integration ────────────────────────────────────────────────────────

describe('singleRun host-handoff integration', () => {
  let workCwd: string
  let origCwd: string

  beforeEach(() => {
    origCwd = process.cwd()
    workCwd = mkdtempSync(join(tmpdir(), 'arena-handoff-'))
    process.chdir(workCwd)
  })
  afterEach(() => { process.chdir(origCwd) })

  it('host detected, no --player → prints handoff guidance, spawns nothing, exits 0', async () => {
    await withEnv({ CLAUDE_CODE_SSE_PORT: '1' }, async () => {
      const { io, logs, errors } = mockIO()
      const exitCode = await catchExitAsync(async () => {
        await main(['single', '--deck', QUICK_START_DECK, '--brief', 'test'], io)
      })
      // clean return (no exit throw) = exit 0
      expect(exitCode).toBeUndefined()
      expect(errors.length).toBe(0)
      const out = logs.join('\n')
      expect(out).toContain('Host-handoff mode')
      expect(out).toContain('arena-runtime.md')
      expect(out).toContain(QUICK_START_DECK)
      // Structural no-spawn: branch returns before outDir creation
      expect(readdirSync(workCwd).filter(e => e.startsWith('agent-output-'))).toEqual([])
    })
  })

  it('no host, no --player → loud error pointing at player-setup.md, exit 1', async () => {
    await withEnv(NO_HOST, async () => {
      const { io, errors } = mockIO()
      const exitCode = await catchExitAsync(async () => {
        await main(['single', '--brief', 'x'], io)
      })
      expect(exitCode).toBe(1)
      expect(errors[0]).toContain('player-setup.md')
      expect(errors[0]).toContain('--player')
    })
  })
})
