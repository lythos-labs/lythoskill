/**
 * Git-native content hash helpers.
 *
 * Per ADR-20260507143241493: use git's own hash mechanism instead of
 * custom SHA-256. Pure functions with injectable IO for testability.
 */

import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

export interface GitHashIO {
  /** Run a git command and return trimmed stdout. */
  execGit(args: string[], opts: { cwd: string }): string
}

const defaultIO: GitHashIO = {
  execGit(args, opts) {
    return execFileSync('git', args, { cwd: opts.cwd, encoding: 'utf-8' }).trim()
  },
}

function ioOrDefault(io?: GitHashIO): GitHashIO {
  return io ?? defaultIO
}

/**
 * Get the current HEAD commit hash of a repo.
 *
 *   git -C <repoDir> rev-parse HEAD
 */
export function getRepoHeadRef(repoDir: string, io?: GitHashIO): string {
  return ioOrDefault(io).execGit(['-C', repoDir, 'rev-parse', 'HEAD'], { cwd: repoDir })
}

/**
 * Get the git blob hash of a skill's SKILL.md file.
 *
 *   git -C <repoDir> hash-object <skillSubpath>/SKILL.md
 *
 * This reads the working tree file and computes its blob hash without
 * writing to the object store (no `-w` flag).
 */
export function getSkillBlobHash(repoDir: string, skillSubpath: string, io?: GitHashIO): string {
  const path = skillSubpath ? `${skillSubpath}/SKILL.md` : 'SKILL.md'
  return ioOrDefault(io).execGit(['-C', repoDir, 'hash-object', path], { cwd: repoDir })
}

/**
 * Compute SHA-256 of a SKILL.md file.
 *
 * Independent of git — uses node:crypto directly.
 * This is the canonical content_hash stored in skill-deck.lock
 * and the metadata DB (repos table).
 */
export function hashSkillMd(skillMdPath: string): string {
  return createHash('sha256').update(readFileSync(skillMdPath, 'utf-8')).digest('hex')
}

/**
 * Get the tree hash of a skill subdirectory.
 *
 *   git -C <repoDir> ls-tree HEAD <skillSubpath>
 *
 * Returns the tree hash (covers all files in the skill directory).
 * More stable than blob hash if skill has multiple files.
 */
export function getSkillTreeHash(repoDir: string, skillSubpath: string, io?: GitHashIO): string {
  const output = ioOrDefault(io).execGit(['-C', repoDir, 'ls-tree', 'HEAD', skillSubpath || '.'], { cwd: repoDir })
  // Output: "<mode> <type> <hash>\t<path>"
  // e.g. "040000 tree e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855\tskills/pdf"
  const hash = output.split(/\s+/)[2]
  if (!hash) throw new Error(`Could not parse tree hash from: ${output}`)
  return hash
}
