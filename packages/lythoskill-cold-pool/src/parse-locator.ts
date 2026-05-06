/**
 * FQ-only locator parser, per ADR-20260502012643244.
 *
 * Three accepted forms (everything else returns null):
 *   - `host.tld/owner/repo[/skill]`
 *   - `host.tld/owner/repo`
 *   - `localhost/<name>`
 */
import type { Locator } from './types.js'

export function parseLocator(input: string): Locator | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  const parts = trimmed.split('/').filter(Boolean)
  if (parts.length < 2) return null

  if (parts[0] === 'localhost') {
    if (parts.length !== 2) return null
    return {
      raw: input,
      host: 'localhost',
      owner: null,
      repo: null,
      skill: parts[1],
      isLocalhost: true,
    }
  }

  if (!parts[0].includes('.')) return null
  if (parts.length < 3) return null

  return {
    raw: input,
    host: parts[0],
    owner: parts[1],
    repo: parts[2],
    skill: parts.length > 3 ? parts.slice(3).join('/') : null,
    isLocalhost: false,
  }
}

/** Recompose an FQ locator string from a parsed `Locator`. */
export function formatLocator(locator: Locator): string {
  if (locator.isLocalhost) {
    return `${locator.host}/${locator.skill ?? ''}`
  }
  const base = `${locator.host}/${locator.owner}/${locator.repo}`
  return locator.skill ? `${base}/${locator.skill}` : base
}
