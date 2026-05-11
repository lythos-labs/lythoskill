/**
 * FQ-only locator parser, per ADR-20260502012643244.
 *
 * Three accepted forms (everything else returns null):
 *   - `host.tld/owner/repo[/skill]`        — remote skill
 *   - `host.tld/owner/repo[/skill]#ref`    — remote skill at branch/tag/commit
 *   - `host.tld/owner/repo`                — remote standalone (skill = null)
 *   - `localhost/owner/repo[/skill]`       — local skill, same shape as remote
 *
 * The locator is a path. Appending it to the cold-pool base dir gives an
 * existing directory; SKILL.md inside is the skill content. No special-case
 * for localhost — only difference is `host === 'localhost'` signals "no
 * remote, no clone, no refresh".
 *
 * Single-name `localhost/<name>` is rejected — that's a post-compaction
 * agent invention, not the canonical form.
 *
 * `#ref` suffix (branch/tag/commit) is compatible with skills.sh's
 * `parseFragmentRef`. The ref is passed to gitClone for checkout.
 */
import type { Locator } from './types.js'

export function parseLocator(input: string): Locator | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  // Extract #ref suffix (branch/tag/commit)
  let ref: string | null = null
  let pathPart = trimmed
  const hashIdx = trimmed.indexOf('#')
  if (hashIdx >= 0) {
    pathPart = trimmed.slice(0, hashIdx)
    ref = trimmed.slice(hashIdx + 1) || null
    // Reject refs that look like git option injection or path traversal
    if (ref && (ref.startsWith('-') || ref.includes('..'))) {
      return null
    }
  }

  const parts = pathPart.split('/')
  // Reject empty segments (double slashes) and path traversal
  if (parts.some(p => p === '' || p === '..' || p === '.')) return null
  // Need at least host/owner/repo (3 segments) for any FQ form
  if (parts.length < 3) return null

  // host segment: must be `localhost` (literal) or contain a `.` (host.tld)
  const isLocalhost = parts[0] === 'localhost'
  if (!isLocalhost && !parts[0].includes('.')) return null

  return {
    raw: input,
    host: parts[0],
    owner: parts[1],
    repo: parts[2],
    skill: parts.length > 3 ? parts.slice(3).join('/') : null,
    ref,
    isLocalhost,
  }
}

/** Recompose an FQ locator string from a parsed `Locator`. */
export function formatLocator(locator: Locator): string {
  const base = `${locator.host}/${locator.owner}/${locator.repo}`
  const withSkill = locator.skill ? `${base}/${locator.skill}` : base
  return locator.ref ? `${withSkill}#${locator.ref}` : withSkill
}
