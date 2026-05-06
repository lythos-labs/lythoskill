import { writeFileSync, unlinkSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import type { AgentAdapter, AgentRunResult } from '../types'
import { readCheckpoints } from '../checkpoint'
import { registerAgent } from '../registry'

// ── DeepSeek TUI adapter ────────────────────────────────────────────────────
//
// DeepSeek TUI is a Rust-native terminal agent with headless one-shot mode.
// Key advantages: no Bun stdin pipe bug (not Node.js), 1M context,
// $0.14/1M input, subagent system (agent_spawn, 8 roles), MIT licensed.
//
// KNOWN LIMITATION: deepseek -p mode is chat-only (no tool execution).
//   - Text tasks (hello world, copy, Q&A) → works
//   - File/shell/search tasks → fails silently (stdout empty, exit 0)
//   - Fix: migrate to `deepseek serve --http` (REST API with full tool execution)
//     Tracked in TASK-20260506193936311
//   - Workaround: use kimi adapter for tasks requiring tool execution

const DEEPSEEK_BIN = 'deepseek'
const DEFAULT_MODEL = 'deepseek-v4-flash'

async function spawnDeepSeek(opts: {
  brief: string
  cwd: string
  timeoutMs?: number
}): Promise<AgentRunResult> {
  const useFile = opts.brief.length > 100_000
  let promptFile: string | undefined

  if (useFile) {
    promptFile = join(tmpdir(), `deepseek-prompt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.txt`)
    const deckPath = join(opts.cwd, 'skill-deck.toml')
    let header = ''
    if (existsSync(deckPath)) {
      header = 'A skill-deck.toml is configured in your workspace. ' +
        'Skills are linked in .claude/skills/. Read relevant SKILL.md files before starting.\n\n'
    }
    writeFileSync(promptFile, header + opts.brief, 'utf-8')
  }

  const prompt = useFile
    ? `Read the task from ${promptFile} and execute it.`
    : opts.brief

  const start = Date.now()

  const proc = Bun.spawn(
    [DEEPSEEK_BIN, '--approval-policy', 'auto', '--model', DEFAULT_MODEL, '-p', prompt],
    {
      cwd: opts.cwd,
      stdin: 'ignore',
      stdout: 'pipe',
      stderr: 'pipe',
      env: { ...process.env },
    },
  )

  const timeout = setTimeout(() => proc.kill(), opts.timeoutMs ?? 120000)
  await proc.exited
  clearTimeout(timeout)

  if (promptFile) {
    try { unlinkSync(promptFile) } catch {}
  }

  const durationMs = Date.now() - start
  const stdout = (await new Response(proc.stdout).text()).trim()
  const stderr = await new Response(proc.stderr).text()
  const code = proc.exitCode ?? 1

  const checkpoints = readCheckpoints(opts.cwd)

  return { stdout, stderr, code, durationMs, checkpoints }
}

const deepseekAdapter: AgentAdapter = {
  name: 'deepseek',

  async spawn(opts): Promise<AgentRunResult> {
    if (!Bun.which(DEEPSEEK_BIN)) {
      throw new Error(
        'deepseek not found in PATH.\n' +
        'Install: npm install -g deepseek-tui\n' +
        'Or: brew install deepseek-tui\n' +
        'Docs: https://github.com/Hmbown/DeepSeek-TUI'
      )
    }
    return spawnDeepSeek({
      brief: opts.brief,
      cwd: opts.cwd,
      timeoutMs: opts.timeoutMs,
    })
  },

  async invokeTool(_opts): Promise<unknown> {
    throw new Error('invokeTool not implemented for deepseek adapter')
  },
}

registerAgent('deepseek', deepseekAdapter)
export { deepseekAdapter }
