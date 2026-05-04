import { readdirSync, readFileSync } from 'node:fs';
import { join, basename } from 'node:path';

const EPIC_ID_RE = /^EPIC-\d+/;
const ADR_ID_RE = /^ADR-\d+/;

export interface CouplingConfig {
  /** Directory containing proposed ADRs (e.g. cortex/adr/01-proposed) */
  proposedAdrDir: string;
}

/**
 * Extract an Epic ID from a filename like "EPIC-20260504165156064-title.md".
 * Returns null if the filename does not start with an Epic ID pattern.
 */
export function extractEpicIdFromFilename(filename: string): string | null {
  const name = basename(filename);
  const match = name.match(EPIC_ID_RE);
  return match ? match[0] : null;
}

function extractAdrIdFromFilename(filename: string): string | null {
  const name = basename(filename);
  const match = name.match(ADR_ID_RE);
  return match ? match[0] : null;
}

/**
 * Scan proposed ADR directory for ADRs that reference the given Epic ID.
 * A match is a file whose content contains "Epic: <epicId>" anywhere.
 * Returns sorted ADR ID list.
 */
export function findLinkedAdrs(epicId: string, config: CouplingConfig): string[] {
  const linked: string[] = [];

  let entries: string[] = [];
  try {
    entries = readdirSync(config.proposedAdrDir);
  } catch {
    return linked;
  }

  for (const entry of entries) {
    if (!entry.endsWith('.md')) continue;

    const adrId = extractAdrIdFromFilename(entry);
    if (!adrId) continue;

    const content = readFileSync(join(config.proposedAdrDir, entry), 'utf-8');
    if (content.includes(`Epic: ${epicId}`)) {
      linked.push(adrId);
    }
  }

  return linked.sort();
}

/**
 * Build cortex CLI commands to accept a list of ADR IDs.
 */
export function buildAcceptCommands(adrIds: string[]): string[] {
  return adrIds.map((id) => `adr accept ${id}`);
}
