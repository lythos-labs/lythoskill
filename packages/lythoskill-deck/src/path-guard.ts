/**
 * path-guard — Centralized path traversal prevention for deck CLI.
 *
 * All alias validation and safe-path construction MUST go through these
 * functions. Individual commands (link, remove, to-symlink-snapshot, add)
 * must NOT sanitize aliases or resolve paths by hand.
 *
 * Reference: CWE-22 (Path Traversal), OWASP A01:2021
 */

import { resolve } from 'node:path'
import { realpathSync, existsSync } from 'node:fs'

/**
 * Characters allowed in skill aliases.
 *
 * Allow-list (not block-list): alphanumeric + hyphens + underscores only.
 * Rejecting '.' '/' '\\' prevents traversal. Rejecting '..' explicitly
 * prevents parent-directory escapes even if a '.' were to slip through.
 */
const ALIAS_ALLOWED = /^[A-Za-z0-9_-]+$/
const ALIAS_MAX_LENGTH = 128

/**
 * Validate a skill alias. Returns the alias unchanged if valid, throws otherwise.
 *
 * Aliases serve as directory names in the working set (.claude/skills/<alias>/).
 * They must be simple names — no path separators, no dots, no special chars.
 */
export function validateAlias(alias: string): string {
  if (!alias || alias.length === 0) {
    throw new Error(`Alias must not be empty`)
  }
  if (alias.length > ALIAS_MAX_LENGTH) {
    throw new Error(`Alias too long (max ${ALIAS_MAX_LENGTH} chars): ${alias.slice(0, 50)}...`)
  }
  if (!ALIAS_ALLOWED.test(alias)) {
    throw new Error(
      `Invalid alias "${alias}". Aliases may only contain letters, numbers, hyphens, and underscores. ` +
      `No dots, slashes, or special characters.`
    )
  }
  return alias
}

/**
 * Resolve a path segment within a root directory, rejecting traversals.
 *
 * Steps:
 * 1. Resolve root + segment to absolute path
 * 2. If root exists on disk, resolve symlinks (realpath) for both
 * 3. Verify the resolved path stays within the resolved root
 */
export function safeResolveInDir(root: string, segment: string): string {
  // Pre-check: reject segments that are obviously malicious before resolve()
  if (segment.includes('\0')) {
    throw new Error('Path segment contains null byte')
  }
  if (segment.includes('..')) {
    throw new Error('Path segment contains parent traversal (..)')
  }
  if (segment.startsWith('/') || /^[A-Za-z]:/.test(segment)) {
    throw new Error('Path segment is absolute')
  }

  const resolved = resolve(root, segment)

  // If root exists, use realpath for symlink-aware boundary check
  if (existsSync(root)) {
    const realRoot = realpathSync(root)
    let realPath: string
    try {
      realPath = realpathSync(resolved)
    } catch {
      // Path doesn't exist yet (e.g. mkdir first) — resolve is sufficient
      // since we already rejected '../' and absolute paths
      if (!resolved.startsWith(resolve(root) + '/') && resolved !== resolve(root)) {
        throw new Error(`Path traversal blocked: ${segment} resolves outside ${root}`)
      }
      return resolved
    }
    if (!realPath.startsWith(realRoot + '/') && realPath !== realRoot) {
      throw new Error(`Path traversal blocked: ${segment} resolves outside ${root}`)
    }
    return realPath
  }

  // Root doesn't exist yet — trust resolve() since we pre-checked segments
  return resolved
}

/**
 * Verify a working_set directory is safe for deck operations.
 *
 * The working set is where deck creates/removes symlinks and snapshots.
 * It must not be a system-critical path.
 */
const FORBIDDEN_ROOTS = new Set([
  '/', '/home', '/etc', '/usr', '/bin', '/sbin', '/lib', '/lib64',
  '/var', '/tmp', '/opt', '/root', '/boot', '/dev', '/proc', '/sys',
  '/System', '/Applications', '/Library',  // macOS
])

export function validateWorkingSet(workingSet: string, projectDir: string): void {
  const resolved = resolve(workingSet)

  if (FORBIDDEN_ROOTS.has(resolved)) {
    throw new Error(
      `working_set "${workingSet}" resolves to a forbidden system path "${resolved}". ` +
      `The working set must be inside the project or under a dedicated agents directory.`
    )
  }

  // It must be under the project, OR be a hidden directory (.claude/skills, .agents/skills, etc.)
  const resolvedProject = resolve(projectDir)
  if (resolved.startsWith(resolvedProject + '/')) return

  // Outside project — OK only if it's a hidden dir (agent convention)
  const basename = resolved.split('/').pop()!
  if (!basename.startsWith('.')) {
    throw new Error(
      `working_set "${workingSet}" is outside the project and not a hidden directory. ` +
      `Agent skill directories should start with '.' (e.g. .claude/skills, .agents/skills).`
    )
  }
}

// ── Re-exports for convenience ───────────────────────────

export { ALIAS_ALLOWED, ALIAS_MAX_LENGTH }
