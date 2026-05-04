import { describe, test, expect } from 'bun:test'
import { resolvePlayer, resolveSides, groupBySide, totalRuns } from './player'
import { parseArenaToml } from './arena-toml'

const toml = parseArenaToml(`
[arena]
task = "Test task"
criteria = ["a", "b"]
runs_per_side = 3

[[side]]
name = "minimal"
player = "claude-code"
deck = "./decks/minimal.toml"

[[side]]
name = "rich"
player = "expert-architect"
deck = "./decks/rich.toml"
`)

describe('resolvePlayer', () => {
  test('maps claude-code → claude', () => {
    expect(resolvePlayer('claude-code')).toBe('claude')
  })

  test('maps Claude → claude (case insensitive)', () => {
    expect(resolvePlayer('Claude')).toBe('claude')
  })

  test('maps kimi → kimi', () => {
    expect(resolvePlayer('kimi')).toBe('kimi')
  })

  test('passes through unknown player names', () => {
    expect(resolvePlayer('expert-architect')).toBe('expert-architect')
  })

  test('trims whitespace', () => {
    expect(resolvePlayer('  claude-code  ')).toBe('claude')
  })
})

describe('resolveSides', () => {
  test('resolves all sides in arena.toml', () => {
    const sides = resolveSides(toml)
    expect(sides).toHaveLength(2)
    expect(sides[0].platform).toBe('claude')
    expect(sides[1].platform).toBe('expert-architect')
    expect(sides[0].playerName).toBe('claude-code')
  })

  test('preserves side config', () => {
    const sides = resolveSides(toml)
    expect(sides[0].side.name).toBe('minimal')
    expect(sides[0].side.deck).toBe('./decks/minimal.toml')
  })
})

describe('groupBySide', () => {
  test('groups by side name with run count', () => {
    const groups = groupBySide(toml)
    expect(groups).toHaveLength(2)
    expect(groups[0].runs).toBe(3) // runs_per_side
    expect(groups[1].runs).toBe(3)
    expect(groups[0].platform).toBe('claude')
  })

  test('control flag preserved', () => {
    const controlToml = parseArenaToml(`
[arena]
task = "x"
criteria = ["a"]

[[side]]
name = "test"
player = "claude-code"
deck = "a.toml"

[[side]]
name = "baseline"
player = "claude-code"
deck = "b.toml"
control = true
`)
    const groups = groupBySide(controlToml)
    expect(groups[1].control).toBe(true)
  })
})

describe('totalRuns', () => {
  test('calculates sides × runs_per_side', () => {
    expect(totalRuns(toml)).toBe(6) // 2 sides × 3 runs
  })
})
