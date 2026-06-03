import { simpleGit, type SimpleGit } from 'simple-git'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

// ── Pure functions (L0-testable, no git, no fs) ─────────────────

/** Parse `git ls-tree` output line. Takes the third whitespace-separated field (the hash). */
export function parseTreeHash(lsTreeOutput: string): string {
  const trimmed = lsTreeOutput.trim()
  if (!trimmed) throw new Error('Empty ls-tree output')
  const hash = trimmed.split(/\s+/)[2]
  if (!hash) throw new Error(`Could not parse tree hash from: ${trimmed}`)
  return hash
}

/** Compute SHA-256 of raw content. Content-addressable, provider-agnostic. */
export function computeSha256(content: string): string {
  return createHash('sha256').update(content, 'utf-8').digest('hex')
}

/** Build the skill path for git blob/tree operations. */
export function buildSkillPath(skillSubpath: string): string {
  return skillSubpath ? `${skillSubpath}/SKILL.md` : 'SKILL.md'
}

// ── IO wrappers (thin — call git/fs, delegate to pure functions) ─

function git(repoDir: string): SimpleGit {
  return simpleGit(repoDir)
}

export async function getRepoHeadRef(repoDir: string): Promise<string> {
  return (await git(repoDir).revparse(['HEAD'])).trim()
}

export async function getSkillBlobHash(repoDir: string, skillSubpath: string): Promise<string> {
  return (await git(repoDir).raw(['hash-object', buildSkillPath(skillSubpath)])).trim()
}

export function hashSkillMd(skillMdPath: string): string {
  return computeSha256(readFileSync(skillMdPath, 'utf-8'))
}

export async function getSkillTreeHash(repoDir: string, skillSubpath: string): Promise<string> {
  const output = (await git(repoDir).raw(['ls-tree', 'HEAD', skillSubpath || '.'])).trim()
  return parseTreeHash(output)
}
