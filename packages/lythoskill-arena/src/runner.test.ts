import { describe, test, expect } from 'bun:test'
import { buildArenaPrompt, formatPlanOutput, runArenaFromToml, type ArenaIO } from './runner'
import { buildExecutionPlan, parseArenaToml } from './arena-toml'

describe('buildArenaPrompt — plan-mode (pure, no IO)', () => {
  test('includes CWD, Deck, and output directory', () => {
    const prompt = buildArenaPrompt({
      brief: 'Write a hello world function',
      cwd: '/tmp/arena-cell',
      deckPath: '/tmp/test-deck.toml',
    })
    expect(prompt).toContain('CWD: /tmp/arena-cell')
    expect(prompt).toContain('Deck: /tmp/test-deck.toml')
    expect(prompt).toContain('Produce output to: /tmp/arena-cell/')
  })

  test('includes decision-log.jsonl mandatory instructions', () => {
    const prompt = buildArenaPrompt({
      brief: 'test',
      cwd: '/tmp/arena-cell',
      deckPath: '/tmp/test-deck.toml',
    })
    expect(prompt).toContain('MANDATORY — write decision-log.jsonl')
    expect(prompt).toContain('t (seconds elapsed)')
    expect(prompt).toContain('phase (setup/content/design/output)')
    expect(prompt).toContain('decision (what you chose)')
    expect(prompt).toContain('reason (why)')
  })

  test('includes robustness and tools instructions', () => {
    const prompt = buildArenaPrompt({
      brief: 'test',
      cwd: '/tmp/arena-cell',
      deckPath: '/tmp/test-deck.toml',
    })
    expect(prompt).toContain('ROBUSTNESS')
    expect(prompt).toContain('TOOLS')
    expect(prompt).toContain('.claude/skills/')
  })

  test('task brief appears at the end', () => {
    const prompt = buildArenaPrompt({
      brief: 'Generate a dark-mode CSS theme',
      cwd: '/tmp/arena-cell',
      deckPath: '/tmp/test-deck.toml',
    })
    expect(prompt).toContain('TASK:')
    expect(prompt).toContain('Generate a dark-mode CSS theme')
    // Brief should be at the end (after MANDATORY, ROBUSTNESS, TOOLS)
    const briefIdx = prompt.indexOf('Generate a dark-mode CSS theme')
    const mandatoryIdx = prompt.indexOf('MANDATORY')
    const toolsIdx = prompt.indexOf('TOOLS')
    expect(briefIdx).toBeGreaterThan(mandatoryIdx)
    expect(briefIdx).toBeGreaterThan(toolsIdx)
  })

  test('outputDir overrides default output path', () => {
    const prompt = buildArenaPrompt({
      brief: 'test',
      cwd: '/tmp/arena-cell',
      deckPath: '/tmp/test-deck.toml',
      outputDir: '/custom/output',
    })
    expect(prompt).toContain('Produce output to: /custom/output/')
  })

  test('preflightReport included when provided', () => {
    const prompt = buildArenaPrompt({
      brief: 'test',
      cwd: '/tmp/arena-cell',
      deckPath: '/tmp/test-deck.toml',
      preflightReport: '✅ 3 skills linked, 0 missing',
    })
    expect(prompt).toContain('Preflight:')
    expect(prompt).toContain('✅ 3 skills linked, 0 missing')
  })

  test('no preflight section when report not provided', () => {
    const prompt = buildArenaPrompt({
      brief: 'test',
      cwd: '/tmp/arena-cell',
      deckPath: '/tmp/test-deck.toml',
    })
    expect(prompt).not.toContain('Preflight:')
  })

  test('prompt is deterministic — same inputs = same output', () => {
    const opts = { brief: 'test', cwd: '/tmp/a', deckPath: '/tmp/d.toml' }
    expect(buildArenaPrompt(opts)).toBe(buildArenaPrompt(opts))
  })
})

describe('runArenaFromToml — dry-run mode (no fs/spawn/agent calls)', () => {
  test('returns plan without executing cells', async () => {
    const toml = parseArenaToml(`
[arena]
task = "Write a hello world function"
criteria = ["completeness", "correctness"]
runs_per_side = 1

[[side]]
name = "claude"
player = "claude"
deck = "/tmp/deck.toml"

[[side]]
name = "kimi"
player = "kimi"
deck = "/tmp/deck.toml"
`)

    const logs: string[] = []
    const result = await runArenaFromToml({
      toml,
      taskPath: '/tmp/task.md',
      dryRun: true,
      log: (msg) => logs.push(msg),
    })

    expect('plan' in result).toBe(true)
    const plan = (result as { plan: ReturnType<typeof buildExecutionPlan> }).plan
    expect(plan.total_runs).toBe(2)
    expect(plan.cells.length).toBe(2)
    expect(logs.length).toBeGreaterThan(0)
    expect(logs.some(l => l.includes('Dry-run'))).toBe(true)
  })

  test('dry-run does not call io.mkdir or io.agentSpawn', async () => {
    const toml = parseArenaToml(`
[arena]
task = "Write a hello world function"
criteria = ["completeness"]
runs_per_side = 1

[[side]]
name = "claude"
player = "claude"
deck = "/tmp/deck.toml"

[[side]]
name = "kimi"
player = "kimi"
deck = "/tmp/deck.toml"
`)

    let mkdirCalled = false
    let agentSpawnCalled = false

    const mockIO: ArenaIO = {
      mkdir: () => { mkdirCalled = true },
      agentSpawn: async () => { agentSpawnCalled = true; return { stdout: '', stderr: '', durationMs: 0 } },
    }

    await runArenaFromToml({
      toml,
      taskPath: '/tmp/task.md',
      dryRun: true,
      io: mockIO,
    })

    expect(mkdirCalled).toBe(false)
    expect(agentSpawnCalled).toBe(false)
  })
})

describe('runArenaFromToml — single cell execution with mock agentSpawn', () => {
  test('executes one cell and writes outputs via io', async () => {
    const toml = parseArenaToml(`
[arena]
task = "Write a hello world function"
criteria = ["completeness"]
runs_per_side = 1

[[side]]
name = "claude"
player = "claude"
deck = "/tmp/deck.toml"

[[side]]
name = "kimi"
player = "kimi"
deck = "/tmp/deck.toml"
`)

    const files = new Map<string, string>()
    const dirs = new Set<string>()

    const mockIO: ArenaIO = {
      log: () => {},
      mkdir: (path: string) => { dirs.add(path) },
      writeFile: (path: string, data: string) => { files.set(path, data) },
      readFile: (path: string) => {
        if (path === '/tmp/deck.toml') return 'skills = ["test"]'
        throw new Error(`Unexpected read: ${path}`)
      },
      readdir: () => ['decision-log.jsonl'],
      cp: () => {},
      spawn: async () => ({ exitCode: 0, stderr: '' }),
      agentSpawn: async () => ({
        stdout: 'I wrote hello world',
        stderr: '',
        durationMs: 1234,
      }),
      exists: (path: string) => path === '/tmp/deck.toml',
      chdir: () => {},
    }

    const result = await runArenaFromToml({
      toml,
      taskPath: '/tmp/task.md',
      outDir: '/tmp/arena-out',
      io: mockIO,
    })

    expect('manifest' in result).toBe(true)
    const r = result as { manifest: { id: string; status: string }; artifactsDir: string }
    expect(r.manifest.status).toBe('completed')
    expect(r.artifactsDir).toBe('/tmp/arena-out')

    // arena.json written twice (initial + final)
    expect(files.has('/tmp/arena-out/arena.json')).toBe(true)
    // agent stdout persisted
    expect(files.has('/tmp/arena-out/runs/claude/run-1/agent-stdout.txt')).toBe(true)
    expect(files.get('/tmp/arena-out/runs/claude/run-1/agent-stdout.txt')).toContain('I wrote hello world')
    // judge-verdict.json written
    expect(files.has('/tmp/arena-out/runs/claude/run-1/judge-verdict.json')).toBe(true)
    // report.md written
    expect(files.has('/tmp/arena-out/report.md')).toBe(true)
    // directories created
    expect(dirs.has('/tmp/arena-out')).toBe(true)
    expect(dirs.has('/tmp/arena-out/runs/claude/run-1')).toBe(true)
    expect(dirs.has('/tmp/arena-out/work/claude')).toBe(true)
  })
})

describe('runArenaFromToml — error recovery path', () => {
  test('cell exception produces ERROR verdict and continues', async () => {
    const toml = parseArenaToml(`
[arena]
task = "Write a hello world function"
criteria = ["completeness"]
runs_per_side = 1

[[side]]
name = "claude"
player = "claude"
deck = "/tmp/deck.toml"

[[side]]
name = "kimi"
player = "kimi"
deck = "/tmp/deck.toml"
`)

    const files = new Map<string, string>()

    let spawnCount = 0
    const mockIO: ArenaIO = {
      log: () => {},
      mkdir: () => {},
      writeFile: (path: string, data: string) => { files.set(path, data) },
      readFile: (path: string) => {
        if (path === '/tmp/deck.toml') return 'skills = ["test"]'
        throw new Error(`Unexpected read: ${path}`)
      },
      readdir: () => [],
      cp: () => {},
      spawn: async () => ({ exitCode: 0, stderr: '' }),
      agentSpawn: async () => {
        spawnCount++
        if (spawnCount === 1) throw new Error('Agent spawn failed')
        return { stdout: 'ok', stderr: '', durationMs: 100 }
      },
      exists: (path: string) => path === '/tmp/deck.toml',
      chdir: () => {},
    }

    const result = await runArenaFromToml({
      toml,
      taskPath: '/tmp/task.md',
      outDir: '/tmp/arena-out',
      io: mockIO,
    })

    expect('manifest' in result).toBe(true)
    const r = result as { manifest: { status: string }; stats: { sideName: string; errorRate: number }[] }
    expect(r.manifest.status).toBe('completed')
    expect(r.stats.length).toBe(2)
    const claudeStats = r.stats.find(s => s.sideName === 'claude')
    expect(claudeStats!.errorRate).toBe(1)

    const verdictPath = '/tmp/arena-out/runs/claude/run-1/judge-verdict.json'
    expect(files.has(verdictPath)).toBe(true)
    const verdict = JSON.parse(files.get(verdictPath)!)
    expect(verdict.verdict).toBe('ERROR')
    expect(verdict.reason).toContain('Agent spawn failed')
  })

  test('spawn non-zero exit logs warning but continues', async () => {
    const toml = parseArenaToml(`
[arena]
task = "Write a hello world function"
criteria = ["completeness"]
runs_per_side = 1

[[side]]
name = "claude"
player = "claude"
deck = "/tmp/deck.toml"

[[side]]
name = "kimi"
player = "kimi"
deck = "/tmp/deck.toml"
`)

    const logs: string[] = []
    const files = new Map<string, string>()

    const mockIO: ArenaIO = {
      log: (msg: string) => logs.push(msg),
      mkdir: () => {},
      writeFile: (path: string, data: string) => { files.set(path, data) },
      readFile: (path: string) => {
        if (path === '/tmp/deck.toml') return 'skills = ["test"]'
        throw new Error(`Unexpected read: ${path}`)
      },
      readdir: () => [],
      cp: () => {},
      spawn: async () => ({ exitCode: 1, stderr: 'link failed' }),
      agentSpawn: async () => ({
        stdout: 'done',
        stderr: '',
        durationMs: 100,
      }),
      exists: (path: string) => path === '/tmp/deck.toml',
      chdir: () => {},
    }

    const result = await runArenaFromToml({
      toml,
      taskPath: '/tmp/task.md',
      outDir: '/tmp/arena-out',
      io: mockIO,
    })

    expect('manifest' in result).toBe(true)
    expect(logs.some(l => l.includes('deck link') && l.includes('exit 1'))).toBe(true)
  })
})
