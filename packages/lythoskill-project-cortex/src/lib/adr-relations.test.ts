#!/usr/bin/env bun
/**
 * adr-relations.test.ts — 取代关系写进 frontmatter(两侧)
 * Run: bun test packages/lythoskill-project-cortex/src/lib/adr-relations.test.ts
 */
import { describe, it, expect } from 'bun:test'
import { parseRelations, setSupersededBy, addSupersedes } from './adr-relations.ts'

const PLAIN = `# ADR-1: t\n\n## Status History\n\n| Status | Date | Note |\n`

describe('parseRelations', () => {
  it('no frontmatter → empty relations (does not throw)', () => {
    expect(parseRelations(PLAIN)).toEqual({ supersedes: [], supersededBy: null, epic: null, tasks: [] })
  })
  it('reads both fields, treats null/~/missing as none', () => {
    expect(parseRelations('---\nsupersedes: [ADR-a, ADR-b]\nsuperseded_by: ADR-c\n---\n# x\n'))
      .toEqual({ supersedes: ['ADR-a', 'ADR-b'], supersededBy: 'ADR-c', epic: null, tasks: [] })
    expect(parseRelations('---\nsupersedes: []\nsuperseded_by: null\n---\n# x\n'))
      .toEqual({ supersedes: [], supersededBy: null, epic: null, tasks: [] })
    expect(parseRelations('---\nsupersedes: []\n---\n# x\n')).toEqual({ supersedes: [], supersededBy: null, epic: null, tasks: [] })
  })
})

describe('parseRelations — epic / tasks(与 task 的机器可读关联)', () => {
  it('reads epic and tasks; null/empty mean none', () => {
    expect(parseRelations('---\nsupersedes: []\nsuperseded_by: null\nepic: EPIC-1\ntasks: [TASK-a, TASK-b]\n---\n# x\n'))
      .toEqual({ supersedes: [], supersededBy: null, epic: 'EPIC-1', tasks: ['TASK-a', 'TASK-b'] })
    expect(parseRelations('---\nepic: null\ntasks: []\n---\n# x\n').epic).toBe(null)
  })

  it('a hand-written file keeps epic/tasks when the supersession side changes', () => {
    const src = '---\nsupersedes: []\nsuperseded_by: null\nepic: EPIC-9\ntasks: [TASK-x]\n---\n# y\n'
    const out = setSupersededBy(src, 'ADR-9')
    expect(parseRelations(out)).toEqual({ supersedes: [], supersededBy: 'ADR-9', epic: 'EPIC-9', tasks: ['TASK-x'] })
  })
})

describe('setSupersededBy / addSupersedes', () => {
  it('adds frontmatter to a file that had none, without touching the body', () => {
    const out = setSupersededBy(PLAIN, 'ADR-2')
    expect(out).toContain('superseded_by: ADR-2')
    expect(out).toContain('# ADR-1: t')
    expect(parseRelations(out).supersededBy).toBe('ADR-2')
  })
  it('the reverse side accumulates, and repeats do not duplicate', () => {
    let s = addSupersedes(PLAIN, 'ADR-old')
    s = addSupersedes(s, 'ADR-older')
    s = addSupersedes(s, 'ADR-old')
    expect(parseRelations(s).supersedes).toEqual(['ADR-old', 'ADR-older'])
  })
  it('setting one side does not clear the other', () => {
    let s = addSupersedes(PLAIN, 'ADR-old')
    s = setSupersededBy(s, 'ADR-new')
    expect(parseRelations(s)).toEqual({ supersedes: ['ADR-old'], supersededBy: 'ADR-new', epic: null, tasks: [] })
  })
})
