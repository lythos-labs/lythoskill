import { describe, test, expect } from 'bun:test'
import { computePareto } from './comparative-judge'

describe('computePareto', () => {
  test('single participant is always non-dominated', () => {
    const result = computePareto([
      { participant_id: 'run-01', scores: { a: 5, b: 3 } },
    ])
    expect(result).toHaveLength(1)
    expect(result[0].dominated).toBe(false)
    expect(result[0].dominated_by).toEqual([])
  })

  test('clear dominance: run-01 dominates run-02 on all criteria', () => {
    const result = computePareto([
      { participant_id: 'run-01', scores: { coverage: 5, relevance: 5 } },
      { participant_id: 'run-02', scores: { coverage: 3, relevance: 2 } },
    ])
    expect(result[0].dominated).toBe(false)
    expect(result[1].dominated).toBe(true)
    expect(result[1].dominated_by).toEqual(['run-01'])
  })

  test('equal scores: no one dominates', () => {
    const result = computePareto([
      { participant_id: 'run-01', scores: { a: 4, b: 4 } },
      { participant_id: 'run-02', scores: { a: 4, b: 4 } },
    ])
    expect(result[0].dominated).toBe(false)
    expect(result[1].dominated).toBe(false)
  })

  test('cross dominance: each wins on different criteria', () => {
    const result = computePareto([
      { participant_id: 'run-01', scores: { speed: 5, accuracy: 2 } },
      { participant_id: 'run-02', scores: { speed: 2, accuracy: 5 } },
    ])
    // Neither dominates: run-01 better on speed but worse on accuracy
    expect(result[0].dominated).toBe(false)
    expect(result[1].dominated).toBe(false)
  })

  test('multi-participant: transitive dominance chain', () => {
    const result = computePareto([
      { participant_id: 'best', scores: { a: 5, b: 5, c: 5 } },
      { participant_id: 'mid', scores: { a: 4, b: 4, c: 4 } },
      { participant_id: 'worst', scores: { a: 2, b: 2, c: 2 } },
    ])
    // best dominates both, mid dominates worst
    expect(result[0].dominated).toBe(false) // best
    expect(result[1].dominated).toBe(true)  // mid (by best)
    expect(result[1].dominated_by).toEqual(['best'])
    expect(result[2].dominated).toBe(true)  // worst (by both)
    expect(result[2].dominated_by.sort()).toEqual(['best', 'mid'].sort())
  })

  test('Pareto frontier from playground BDD-research: run-01 dominates run-02', () => {
    // From playground/arena-bdd-research/report.md:
    // Run-01: coverage=5, relevance=5, actionability=5, depth=5
    // Run-02: coverage=3, relevance=2, actionability=2, depth=1
    const result = computePareto([
      { participant_id: 'run-01', scores: { coverage: 5, relevance: 5, actionability: 5, depth: 5 } },
      { participant_id: 'run-02', scores: { coverage: 3, relevance: 2, actionability: 2, depth: 1 } },
    ])
    expect(result[0].dominated).toBe(false) // run-01: Pareto-optimal
    expect(result[1].dominated).toBe(true)  // run-02: dominated by run-01
    expect(result[1].dominated_by).toEqual(['run-01'])
  })

  test('empty scores object', () => {
    const result = computePareto([
      { participant_id: 'a', scores: {} },
      { participant_id: 'b', scores: {} },
    ])
    expect(result).toHaveLength(2)
    expect(result[0].dominated).toBe(false)
    expect(result[1].dominated).toBe(false)
  })

  test('partial criteria overlap', () => {
    const result = computePareto([
      { participant_id: 'run-01', scores: { a: 5, b: 3 } },
      { participant_id: 'run-02', scores: { a: 3, c: 5 } },
    ])
    // run-01 has a=5 vs run-02 a=3 (a wins)
    // run-02 has b=undefined vs run-01 b=3 → treated as 0. So run-01 >= run-02 on all shared crit, > on one.
    // But c: run-01 has 0, run-02 has 5. So run-02 > run-01 on c.
    // Cross-dominance → neither dominates
    expect(result[0].dominated).toBe(false)
    expect(result[1].dominated).toBe(false)
  })
})
