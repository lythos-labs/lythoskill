import { readdirSync, readFileSync } from 'node:fs'
import { join, basename } from 'node:path'

const EPIC_ID_RE = /^EPIC-\d+/
const ADR_ID_RE = /^ADR-\d+/

export interface CouplingConfig {
  proposedAdrDir: string
  acceptedAdrDir: string
}

export function extractEpicIdFromFilename(filename: string): string | null {
  const name = basename(filename)
  const match = name.match(EPIC_ID_RE)
  return match ? match[0] : null
}

function extractAdrIdFromFilename(filename: string): string | null {
  const name = basename(filename)
  const match = name.match(ADR_ID_RE)
  return match ? match[0] : null
}

function scanDirForEpic(dir: string, epicId: string): string[] {
  const found: string[] = []
  let entries: string[] = []
  try {
    entries = readdirSync(dir)
  } catch {
    return found
  }
  for (const entry of entries) {
    if (!entry.endsWith('.md')) continue
    const adrId = extractAdrIdFromFilename(entry)
    if (!adrId) continue
    const content = readFileSync(join(dir, entry), 'utf-8')
    if (content.includes(`Epic: ${epicId}`) || content.includes(`关联 Epic: ${epicId}`)) {
      found.push(adrId)
    }
  }
  return found
}

/** Find ADRs linked to an epic across both proposed and accepted directories. */
export function findLinkedAdrs(epicId: string, config: CouplingConfig): string[] {
  const proposed = scanDirForEpic(config.proposedAdrDir, epicId)
  const accepted = scanDirForEpic(config.acceptedAdrDir, epicId)
  return [...new Set([...proposed, ...accepted])].sort()
}

/** Find the epic ID referenced by an ADR. Returns null if no epic link found. */
export function findLinkedEpic(adrPath: string): string | null {
  try {
    const content = readFileSync(adrPath, 'utf-8')
    const m = content.match(/(?:关联 )?Epic:\s*(EPIC-\d+)/)
    return m ? m[1] : null
  } catch {
    return null
  }
}

/**
 * Check whether all ADRs linked to an epic are accepted.
 * Returns { allAccepted, proposedIds, acceptedIds, total }.
 * Proposed IDs that are still pending block the epic from advancing.
 */
export function checkEpicAdrCompletion(epicId: string, config: CouplingConfig): {
  allAccepted: boolean
  proposedIds: string[]
  acceptedIds: string[]
  total: number
} {
  const allIds = findLinkedAdrs(epicId, config)
  const accepted = new Set(scanDirForEpic(config.acceptedAdrDir, epicId))
  const proposed = allIds.filter((id) => !accepted.has(id))

  return {
    allAccepted: proposed.length === 0 && allIds.length > 0,
    proposedIds: proposed,
    acceptedIds: [...accepted].sort(),
    total: allIds.length,
  }
}

export function buildAcceptCommands(adrIds: string[]): string[] {
  return adrIds.map((id) => `adr accept ${id}`)
}
