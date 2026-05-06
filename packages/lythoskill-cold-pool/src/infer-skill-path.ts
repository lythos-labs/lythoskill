/**
 * Pure scan of a tree response for SKILL.md candidates.
 *
 * Used by validation when a locator's expected skill subpath does not
 * resolve, or when no skill subpath was given (standalone or ambiguous).
 */
import type { TreeEntry } from './github-tree.js'

export interface InferenceResult {
  /** Directories within the repo that contain a SKILL.md (relative to repo root). Empty string = repo root. */
  readonly candidates: ReadonlyArray<string>
  /** When `expectedSubpath` is given: the matching candidate, if exact. */
  readonly exactMatch: string | null
}

/**
 * Scan a flat tree listing for paths ending in `SKILL.md`. Returns the
 * containing directory paths (relative to repo root). When
 * `expectedSubpath` is given, also reports whether an exact match exists.
 */
export function inferSkillPath(
  entries: ReadonlyArray<TreeEntry>,
  expectedSubpath?: string | null,
): InferenceResult {
  const candidates: string[] = []
  for (const e of entries) {
    if (e.type !== 'blob') continue
    if (e.path === 'SKILL.md') {
      candidates.push('')
      continue
    }
    if (e.path.endsWith('/SKILL.md')) {
      candidates.push(e.path.slice(0, -'/SKILL.md'.length))
    }
  }

  if (!expectedSubpath) {
    return { candidates, exactMatch: null }
  }

  const exactMatch = candidates.includes(expectedSubpath) ? expectedSubpath : null
  return { candidates, exactMatch }
}
