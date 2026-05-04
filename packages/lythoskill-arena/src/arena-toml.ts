import { z } from 'zod'
import type { ArenaManifest } from '@lythos/test-utils/schema'

// ── arena.toml Zod schema (declarative input, k8s-manifest style) ──────────
// Anchored on: ADR-20260502110308316

export const SideEnv = z.object({
  container: z.string().optional(),
  pre_run: z.array(z.string()).default([]),
  working_dir: z.string().optional(),
  env_vars: z.record(z.string()).default({}),
})
export type SideEnv = z.infer<typeof SideEnv>

export const Side = z.object({
  name: z.string(),
  player: z.string(),              // reference to player config (useAgent resolves)
  deck: z.string(),                // path to deck.toml
  control: z.boolean().default(false),
  env: SideEnv.default({}),
})
export type Side = z.infer<typeof Side>

export const ArenaToml = z.object({
  arena: z.object({
    task: z.string(),              // task description or path to TASK-arena.md
    criteria: z.array(z.string()).min(1),
    runs_per_side: z.number().int().positive().default(1),
    max_participants: z.number().int().min(2).max(5).default(5),
    model: z.string().optional(),  // e.g. "claude-sonnet-4-6"
    endpoint: z.string().optional(), // e.g. "api.anthropic.com"
    notes: z.string().optional(),  // freeform reproducibility notes
  }),
  side: z.array(Side).min(2).max(5),
})
export type ArenaToml = z.infer<typeof ArenaToml>

// ── Parser ─────────────────────────────────────────────────────────────────

export function parseArenaToml(content: string): ArenaToml {
  // Simple inline TOML parser for arena.toml (no external dep needed for this subset)
  const parsed = parseToml(content)
  return ArenaToml.parse(parsed)
}

// ── Plan generation (pure function, dry-run visible) ───────────────────────

export interface ExecutionCell {
  side: string                     // side name
  player: string                   // player reference
  deck: string                     // deck path
  run: number                      // 1-indexed run number
  control: boolean
}

export interface ExecutionPlan {
  task: string
  criteria: string[]
  cells: ExecutionCell[]
  total_runs: number
}

export function buildExecutionPlan(toml: ArenaToml): ExecutionPlan {
  const cells: ExecutionCell[] = []
  for (const side of toml.side) {
    for (let run = 1; run <= toml.arena.runs_per_side; run++) {
      cells.push({
        side: side.name,
        player: side.player,
        deck: side.deck,
        run,
        control: side.control,
      })
    }
  }
  return {
    task: toml.arena.task,
    criteria: toml.arena.criteria,
    cells,
    total_runs: cells.length,
  }
}

// ── Minimal TOML parser (handles the arena.toml subset without external dep) ──

function parseToml(text: string): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  let currentTable: Record<string, unknown> = result
  let currentTableKey = ''
  const arrayTables: Map<string, Record<string, unknown>[]> = new Map()

  for (const rawLine of text.split('\n')) {
    const line = rawLine.split('#')[0].trim()
    if (!line) continue

    // [[array]]
    const arrayMatch = line.match(/^\[\[(.+?)\]\]$/)
    if (arrayMatch) {
      const key = arrayMatch[1] // e.g. "side"
      if (!arrayTables.has(key)) arrayTables.set(key, [])
      currentTable = {}
      arrayTables.get(key)!.push(currentTable)
      currentTableKey = key
      continue
    }

    // [section]
    const sectionMatch = line.match(/^\[(.+?)\]$/)
    if (sectionMatch) {
      const key = sectionMatch[1]
      // nested key like "side.env"
      if (key.includes('.')) {
        const [parent, child] = key.split('.')
        const parentArr = arrayTables.get(parent)
        if (parentArr && parentArr.length > 0) {
          currentTable = {}
          parentArr[parentArr.length - 1][child] = currentTable
        }
      } else {
        result[key] = {}
        currentTable = result[key] as Record<string, unknown>
      }
      currentTableKey = ''
      continue
    }

    // key = value
    const eqIdx = line.indexOf('=')
    if (eqIdx !== -1) {
      const key = line.slice(0, eqIdx).trim()
      let value = line.slice(eqIdx + 1).trim()

      // String value
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      } else if (value === 'true') {
        value = 'true'
      } else if (value === 'false') {
        value = 'false'
      }

      // Array value: ["a", "b"]
      if (value.startsWith('[') && value.endsWith(']')) {
        const inner = value.slice(1, -1).trim()
        if (!inner) {
          currentTable[key] = []
        } else {
          const arr = inner.split(',').map(s => {
            const t = s.trim()
            if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
              return t.slice(1, -1)
            }
            return t
          })
          currentTable[key] = arr
        }
      } else if (value === 'true') {
        currentTable[key] = true
      } else if (value === 'false') {
        currentTable[key] = false
      } else if (/^-?\d+(\.\d+)?$/.test(value)) {
        currentTable[key] = Number(value)
      } else {
        currentTable[key] = value
      }
    }
  }

  // Materialize array tables into result
  for (const [key, arr] of arrayTables) {
    result[key] = arr
  }

  return result
}
