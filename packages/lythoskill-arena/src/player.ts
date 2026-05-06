import type { Side, ArenaToml } from './arena-toml'

// ── Player reference resolution (pure function) ────────────────────────────
// Maps arena.toml player names → platform identifiers.
// AgentAdapter creation is the IO layer's job (T4), not ours.

export interface ResolvedSide {
  side: Side
  platform: string                  // resolved platform for useAgent()
  playerName: string                // original player reference
}

/** Built-in player registry. Player names that map directly to useAgent platforms. */
const BUILTIN_PLAYERS: Record<string, string> = {
  'claude': 'claude',
  'claude-code': 'claude',
  'kimi': 'kimi',
  'deepseek': 'deepseek',
  'cursor': 'cursor',
  'gemini': 'gemini',
}

/**
 * Resolve a player reference to its platform identifier.
 * - Built-in names (claude, kimi, cursor) map directly
 * - Unknown names are passed through (assumed to be useAgent-compatible)
 * - Future: custom player.toml files will override built-in mappings
 */
export function resolvePlayer(name: string): string {
  const normalized = name.toLowerCase().trim()
  return BUILTIN_PLAYERS[normalized] ?? normalized
}

/**
 * Map arena.toml sides to resolved side configs.
 * Pure function — no IO, no agent creation.
 */
export function resolveSides(toml: ArenaToml): ResolvedSide[] {
  return toml.side.map(side => ({
    side,
    platform: resolvePlayer(side.player),
    playerName: side.player,
  }))
}

// ── Side grouping (for per-side aggregation in T3) ─────────────────────────

export interface SideGroup {
  sideName: string
  player: string
  deck: string
  control: boolean
  runs: number
  platform: string
}

/** Group resolved sides by name for per-side statistical aggregation */
export function groupBySide(toml: ArenaToml): SideGroup[] {
  return resolveSides(toml).map(rs => ({
    sideName: rs.side.name,
    player: rs.playerName,
    deck: rs.side.deck,
    control: rs.side.control,
    runs: toml.arena.runs_per_side,
    platform: rs.platform,
  }))
}

/** Get total run count from arena.toml (sides × runs_per_side) */
export function totalRuns(toml: ArenaToml): number {
  return toml.side.length * toml.arena.runs_per_side
}
