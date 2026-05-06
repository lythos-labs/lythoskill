// Re-export from @lythos/agent-adapter (canonical source).
// This file preserved for backward compatibility — prefer importing from '@lythos/agent-adapter' directly.
import {
  claudeCliAdapter,
  buildClaudeCommand,
  buildCleanEnv,
  buildToolPrompt,
  extractJson,
  DEFAULT_ALLOWED_TOOLS,
  DEFAULT_DISALLOWED_TOOLS,
  type SpawnCommand,
} from '@lythos/agent-adapter'

export const claudeAdapter = claudeCliAdapter
export { buildClaudeCommand, buildCleanEnv, buildToolPrompt, extractJson, DEFAULT_ALLOWED_TOOLS, DEFAULT_DISALLOWED_TOOLS }
export type { SpawnCommand }
