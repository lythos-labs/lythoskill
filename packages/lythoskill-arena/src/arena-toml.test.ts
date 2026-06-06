import { describe, it, expect } from 'bun:test'
import { parseArenaToml, buildExecutionPlan, ArenaToml } from './arena-toml'
import { formatPlanOutput } from './runner'

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

const judgeToml = `
[arena]
task = "Test task"
judge = "Evaluate completeness and correctness. Return JSON."

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

describe('parseArenaToml', () => {
  it('parses minimal two-side arena with criteria', () => {
    const result = parseArenaToml(minimalToml)
    expect(result.arena.task).toBe('Test task')
    expect(result.arena.criteria).toEqual(['a', 'b'])
    expect(result.arena.runs_per_side).toBe(1)
    expect(result.side).toHaveLength(2)
    expect(result.side[0].name).toBe('runner-a')
    expect(result.side[0].player).toBe('claude-code')
    expect(result.side[0].deck).toBe('./decks/a.toml')
    expect(result.side[0].control).toBe(false)
  })

  it('parses arena with judge field (preferred over criteria)', () => {
    const result = parseArenaToml(judgeToml)
    expect(result.arena.judge).toContain('Evaluate completeness')
    expect(result.arena.criteria).toBeUndefined()
    expect(result.side).toHaveLength(2)
  })

  it('parses full arena with runs_per_side and control', () => {
    const result = parseArenaToml(fullToml)
    expect(result.arena.runs_per_side).toBe(3)
    expect(result.side).toHaveLength(3)
    expect(result.side[2].name).toBe('baseline')
    expect(result.side[2].control).toBe(true)
  })

  it('parses side env block', () => {
    const result = parseArenaToml(fullToml)
    const env = result.side[2].env
    expect(env.container).toBe('node:20-alpine')
    expect(env.pre_run).toEqual(['npm ci', 'npm run build'])
    expect(env.working_dir).toBe('/workspace')
    expect(env.env_vars).toEqual({})
  })

  it('rejects fewer than 2 sides', () => {
    const bad = `[arena]\ntask = "x"\ncriteria = ["a"]\n\n[[side]]\nname = "only"\nplayer = "c"\ndeck = "x.toml"`
    expect(() => parseArenaToml(bad)).toThrow()
  })

  it('rejects neither judge nor criteria provided', () => {
    const bad = `[arena]\ntask = "x"\n\n[[side]]\nname = "a"\nplayer = "c"\ndeck = "a.toml"\n\n[[side]]\nname = "b"\nplayer = "c"\ndeck = "b.toml"`
    expect(() => parseArenaToml(bad)).toThrow()
  })

  it('accepts judge without criteria (either is sufficient)', () => {
    const toml = `[arena]\ntask = "x"\njudge = "Evaluate this."\n\n[[side]]\nname = "a"\nplayer = "c"\ndeck = "a.toml"\n\n[[side]]\nname = "b"\nplayer = "c"\ndeck = "b.toml"`
    expect(() => parseArenaToml(toml)).not.toThrow()
  })

  it('rejects empty criteria and no judge', () => {
    const bad = `[arena]\ntask = "x"\ncriteria = []\n\n[[side]]\nname = "a"\nplayer = "c"\ndeck = "a.toml"\n\n[[side]]\nname = "b"\nplayer = "c"\ndeck = "b.toml"`
    expect(() => parseArenaToml(bad)).toThrow()
  })

  it('rejects non-object input', () => {
    expect(() => ArenaToml.parse('not valid')).toThrow()
  })

  it('rejects missing arena section', () => {
    expect(() => parseArenaToml('[[side]]\nname = "a"')).toThrow()
  })

  it('rejects runs_per_side = 0', () => {
    const bad = `[arena]\ntask = "x"\ncriteria = ["a"]\nruns_per_side = 0\n\n[[side]]\nname = "a"\nplayer = "c"\ndeck = "a.toml"\n\n[[side]]\nname = "b"\nplayer = "c"\ndeck = "b.toml"`
    expect(() => parseArenaToml(bad)).toThrow()
  })

  it('parses integer and boolean values correctly', () => {
    const toml = `[arena]\ntask = "x"\ncriteria = ["a"]\nruns_per_side = 2\nmax_participants = 5\n\n[[side]]\nname = "a"\nplayer = "c"\ndeck = "a.toml"\n\n[[side]]\nname = "b"\nplayer = "c"\ndeck = "b.toml"`
    const result = parseArenaToml(toml)
    expect(result.arena.runs_per_side).toBe(2)
    expect(result.arena.max_participants).toBe(5)
  })

  it('comments are stripped', () => {
    const toml = `[arena]\n# this is a comment\ntask = "x"\ncriteria = ["a"]\n\n[[side]]\nname = "a"\nplayer = "c"\ndeck = "a.toml"\n\n[[side]]\nname = "b"\nplayer = "c"\ndeck = "b.toml"`
    const result = parseArenaToml(toml)
    expect(result.arena.task).toBe('x')
  })
})

describe('buildExecutionPlan', () => {
  it('generates plan: 2 sides × 1 run = 2 cells', () => {
    const toml = parseArenaToml(minimalToml)
    const plan = buildExecutionPlan(toml)
    expect(plan.task).toBe('Test task')
    expect(plan.judge).toBeNull()
    expect(plan.cells).toHaveLength(2)
    expect(plan.total_runs).toBe(2)
  })

  it('generates plan with judge field populated', () => {
    const toml = parseArenaToml(judgeToml)
    const plan = buildExecutionPlan(toml)
    expect(plan.judge).toContain('Evaluate completeness')
  })

  it('generates plan: 3 sides × 3 runs = 9 cells', () => {
    const toml = parseArenaToml(fullToml)
    const plan = buildExecutionPlan(toml)
    expect(plan.cells).toHaveLength(9)
    expect(plan.total_runs).toBe(9)
  })

  it('control flag preserved in plan cells', () => {
    const toml = parseArenaToml(fullToml)
    const plan = buildExecutionPlan(toml)
    const baselineCells = plan.cells.filter(c => c.side === 'baseline')
    expect(baselineCells).toHaveLength(3)
    expect(baselineCells.every(c => c.control)).toBe(true)
  })

  it('dry-run: plan is pure data, no side effects', () => {
    const toml = parseArenaToml(fullToml)
    const plan = buildExecutionPlan(toml)
    expect(plan.total_runs).toBeGreaterThan(0)
    expect(plan.cells.every(c => typeof c.side === 'string')).toBe(true)
    expect(plan.cells.every(c => typeof c.player === 'string')).toBe(true)
    expect(plan.cells.every(c => typeof c.deck === 'string')).toBe(true)
    expect(plan.cells.every(c => typeof c.run === 'number')).toBe(true)
  })
})
