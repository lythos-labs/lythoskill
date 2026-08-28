// ── Agent BDD substrate types ──────────────────────────────────────────────

export interface FsMutation {
  action: 'create' | 'modify' | 'delete' | 'create-symlink'
  path: string
  target?: string
}

export interface CheckpointEntry {
  step: string
  tool: string
  args: string[]
  exit_code?: number
  stdout_summary?: string
  fs_mutations?: FsMutation[]
  final_state?: Record<string, unknown>
  timestamp: string
}

export interface AgentRunResult {
  stdout: string
  stderr: string
  code: number
  durationMs: number
  checkpoints: CheckpointEntry[]
}

export interface ToolDefinition {
  name: string
  description: string
  input_schema: Record<string, unknown>
}

export interface AgentAdapter {
  name: string

  /**
   * Optional upstream declaration (ADR-20260828004129233 Option B): which upstream
   * binary(-ies) this adapter drives, the supported version range, and how to probe.
   * Adapters that declare it probe at spawn time and fail closed (loud HATEOAS error)
   * on unknown/out-of-range upstreams. Adapters without it are unprobed (unchanged).
   */
  upstream?: {
    /** Candidate binary names in preference order (e.g. ['kimi-cli', 'kimi']). */
    binaries: string[]
    /** Space-separated comparators, e.g. '>=0.30.0 <2.0.0'. */
    versionRange: string
    /** Args that print the version, e.g. ['--version']. */
    probeArgs: string[]
  }

  spawn(opts: {
    cwd: string
    brief: string
    timeoutMs: number
    idleTimeoutMs?: number
    env?: Record<string, string>
    allowedTools?: string
    disallowedTools?: string
    /** Model tier for cross-player comparison. fast=haiku/gpt-4o-mini, balanced=sonnet/default, deep=opus/gpt-4. */
    modelTier?: 'fast' | 'balanced' | 'deep'
  }): Promise<AgentRunResult>

  /** Optional: structured tool invocation (function-calling). If absent, judge falls back to prompt + parse + Zod. */
  invokeTool?(opts: {
    tool: ToolDefinition
    prompt: string
    cwd: string
    timeoutMs: number
  }): Promise<unknown>
}
