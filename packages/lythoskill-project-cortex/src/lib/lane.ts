/**
 * Helpers for inspecting active-epic lane occupancy.
 * Single source of truth for "what is in main / emergency right now".
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { WorkflowConfig } from '../types.js';
import { scanFiles } from './fs.js';
import { parseFrontmatter } from './frontmatter.js';

export type Lane = 'main' | 'emergency';

export interface ActiveEpicInfo {
  file: string;
  lane: Lane | null;       // null = no lane field declared
  rawLane: string | null;  // raw value as written in frontmatter
}

export function listActiveEpics(config: WorkflowConfig): ActiveEpicInfo[] {
  const dir = join(config.epicsDir, config.epicSubdirs.active);
  const { files } = scanFiles([dir], 'EPIC');
  const out: ActiveEpicInfo[] = [];
  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    const { data } = parseFrontmatter(content);
    const rawLane = typeof data.lane === 'string' ? data.lane : null;
    let lane: Lane | null = null;
    if (rawLane === 'main' || rawLane === 'emergency') {
      lane = rawLane;
    }
    out.push({ file, lane, rawLane });
  }
  return out;
}

export function countByLane(epics: ActiveEpicInfo[]): { main: number; emergency: number; unknown: number } {
  let main = 0;
  let emergency = 0;
  let unknown = 0;
  for (const e of epics) {
    if (e.lane === 'main') main += 1;
    else if (e.lane === 'emergency') emergency += 1;
    else unknown += 1;
  }
  return { main, emergency, unknown };
}
