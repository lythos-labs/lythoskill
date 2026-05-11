/**
 * GitHub naming convention validators — guard layer for locator parsing.
 *
 * Rejects inputs that violate GitHub's published naming rules before they
 * reach git operations. Practical security over theoretical compatibility:
 * we target GitHub-hosted skills; inputs that GitHub itself would reject
 * should not reach git clone/checkout.
 *
 * Reference: playground/github-user-repo-validation.txt
 * Design: multi-guard (卫语句) over monster regex — each rule is independently
 * readable, maintainable, and produces specific error messages.
 */

// ── Username (Owner) ─────────────────────────────────────────────────

const RESERVED_USERNAMES = new Set([
  'admin', 'support', 'help', 'about', 'pricing',
  'api', 'www', 'mail', 'ftp', 'smtp', 'imap',
  'signup', 'login', 'logout', 'settings',
  'dashboard', 'explore', 'trending', 'collections',
  'topics', 'marketplace', 'security', 'insights',
  'github', 'git', 'null', 'undefined', 'new',
  'notifications', 'sessions', 'oauth', 'enterprise',
  'features', 'team', 'teams', 'organizations',
  'users', 'repos', 'search', 'gist', 'gists',
  'blog', 'downloads', 'contact', 'jobs', 'issues',
  'pulls', 'commits', 'branches', 'releases',
  'tags', 'labels', 'milestones', 'wiki', 'graphs',
])

export interface NameResult {
  valid: boolean
  errors: string[]
}

export function validateGitHubOwner(owner: string): NameResult {
  const errors: string[] = []

  if (!owner || owner.length === 0) {
    errors.push('owner cannot be empty')
    return { valid: false, errors }
  }

  if (owner.length > 39) {
    errors.push(`owner "${owner}" exceeds 39 characters (${owner.length})`)
  }

  if (!/^[a-zA-Z0-9-]+$/.test(owner)) {
    errors.push(`owner "${owner}" contains invalid characters (only a-z, A-Z, 0-9, - allowed)`)
  }

  if (owner.startsWith('-')) {
    errors.push(`owner "${owner}" cannot start with hyphen`)
  }

  if (owner.endsWith('-')) {
    errors.push(`owner "${owner}" cannot end with hyphen`)
  }

  if (owner.includes('--')) {
    errors.push(`owner "${owner}" cannot contain consecutive hyphens`)
  }

  if (RESERVED_USERNAMES.has(owner.toLowerCase())) {
    errors.push(`"${owner}" is a reserved GitHub username`)
  }

  return { valid: errors.length === 0, errors }
}

// ── Repository Name ──────────────────────────────────────────────────

export function validateGitHubRepo(repo: string): NameResult {
  const errors: string[] = []

  if (!repo || repo.length === 0) {
    errors.push('repo cannot be empty')
    return { valid: false, errors }
  }

  if (repo.length > 100) {
    errors.push(`repo "${repo}" exceeds 100 characters (${repo.length})`)
  }

  if (!/^[a-zA-Z0-9._-]+$/.test(repo)) {
    errors.push(`repo "${repo}" contains invalid characters (only a-z, A-Z, 0-9, ., _, - allowed)`)
  }

  if (repo === '.' || repo === '..') {
    errors.push('repo cannot be "." or ".."')
  }

  if (repo.toLowerCase().endsWith('.git')) {
    errors.push(`repo "${repo}" cannot end with ".git"`)
  }

  return { valid: errors.length === 0, errors }
}

// ── Directory / Skill Path Segment ───────────────────────────────────

export function validateSkillSegment(segment: string): NameResult {
  const errors: string[] = []

  if (!segment || segment.length === 0) {
    errors.push('directory segment cannot be empty')
    return { valid: false, errors }
  }

  if (segment.startsWith('.')) {
    errors.push(`directory "${segment}" cannot start with "." (hidden dir)`)
  }

  if (segment.endsWith('.lock')) {
    errors.push(`directory "${segment}" cannot end with ".lock" (Git reserved)`)
  }

  if (segment.includes('..')) {
    errors.push(`directory "${segment}" cannot contain ".."`)
  }

  if (segment.includes('@{')) {
    errors.push(`directory "${segment}" cannot contain "@{" (Git syntax conflict)`)
  }

  if (/[\\/:*?"<>|]/.test(segment)) {
    errors.push(`directory "${segment}" contains OS-forbidden characters`)
  }

  if (/[\x00-\x1f]/.test(segment)) {
    errors.push(`directory "${segment}" contains control characters`)
  }

  if (segment === '@') {
    errors.push('directory cannot be "@"')
  }

  return { valid: errors.length === 0, errors }
}
