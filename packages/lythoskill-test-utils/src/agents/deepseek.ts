import { writeFileSync, unlinkSync, existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import type { AgentAdapter, AgentRunResult, CheckpointEntry } from './types'

// Inline checkpoint reading to avoid circular import: bdd-runner → agents/index.ts → deepseek.ts
function readCheckpoints(cwd: string): CheckpointEntry[] {
  const checkpointDir = join(cwd, '_checkpoints')
  if (!existsSync(checkpointDir)) return []
  try {
    const files = readdirSync(checkpointDir).filter(f => f.endsWith('.jsonl'))
    const entries: CheckpointEntry[] = []
    for (const file of files) {
      const lines = readFileSync(join(checkpointDir, file), 'utf-8').trim().split('\n')
      for (const line of lines) {
        if (!line.trim()) continue
        try { entries.push(JSON.parse(line)) } catch {}
      }
    }
    return entries
  } catch {
    return []
  }
}

// ── DeepSeek TUI adapter ────────────────────────────────────────────────────
//
// DeepSeek TUI is a Rust-native terminal agent with headless one-shot mode.
// Key advantages: no Bun stdin pipe bug (not Node.js), 1M context,
// $0.14/1M input, subagent system (agent_spawn, 8 roles), MIT licensed.
//
// One-shot mode: deepseek --approval-policy auto --model deepseek-v4-flash -p <prompt>
//   --approval-policy auto → auto-approve all tools (v0.8.14+)
//   -p prompt passed as argv (no shell, no stdin pipe)
//   For prompts > 100KB, fall back to temp file
//
// Full analysis: cortex/wiki/03-lessons/2026-05-06-deepseek-tui-headless-programmatic-analysis.md

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
    promptFile = join(
      tmpdir(),
      `deepseek-prompt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.txt`
    )
    const { existsSync } = await import('node:fs')
    const deckPath = join(opts.cwd, 'skill-deck.toml')
    let header = ''
    if (existsSync(deckPath)) {
      header =
        'A skill-deck.toml is configured in your workspace. ' +
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

export const deepseekAdapter: AgentAdapter = {
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
