import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export interface MockSkill {
  frontmatter: Record<string, unknown>
  body?: string
}

export function createSkillDir(
  base: string,
  name: string,
  frontmatter: Record<string, unknown>,
  body = '# Skill Body\n'
) {
  const dir = join(base, name)
  mkdirSync(dir, { recursive: true })
  const fmLines = Object.entries(frontmatter)
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join('\n')
  writeFileSync(join(dir, 'SKILL.md'), `---\n${fmLines}\n---\n\n${body}`)
  return dir
}

export function createColdPool(
  base: string,
  skills: Record<string, MockSkill>
) {
  for (const [name, { frontmatter, body }] of Object.entries(skills)) {
    createSkillDir(base, name, frontmatter, body)
  }
  return base
}
