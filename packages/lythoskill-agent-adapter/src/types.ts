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
