import { describe, expect, it } from 'bun:test'
import { inferSkillPath } from './infer-skill-path'
import type { TreeEntry } from './github-tree'

const blob = (path: string): TreeEntry => ({ path, type: 'blob', sha: 'x' })
const tree = (path: string): TreeEntry => ({ path, type: 'tree', sha: 'x' })

describe('inferSkillPath', () => {
  it('repo-root SKILL.md → "" candidate', () => {
    const r = inferSkillPath([blob('SKILL.md'), blob('README.md')])
    expect(r.candidates).toEqual([''])
    expect(r.exactMatch).toBeNull()
  })

  it('monorepo with multiple skills', () => {
    const r = inferSkillPath([
      blob('skills/pdf/SKILL.md'),
      blob('skills/pdf/script.py'),
      blob('skills/excel/SKILL.md'),
      tree('skills/empty'),
    ])
    expect(r.candidates.sort()).toEqual(['skills/excel', 'skills/pdf'])
  })

  it('flat repo (root-level skill dirs)', () => {
    const r = inferSkillPath([
      blob('skill-creator/SKILL.md'),
      blob('competitors-analysis/SKILL.md'),
      blob('README.md'),
    ])
    expect(r.candidates.sort()).toEqual(['competitors-analysis', 'skill-creator'])
  })

  it('nested monorepo (skills/category/skill)', () => {
    const r = inferSkillPath([
      blob('skills/engineering/tdd/SKILL.md'),
      blob('skills/engineering/diagnose/SKILL.md'),
    ])
    expect(r.candidates.sort()).toEqual(['skills/engineering/diagnose', 'skills/engineering/tdd'])
  })

  it('exactMatch reflects expectedSubpath when present', () => {
    const r = inferSkillPath(
      [blob('skills/pdf/SKILL.md'), blob('skills/excel/SKILL.md')],
      'skills/pdf',
    )
    expect(r.exactMatch).toBe('skills/pdf')
  })

  it('exactMatch is null when expectedSubpath is wrong', () => {
    const r = inferSkillPath(
      [blob('skills/pdf/SKILL.md')],
      'pdf', // missing the skills/ prefix
    )
    expect(r.exactMatch).toBeNull()
    expect(r.candidates).toEqual(['skills/pdf'])
  })

  it('tree-type entries are ignored (only blobs counted)', () => {
    const r = inferSkillPath([
      tree('SKILL.md'),       // not a real file (tree, not blob)
      blob('skills/x/SKILL.md'),
    ])
    expect(r.candidates).toEqual(['skills/x'])
  })

  it('empty entries → empty candidates', () => {
    const r = inferSkillPath([])
    expect(r.candidates).toEqual([])
    expect(r.exactMatch).toBeNull()
  })
})
