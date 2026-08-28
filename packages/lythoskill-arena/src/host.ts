// Host detection + single-mode resolution for arena host-handoff mode.
// Implements ADR-20260828004129143 (Option B): inside an agent session,
// `arena single` without --player hands off to the host agent instead of
// shelling out to a hardcoded external player.
//
// Pure + injectable: always pass `env` explicitly in tests.

export interface HostDetection {
  detected: boolean
  /** Display name — a known host, or a generic label when the fork is unidentified. */
  host: string
  /** The env var that fired (for diagnostics). Undefined when not detected. */
  marker?: string
}

// Known agent-host env markers, most specific first.
// Ground truth (verified live 2026-08-28): kimi-code exports NO KIMI* variable;
// it is a claude-code fork and only inherits CLAUDE_CODE_SSE_PORT. Claude Code
// proper sets CLAUDECODE=1 (plus CLAUDE_CODE_SSE_PORT). So SSE_PORT alone means
// "an agent host we cannot name" — and the handoff guidance is host-agnostic
// by design, so identification never blocks the handoff.
const KNOWN_MARKERS: ReadonlyArray<{ env: string; host: string }> = [
  { env: 'CLAUDECODE', host: 'Claude Code' },
  { env: 'CLAUDE_CODE_SSE_PORT', host: 'agent host (unidentified)' },
]

export function detectHost(env: NodeJS.ProcessEnv = process.env): HostDetection {
  for (const { env: key, host } of KNOWN_MARKERS) {
    if (env[key]) return { detected: true, host, marker: key }
  }
  return { detected: false, host: 'none' }
}

export type SingleMode =
  | { mode: 'external'; player: string }
  | { mode: 'handoff'; host: HostDetection }
  | { mode: 'no-player' }

/**
 * Default execution-mode resolution for `arena single`:
 *   explicit --player        → external spawn (current behavior, unchanged)
 *   host detected, no player → host-handoff guidance
 *   no host, no player       → loud error (callers point at player-setup.md)
 */
export function resolveSingleMode(
  player: string | undefined,
  env: NodeJS.ProcessEnv = process.env,
): SingleMode {
  if (player) return { mode: 'external', player }
  const host = detectHost(env)
  return host.detected ? { mode: 'handoff', host } : { mode: 'no-player' }
}
