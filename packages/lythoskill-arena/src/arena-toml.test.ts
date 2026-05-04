import { describe, test, expect } from 'bun:test'
import { parseArenaToml, buildExecutionPlan, ArenaToml } from './arena-toml'

const minimalToml = `
[arena]
task = "Test task"
criteria = ["a", "b"]

[[side]]
name = "runner-a"
player = "claude-code"
deck = "./decks/a.toml"

[[side]]
name = "runner-b"
player = "claude-code"
deck = "./decks/b.toml"
`

const fullToml = `
[arena]
task = "Generate auth flow diagram"
criteria = ["syntax", "context", "logic", "token"]
runs_per_side = 3

[[side]]
name = "minimal"
player = "standard-coder"
deck = "./decks/minimal.toml"

[[side]]
name = "rich"
player = "expert-architect"
deck = "./decks/rich.toml"

[[side]]
name = "baseline"
player = "standard-coder"
deck = "./decks/baseline.toml"
control = true

[side.env]
container = "node:20-alpine"
pre_run = ["npm ci", "npm run build"]
working_dir = "/workspace"
`

// ── Schema + Parser ────────────────────────────────────────────────────────

describe('parseArenaToml', () => {
  test('parses minimal two-side arena', () => {
    const result = parseArenaToml(minimalToml)
    expect(result.arena.task).toBe('Test task')
    expect(result.arena.criteria).toEqual(['a', 'b'])
    expect(result.arena.runs_per_side).toBe(1)       // default
    expect(result.side).toHaveLength(2)
    expect(result.side[0].name).toBe('runner-a')
    expect(result.side[0].player).toBe('claude-code')
    expect(result.side[0].deck).toBe('./decks/a.toml')
    expect(result.side[0].control).toBe(false)         // default
  })

  test('parses full arena with runs_per_side and control', () => {
    const result = parseArenaToml(fullToml)
    expect(result.arena.runs_per_side).toBe(3)
    expect(result.side).toHaveLength(3)
    expect(result.side[2].name).toBe('baseline')
    expect(result.side[2].control).toBe(true)
  })

  test('parses side env block', () => {
    const result = parseArenaToml(fullToml)
    const env = result.side[2].env
    expect(env.container).toBe('node:20-alpine')
    expect(env.pre_run).toEqual(['npm ci', 'npm run build'])
    expect(env.working_dir).toBe('/workspace')
    expect(env.env_vars).toEqual({})
  })

  test('rejects fewer than 2 sides', () => {
    const bad = `[arena]\ntask = "x"\ncriteria = ["a"]\n\n[[side]]\nname = "only"\nplayer = "c"\ndeck = "x.toml"`
    expect(() => parseArenaToml(bad)).toThrow()
  })

  test('rejects empty criteria', () => {
    const bad = `[arena]\ntask = "x"\ncriteria = []\n\n[[side]]\nname = "a"\nplayer = "c"\ndeck = "a.toml"\n\n[[side]]\nname = "b"\nplayer = "c"\ndeck = "b.toml"`
    expect(() => parseArenaToml(bad)).toThrow()
  })

  test('rejects non-object input', () => {
    expect(() => ArenaToml.parse('not valid')).toThrow()
  })

  test('rejects missing arena section', () => {
    expect(() => parseArenaToml('[[side]]\nname = "a"')).toThrow()
  })

  test('rejects runs_per_side = 0', () => {
    const bad = `[arena]\ntask = "x"\ncriteria = ["a"]\nruns_per_side = 0\n\n[[side]]\nname = "a"\nplayer = "c"\ndeck = "a.toml"\n\n[[side]]\nname = "b"\nplayer = "c"\ndeck = "b.toml"`
    expect(() => parseArenaToml(bad)).toThrow()
  })

  test('parses integer and boolean values correctly', () => {
    const toml = `[arena]\ntask = "x"\ncriteria = ["a"]\nruns_per_side = 2\nmax_participants = 5\n\n[[side]]\nname = "a"\nplayer = "c"\ndeck = "a.toml"\n\n[[side]]\nname = "b"\nplayer = "c"\ndeck = "b.toml"`
    const result = parseArenaToml(toml)
    expect(result.arena.runs_per_side).toBe(2)
    expect(result.arena.max_participants).toBe(5)
  })

  test('comments are stripped', () => {
    const toml = `[arena]\n# this is a comment\ntask = "x"\ncriteria = ["a"]\n\n[[side]]\nname = "a"\nplayer = "c"\ndeck = "a.toml"\n\n[[side]]\nname = "b"\nplayer = "c"\ndeck = "b.toml"`
    const result = parseArenaToml(toml)
    expect(result.arena.task).toBe('x')
  })
})

// ── Execution Plan ─────────────────────────────────────────────────────────

describe('buildExecutionPlan', () => {
  test('generates plan: 2 sides × 1 run = 2 cells', () => {
    const toml = parseArenaToml(minimalToml)
    const plan = buildExecutionPlan(toml)
    expect(plan.task).toBe('Test task')
    expect(plan.criteria).toEqual(['a', 'b'])
    expect(plan.cells).toHaveLength(2)
    expect(plan.total_runs).toBe(2)
    expect(plan.cells[0]).toEqual({ side: 'runner-a', player: 'claude-code', deck: './decks/a.toml', run: 1, control: false })
    expect(plan.cells[1]).toEqual({ side: 'runner-b', player: 'claude-code', deck: './decks/b.toml', run: 1, control: false })
  })

  test('generates plan: 3 sides × 3 runs = 9 cells', () => {
    const toml = parseArenaToml(fullToml)
    const plan = buildExecutionPlan(toml)
    expect(plan.cells).toHaveLength(9)
    expect(plan.total_runs).toBe(9)

    // Cells are ordered: side 0 run 1, side 0 run 2, side 0 run 3, side 1 run 1, ...
    expect(plan.cells[0]).toEqual({ side: 'minimal', player: 'standard-coder', deck: './decks/minimal.toml', run: 1, control: false })
    expect(plan.cells[1]).toEqual({ side: 'minimal', player: 'standard-coder', deck: './decks/minimal.toml', run: 2, control: false })
    expect(plan.cells[2]).toEqual({ side: 'minimal', player: 'standard-coder', deck: './decks/minimal.toml', run: 3, control: false })
    expect(plan.cells[3]).toEqual({ side: 'rich', player: 'expert-architect', deck: './decks/rich.toml', run: 1, control: false })
    expect(plan.cells[8]).toEqual({ side: 'baseline', player: 'standard-coder', deck: './decks/baseline.toml', run: 3, control: true })
  })

  test('control flag preserved in plan cells', () => {
    const toml = parseArenaToml(fullToml)
    const plan = buildExecutionPlan(toml)
    const baselineCells = plan.cells.filter(c => c.side === 'baseline')
    expect(baselineCells).toHaveLength(3)
    expect(baselineCells.every(c => c.control)).toBe(true)
  })

  test('dry-run: plan is pure data, no side effects', () => {
    // The entire plan generation is a pure function — dry-run is just printing it
    const toml = parseArenaToml(fullToml)
    const plan = buildExecutionPlan(toml)
    // Verify plan is self-describing for a --dry-run output
    expect(plan.total_runs).toBeGreaterThan(0)
    expect(plan.cells.every(c => typeof c.side === 'string')).toBe(true)
    expect(plan.cells.every(c => typeof c.player === 'string')).toBe(true)
    expect(plan.cells.every(c => typeof c.deck === 'string')).toBe(true)
    expect(plan.cells.every(c => typeof c.run === 'number')).toBe(true)
  })
})
