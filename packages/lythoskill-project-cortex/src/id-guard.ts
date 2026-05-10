/**
 * id-guard — ID generation, matching, and collision prevention for cortex.
 *
 * All cortex document ID operations MUST go through these functions.
 * Individual commands (move, list, probe, generate-index) must NOT
 * parse or match IDs by hand.
 *
 * Reference: cortex sweep 2026-05-10 — P1 ID ambiguity findings
 */

import { existsSync, readdirSync } from "node:fs"
import { join } from "node:path"

// TASK-yyyyMMddHHmmssSSS (3-digit ms) — 17 digits after prefix
const ID_PATTERN = /^(TASK|EPIC|ADR|WIKI)-(\d{17})(?:-(.+))?$/

// Slug-safe characters (for filename suffix after ID)
const SLUG_SAFE = /^[a-z0-9_-]+$/

export interface ParsedId {
  prefix: "TASK" | "EPIC" | "ADR" | "WIKI"
  timestamp: string       // 17-digit yyyyMMddHHmmssSSS
  slug: string | null     // optional human-readable suffix
}

export function parseId(raw: string): ParsedId | null {
  const m = raw.match(ID_PATTERN)
  if (!m) return null
  return {
    prefix: m[1] as ParsedId["prefix"],
    timestamp: m[2],
    slug: m[3] || null,
  }
}

/**
 * Generate a unique ID with collision check.
 *
 * If a file with the same 17-digit timestamp already exists in the target
 * directory, appends a counter suffix (e.g. TASK-20260510233000000-2).
 *
 * This is a pragmatic guard — millisecond collisions are astronomically
 * improbable in single-agent scenarios, but the check costs <1ms and
 * makes the system self-healing.
 */
export function generateId(
  prefix: "TASK" | "EPIC" | "ADR" | "WIKI",
  slug: string,
  targetDir: string,
): string {
  if (!SLUG_SAFE.test(slug)) {
    throw new Error(
      `Invalid slug "${slug}". Slugs may only contain lowercase letters, numbers, hyphens, and underscores.`
    )
  }

  const now = new Date()
  const ts = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
    String(now.getMilliseconds()).padStart(3, "0"),
  ].join("")

  const baseId = `${prefix}-${ts}`
  const baseFile = `${baseId}-${slug}.md`

  // Fast path: no collision
  if (!existsSync(join(targetDir, baseFile))) {
    return baseId
  }

  // Collision: find next available counter
  let counter = 2
  const existingFiles = new Set(
    readdirSync(targetDir).filter(f => f.startsWith(baseId))
  )
  while (existingFiles.has(`${baseId}-${counter}-${slug}.md`)) {
    counter++
  }
  return `${baseId}-${counter}`
}

/**
 * Find a document by its ID prefix (exact match, not substring).
 *
 * Replaces the old `entry.name.includes(searchId)` partial-match pattern
 * that could match TASK-xxx against TASK-xxxxx or TASK-xxx-extra.
 */
export function findDocById(
  dir: string,
  idPrefix: string,
): string | null {
  const parsed = parseId(idPrefix)
  if (!parsed) return null

  // Build the exact prefix to match: "TASK-20260510233000000"
  const exactPrefix = `${parsed.prefix}-${parsed.timestamp}`

  try {
    const entries = readdirSync(dir)
    for (const entry of entries) {
      // Must start with exact prefix followed by '-' or '.'
      if (entry.startsWith(exactPrefix) && (
        entry[exactPrefix.length] === '-' || entry[exactPrefix.length] === '.'
      )) {
        return join(dir, entry)
      }
    }
  } catch {
    // Directory doesn't exist — no match
  }
  return null
}

/**
 * Extract all IDs from a commit message for trailer matching.
 *
 * Matches "Closes: TASK-20260510233000000", "Task: TASK-xxx review",
 * "ADR: ADR-20260510233000000 accept", etc.
 */
export function extractTrailerIds(
  message: string,
): Array<{ trailer: string; id: string }> {
  const trailerRe = /^(Closes|Task|ADR|Epic):\s*(TASK|EPIC|ADR|WIKI)-\d{17}(?:-\S+)?/gim
  const results: Array<{ trailer: string; id: string }> = []
  for (const m of message.matchAll(trailerRe)) {
    results.push({ trailer: m[1], id: m[2] + m[0].split(m[2])[1] })
  }
  return results
}

// ── Re-exports ────────────────────────────────────────────

export { ID_PATTERN, SLUG_SAFE }
