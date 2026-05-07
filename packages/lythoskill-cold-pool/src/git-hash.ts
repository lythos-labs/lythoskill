import { simpleGit, type SimpleGit } from 'simple-git'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

function git(repoDir: string): SimpleGit {
  return simpleGit(repoDir)
}

export async function getRepoHeadRef(repoDir: string): Promise<string> {
  return (await git(repoDir).revparse(['HEAD'])).trim()
}

export async function getSkillBlobHash(repoDir: string, skillSubpath: string): Promise<string> {
  const path = skillSubpath ? `${skillSubpath}/SKILL.md` : 'SKILL.md'
  return (await git(repoDir).raw(['hash-object', path])).trim()
}

export function hashSkillMd(skillMdPath: string): string {
  return createHash('sha256').update(readFileSync(skillMdPath, 'utf-8')).digest('hex')
}

export async function getSkillTreeHash(repoDir: string, skillSubpath: string): Promise<string> {
  const output = (await git(repoDir).raw(['ls-tree', 'HEAD', skillSubpath || '.'])).trim()
  const hash = output.split(/\s+/)[2]
  if (!hash) throw new Error(`Could not parse tree hash from: ${output}`)
  return hash
}
