import { describe, it, expect } from 'bun:test'
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
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
  // Validation-order tests pin --player to force external mode: since
  // TASK-20260828141622671, mode resolution (host handoff vs no-player error)
  // precedes flag validation, and the host env of the machine running the
  // tests would otherwise change which error fires (CI has no host markers).
  it('errors when --deck is missing', async () => {
    const { io, logs, errors } = mockIO()
    const exitCode = await catchExitAsync(async () => {
      await main(['single', '--brief', 'test task', '--player', 'kimi'], io)
    })
    expect(exitCode).toBe(1)
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0]).toContain('--deck')
    expect(errors[0]).toContain('required')
  })

  it('errors when both --task and --brief are missing', async () => {
    const { io, logs, errors } = mockIO()
    const exitCode = await catchExitAsync(async () => {
      await main(['single', '--deck', './some-deck.toml', '--player', 'kimi'], io)
    })
    expect(exitCode).toBe(1)
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0]).toContain('--task')
    expect(errors[0]).toContain('--brief')
  })

  it('errors when --brief is empty string', async () => {
    const { io, logs, errors } = mockIO()
    const exitCode = await catchExitAsync(async () => {
      await main(['single', '--deck', './some-deck.toml', '--brief', '', '--player', 'kimi'], io)
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

// ═══════════════════════════════════════════════════════════════════════════
// archive — collect step merges per-cell decision logs
// (TASK-20260909010121918)
// ═══════════════════════════════════════════════════════════════════════════

describe('archive — per-cell decision-log merge', () => {

  function scaffold() {
    const root = mkdtempSync(join(tmpdir(), 'arena-archive-'))
    const from = join(root, 'work')
    const to = join(root, 'archived')
    mkdirSync(join(from, 'side-a'), { recursive: true })
    mkdirSync(join(from, 'side-b'), { recursive: true })
    return { root, from, to }
  }

  it('merges side-a per-cell logs into one decision-log.jsonl', async () => {
    const { root, from, to } = scaffold()
    try {
      writeFileSync(join(from, 'side-a', 'decision-log-s1a.jsonl'), '{"t":0,"phase":"a","decision":"cell 1a","reason":"r"}\n')
      writeFileSync(join(from, 'side-a', 'decision-log-s3a.jsonl'), '{"t":0,"phase":"a","decision":"cell 3a","reason":"r"}\n')
      writeFileSync(join(from, 'side-a', 'report.md'), '# side-a report\n')

      const { io, logs } = mockIO()
      await main(['archive', '--from', from, '--to', to, '--sides', 'side-a'], io)

      const merged = readFileSync(join(to, 'side-a', 'decision-log.jsonl'), 'utf-8')
      expect(merged).toContain('cell 1a')
      expect(merged).toContain('cell 3a')
      expect(merged.trim().split('\n')).toHaveLength(2)
      // Per-cell files stay as provenance — the merged line carries no cell attribution.
      expect(existsSync(join(to, 'side-a', 'decision-log-s1a.jsonl'))).toBe(true)
      expect(existsSync(join(to, 'side-a', 'decision-log-s3a.jsonl'))).toBe(true)
      expect(logs.some(l => l.includes('merged 2 per-cell log(s)'))).toBe(true)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('a single legacy decision-log.jsonl is already merged — not rewritten', async () => {
    const { root, from, to } = scaffold()
    try {
      const legacy = '{"t":0,"phase":"a","decision":"only cell","reason":"r"}\n'
      writeFileSync(join(from, 'side-b', 'decision-log.jsonl'), legacy)

      const { io } = mockIO()
      await main(['archive', '--from', from, '--to', to, '--sides', 'side-b'], io)

      expect(readFileSync(join(to, 'side-b', 'decision-log.jsonl'), 'utf-8')).toBe(legacy)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('mixed workdir: legacy + per-cell logs all survive the merge', async () => {
    const { root, from, to } = scaffold()
    try {
      writeFileSync(join(from, 'side-a', 'decision-log.jsonl'), '{"t":0,"phase":"a","decision":"legacy entry","reason":"r"}\n')
      writeFileSync(join(from, 'side-a', 'decision-log-s1a.jsonl'), '{"t":0,"phase":"a","decision":"cell 1a","reason":"r"}\n')

      const { io } = mockIO()
      await main(['archive', '--from', from, '--to', to, '--sides', 'side-a'], io)

      const merged = readFileSync(join(to, 'side-a', 'decision-log.jsonl'), 'utf-8')
      expect(merged).toContain('legacy entry')
      expect(merged).toContain('cell 1a')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})
