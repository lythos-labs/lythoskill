import { describe, it, expect } from 'bun:test'
import { main, defaultArenaCliIO, type ArenaCliIO } from './cli'

// ─── Helpers ───────────────────────────────────────────────────────────────

async function catchExitAsync(fn: () => Promise<void>): Promise<number | undefined> {
  let exitCode: number | undefined
  try { await fn() } catch (e: any) {
    if (!String(e).includes('EXIT:')) throw e
    const m = String(e).match(/EXIT:(\d+)/)
    if (m) exitCode = parseInt(m[1], 10)
  }
  return exitCode
}

function mockIO(): { io: Required<ArenaCliIO>; logs: string[]; errors: string[]; warns: string[] } {
  const logs: string[] = []
  const errors: string[] = []
  const warns: string[] = []
  const io: Required<ArenaCliIO> = {
    log: (msg: string) => logs.push(msg),
    error: (msg: string) => errors.push(msg),
    warn: (msg: string) => warns.push(msg),
    exit: (code: number) => { throw new Error(`EXIT:${code}`) },
  }
  return { io, logs, errors, warns }
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('main', () => {
  it('shows help on --help', async () => {
    const { io, logs, errors } = mockIO()
    const exitCode = await catchExitAsync(async () => {
      await main(['--help'], io)
    })
    expect(exitCode).toBe(0)
    expect(logs.length).toBeGreaterThan(0)
    expect(logs[0]).toContain('lythoskill-arena')
    expect(errors.length).toBe(0)
  })

  it('shows help on -h', async () => {
    const { io, logs, errors } = mockIO()
    const exitCode = await catchExitAsync(async () => {
      await main(['-h'], io)
    })
    expect(exitCode).toBe(0)
    expect(logs.length).toBeGreaterThan(0)
    expect(logs[0]).toContain('lythoskill-arena')
    expect(errors.length).toBe(0)
  })

  it('shows help on no args', async () => {
    const { io, logs, errors } = mockIO()
    const exitCode = await catchExitAsync(async () => {
      await main([], io)
    })
    expect(exitCode).toBe(0)
    expect(logs.length).toBeGreaterThan(0)
    expect(errors.length).toBe(0)
  })

  it('errors on unknown command', async () => {
    const { io, logs, errors } = mockIO()
    const exitCode = await catchExitAsync(async () => {
      await main(['bogus'], io)
    })
    expect(exitCode).toBe(1)
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0]).toContain('Unknown command')
    expect(errors[0]).toContain('bogus')
  })
})

describe('singleRun', () => {
  it('errors when --deck is missing', async () => {
    const { io, logs, errors } = mockIO()
    const exitCode = await catchExitAsync(async () => {
      await main(['single', '--brief', 'test task'], io)
    })
    expect(exitCode).toBe(1)
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0]).toContain('--deck')
    expect(errors[0]).toContain('required')
  })

  it('errors when both --task and --brief are missing', async () => {
    const { io, logs, errors } = mockIO()
    const exitCode = await catchExitAsync(async () => {
      await main(['single', '--deck', './some-deck.toml'], io)
    })
    expect(exitCode).toBe(1)
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0]).toContain('--task')
    expect(errors[0]).toContain('--brief')
  })

  it('errors when --brief is empty string', async () => {
    const { io, logs, errors } = mockIO()
    const exitCode = await catchExitAsync(async () => {
      await main(['single', '--deck', './some-deck.toml', '--brief', ''], io)
    })
    expect(exitCode).toBe(1)
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0]).toContain('--task')
    expect(errors[0]).toContain('--brief')
  })
})

describe('defaultArenaCliIO', () => {
  it('has all required functions', () => {
    expect(typeof defaultArenaCliIO.log).toBe('function')
    expect(typeof defaultArenaCliIO.error).toBe('function')
    expect(typeof defaultArenaCliIO.warn).toBe('function')
    expect(typeof defaultArenaCliIO.exit).toBe('function')
  })
})
