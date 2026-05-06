import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { CheckpointEntry } from './types'

export function readCheckpoints(cwd: string): CheckpointEntry[] {
  const checkpointDir = join(cwd, '_checkpoints')
  if (!existsSync(checkpointDir)) return []

  const files = readdirSync(checkpointDir)
    .filter(f => f.endsWith('.jsonl'))
    .sort()

  const entries: CheckpointEntry[] = []
  for (const file of files) {
    const content = readFileSync(join(checkpointDir, file), 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed) continue
      try {
        entries.push(JSON.parse(trimmed))
      } catch {
        // skip malformed lines
      }
    }
  }
  return entries
}
