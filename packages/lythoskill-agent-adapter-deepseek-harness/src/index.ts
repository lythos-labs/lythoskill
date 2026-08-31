// ── @lythos/agent-adapter-deepseek-harness — DeepSeek Harness headless adapter ─
//
// Thin subprocess wrap of `dsh --profile headless "<task>"` — no daemon, no
// port, no persistent state (contrast with @lythos/agent-adapter-deepseek-serve).
//
// Usage:
//   import '@lythos/agent-adapter-deepseek-harness'
//   import { useAgent } from '@lythos/agent-adapter'
//   const agent = useAgent('deepseek-harness')

export {
  deepseekHarnessAdapter,
  buildDshCommand,
  parseDshVersion,
  probeDshUpstream,
  DSH_VERSION_RANGE,
} from './deepseek-harness'
export type { ProbeRunner } from './deepseek-harness'
