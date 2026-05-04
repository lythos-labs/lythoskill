import { describe, test, expect } from 'bun:test'
import { aggregateSideStats, aggregateAllStats } from './stats'
import type { JudgeVerdict } from '@lythos/test-utils/schema'

function makeVerdict(overrides?: Partial<JudgeVerdict>): JudgeVerdict {
  return {
    verdict: 'PASS',
    reason: 'OK',
    criteria: [{ name: 'correctness', passed: true }],
    ...overrides,
  }
}

// ── aggregateSideStats ─────────────────────────────────────────────────────

describe('aggregateSideStats', () => {
  test('single run: passRate=1, no variance', () => {
    const stats = aggregateSideStats('test', [makeVerdict()])
    expect(stats.sideName).toBe('test')
    expect(stats.runs).toBe(1)
    expect(stats.passRate).toBe(1)
    expect(stats.failRate).toBe(0)
    expect(stats.errorRate).toBe(0)
  })

  test('3 runs: 2 PASS, 1 FAIL', () => {
    const verdicts = [
      makeVerdict(),
      makeVerdict(),
      makeVerdict({ verdict: 'FAIL', reason: 'bad' }),
    ]
    const stats = aggregateSideStats('test', verdicts)
    expect(stats.passRate).toBeCloseTo(2 / 3)
    expect(stats.failRate).toBeCloseTo(1 / 3)
  })

  test('confidence: mean across runs', () => {
    const verdicts = [
      makeVerdict({ confidence: 90 }),
      makeVerdict({ confidence: 80 }),
      makeVerdict({ confidence: 70 }),
    ]
    const stats = aggregateSideStats('test', verdicts)
    expect(stats.meanConfidence).toBeCloseTo(80)
    expect(stats.confidenceVariance).toBeCloseTo(100) // (100+0+100)/2 = 100
  })

  test('confidence: null when no verdict has it', () => {
    const stats = aggregateSideStats('test', [makeVerdict(), makeVerdict()])
    expect(stats.meanConfidence).toBeNull()
    expect(stats.confidenceVariance).toBeNull()
  })

  test('per-criterion pass rate', () => {
    const verdicts = [
      makeVerdict({ criteria: [{ name: 'accuracy', passed: true }] }),
      makeVerdict({ criteria: [{ name: 'accuracy', passed: false }] }),
      makeVerdict({ criteria: [{ name: 'accuracy', passed: true }] }),
    ]
    const stats = aggregateSideStats('test', verdicts)
    expect(stats.criteria).toHaveLength(1)
    expect(stats.criteria[0].name).toBe('accuracy')
    expect(stats.criteria[0].mean).toBeCloseTo(2 / 3)
  })

  test('per-criterion scores: mean and variance', () => {
    const verdicts = [
      makeVerdict({ scores: { coverage: 5, relevance: 4 } }),
      makeVerdict({ scores: { coverage: 3, relevance: 4 } }),
      makeVerdict({ scores: { coverage: 4, relevance: 4 } }),
    ]
    const stats = aggregateSideStats('test', verdicts)
    expect(stats.scoreByCriterion.coverage.mean).toBeCloseTo(4)
    expect(stats.scoreByCriterion.relevance.mean).toBeCloseTo(4)
    expect(stats.scoreByCriterion.relevance.variance).toBe(0) // all 4s
  })

  test('zero runs: all zeros', () => {
    const stats = aggregateSideStats('empty', [])
    expect(stats.runs).toBe(0)
    expect(stats.passRate).toBe(0)
    expect(stats.meanConfidence).toBeNull()
  })

  test('handles ERROR verdicts correctly', () => {
    const verdicts = [
      makeVerdict(),
      makeVerdict({ verdict: 'ERROR', reason: 'parse failed' }),
    ]
    const stats = aggregateSideStats('test', verdicts)
    expect(stats.passRate).toBe(0.5)
    expect(stats.errorRate).toBe(0.5)
  })
})

// ── aggregateAllStats ──────────────────────────────────────────────────────

describe('aggregateAllStats', () => {
  test('aggregates multiple sides', () => {
    const map = new Map<string, JudgeVerdict[]>()
    map.set('side-a', [makeVerdict(), makeVerdict()])
    map.set('side-b', [makeVerdict({ verdict: 'FAIL', reason: 'nope' })])

    const stats = aggregateAllStats(map)
    expect(stats).toHaveLength(2)
    expect(stats[0].sideName).toBe('side-a')
    expect(stats[0].passRate).toBe(1)
    expect(stats[1].sideName).toBe('side-b')
    expect(stats[1].passRate).toBe(0)
  })
})
